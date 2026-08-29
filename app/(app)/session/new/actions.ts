"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/db/server";
import { getUser, getUserTier } from "@/lib/auth/server";
import { PERSONAS, isValidCombo } from "@/lib/personas";
import { checkSessionStart } from "@/lib/gates/session";
import { createOverageCheckout } from "@/lib/stripe/checkout";
import type { PersonaId, InterviewType } from "@/types/supabase";
import type { InterviewMode } from "@/lib/personas/types";

// --------------------------------------------------------------------------
// Input validation
// --------------------------------------------------------------------------

const StartSessionInput = z.object({
  personaId: z.enum(["sarah", "gemma"]),
  interviewType: z.enum([
    "behavioral",
    "case",
    "technical",
    "product_sense",
    "superday",
    "hard_mode",
  ]),
  mode: z.enum(["easy", "standard", "hard"]).default("standard"),
  targetFirm: z.string().trim().max(120).optional(),
  targetRole: z.string().trim().max(120).optional(),
  isPanel: z.boolean().default(false),
  /**
   * User has explicitly agreed to purchase an overage session.
   * The client sets this after surfacing the overage confirmation UI.
   */
  overageAccepted: z.boolean().default(false),
});

export type StartSessionResult =
  | { ok: true; sessionId: string }
  | {
      ok: false;
      error: string;
      code: string;
      /** For session_quota_exceeded: client should show an overage-consent dialog. */
      overageAvailable?: boolean;
      /** Price in USD for the overage session. */
      overagePrice?: number;
    };

// --------------------------------------------------------------------------
// Server action
// --------------------------------------------------------------------------

/**
 * Validate the picker's selection, check tier gates + cycle quota, insert
 * a session row with status='scheduled', and redirect the user to /session/[id].
 *
 * Two-step overage flow:
 *   - First call without overageAccepted → returns session_quota_exceeded
 *     with overageAvailable=true if user has an active cycle. Client shows
 *     confirmation dialog.
 *   - Second call with overageAccepted=true → charges the overage via
 *     /api/stripe/overage-checkout (deferred to client post-confirm), then
 *     proceeds with session insert and increments overages_used_this_cycle.
 *
 * Throws via redirect on success. Returns a typed error object on failure.
 */
export async function startSession(
  input: z.infer<typeof StartSessionInput>,
): Promise<StartSessionResult> {
  // ---- 1. Auth
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Your session expired. Sign in again.", code: "unauthorized" };
  }

  // ---- 2. Parse & validate shape
  const parsed = StartSessionInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Invalid request.",
      code: "bad_request",
    };
  }
  const req = parsed.data;

  // ---- 3. Combo validity (picker should prevent this, but double-check server-side)
  if (!isValidCombo(req.personaId, req.interviewType)) {
    return {
      ok: false,
      error: "That interviewer doesn't run that format.",
      code: "invalid_combo",
    };
  }

  // ---- 4. Load tier + cycle info
  const tier = await getUserTier();
  const isDev = process.env.NEXT_PUBLIC_APP_ENV === "development" || process.env.FOLIO_DEV_BYPASS_GATES === "true" || process.env.NODE_ENV === "development";
  if (!tier && !isDev) {
    return {
      ok: false,
      error: "You don't have an active plan. Choose one to get started.",
      code: "no_subscription",
    };
  }

  const now = Date.now();
  const cycleActive = tier
    ? !!tier.cycle_end && new Date(tier.cycle_end).getTime() > now
    : isDev;

  // ---- 5. Gate check (combo, feature gates, session quota)
  const effectiveTier = tier?.effective_tier ?? "max";
  const gateResult = checkSessionStart(
    effectiveTier,
    {
      personaId: req.personaId,
      interviewType: req.interviewType,
      mode: req.mode as InterviewMode,
      targetFirm: req.targetFirm,
      targetRole: req.targetRole,
      isPanel: req.isPanel,
      overageAccepted: req.overageAccepted,
    },
    {
      sessionsUsedThisCycle: tier?.sessions_used_this_cycle ?? 0,
      overagesUsedThisCycle: tier?.overages_used_this_cycle ?? 0,
      cycleActive,
      studentVerified: tier?.is_verified_student ?? true,
    },
  );

  if (!gateResult.allowed) {
    return {
      ok: false,
      error: gateResult.message ?? "That session isn't available on your plan.",
      code: gateResult.reason ?? "gated",
      overageAvailable: gateResult.overageAvailable,
      overagePrice: gateResult.overagePrice,
    };
  }

  // ---- 6. Insert the session row
  const supabase = createServerClient();
  const persona = PERSONAS[req.personaId];
  const durationSeconds = persona.defaultDurationMinutes * 60;

  // Insert payload must match the ACTUAL sessions table columns.
  // The table has legacy columns (session_type, persona_id, company, role)
  // alongside newer ones (persona, target_firm, target_role, mode, is_panel).
  // We populate both to ensure compatibility.
  const insertPayload = {
    user_id: user.id,
    persona: req.personaId,
    persona_id: req.personaId,
    interview_type: req.interviewType,
    session_type: req.interviewType,
    mode: req.mode,
    is_panel: req.isPanel,
    target_firm: req.targetFirm || null,
    target_role: req.targetRole || null,
    company: req.targetFirm || null,
    role: req.targetRole || null,
    duration_seconds: durationSeconds,
    status: "scheduled",
    is_overage: req.overageAccepted ?? false,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (supabase.from("sessions") as any)
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[startSession] insert failed:", insertError);
    console.error("[startSession] payload was:", JSON.stringify(insertPayload, null, 2));
    return {
      ok: false,
      error: "Couldn't create the session. Try again.",
      code: "insert_failed",
    };
  }

  const sessionId = (inserted as { id: string }).id;

  // ---- 7. Overage sessions are unpaid until Stripe confirms the charge.
  // Send the user to Checkout now; the payment_intent.succeeded webhook is
  // what actually grants the seat (bumps overages_used_this_cycle) and
  // records the overage_purchases row that /session/[id] requires before
  // it will render the interview for an is_overage session. Nothing here
  // should let the user into the room for free.
  if (req.overageAccepted) {
    if (!user.email) {
      return {
        ok: false,
        error: "Your account is missing an email address. Contact support.",
        code: "missing_email",
      };
    }
    let checkoutUrl: string;
    try {
      checkoutUrl = (
        await createOverageCheckout({
          userId: user.id,
          email: user.email,
          sessionId,
          tier: effectiveTier,
        })
      ).url;
    } catch (err) {
      console.error("[startSession] overage checkout failed:", err);
      return {
        ok: false,
        error: "Couldn't start checkout for the overage session. Try again.",
        code: "checkout_failed",
      };
    }
    // redirect() throws internally — must happen outside the try/catch above
    // or Next.js's redirect signal gets swallowed as a regular error.
    redirect(checkoutUrl);
  }

  // ---- 8. Within-quota session — bump the usage counter and enter directly.
  // In dev mode, skip the counter increment (no subscription row exists)
  if (!isDev) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.rpc as any)("increment_subscription_counter", {
        p_user_id: user.id,
        p_field: "sessions_used_this_cycle",
      });
    } catch (err) {
      console.warn("[startSession] counter increment failed (non-fatal):", err);
    }
  }

  redirect(`/session/${sessionId}`);
}
