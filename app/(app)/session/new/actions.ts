"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/db/server";
import { getUser, getUserTier } from "@/lib/auth/server";
import { PERSONAS, isValidCombo } from "@/lib/personas";
import { checkSessionStart } from "@/lib/gates/session";
import { TIERS } from "@/lib/tiers";
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

  const supabase = createServerClient();

  // ---- 6. Atomically reserve a session slot before inserting.
  // Within-quota: bump sessions_used_this_cycle (guarded by the tier's
  // included allotment — see migration 0014). Overage: bump
  // overages_used_this_cycle, uncapped (overage charge happens separately
  // via /api/stripe/overage-checkout before redirect, not tracked here).
  //
  // This runs BEFORE the insert, and the guard is enforced inside the same
  // UPDATE statement, so two concurrent requests (double-click, two tabs)
  // can't both pass the quota check above and both consume the same last
  // slot — the second one's UPDATE blocks on the row lock, then sees the
  // updated count and no-ops instead of overshooting the quota.
  const counterField = req.overageAccepted
    ? "overages_used_this_cycle"
    : "sessions_used_this_cycle";
  const counterLimit = req.overageAccepted
    ? null
    : TIERS[effectiveTier].allotments.interviewSessions;

  // In dev mode, skip the counter reservation (no subscription row exists)
  if (!isDev) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: reserved, error: rpcError } = await (supabase.rpc as any)(
        "increment_subscription_counter",
        { p_user_id: user.id, p_field: counterField, p_limit: counterLimit },
      );
      if (rpcError) {
        console.warn("[startSession] counter reservation failed (non-fatal):", rpcError);
      } else if (reserved === false) {
        return {
          ok: false,
          error: "You've used all your included sessions this cycle. Refresh to see options.",
          code: "session_quota_exceeded",
        };
      }
    } catch (err) {
      console.warn("[startSession] counter reservation failed (non-fatal):", err);
    }
  }

  // ---- 7. Insert the session row
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

  // ---- 8. Redirect into the room
  redirect(`/session/${(inserted as { id: string }).id}`);
}
