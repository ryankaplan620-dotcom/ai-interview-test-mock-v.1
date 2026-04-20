"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/db/server";
import { getUser, getUserTier } from "@/lib/auth/server";
import { PERSONAS, isValidCombo } from "@/lib/personas";
import { checkSessionStart } from "@/lib/gates/session";
import type { PersonaId, InterviewType } from "@/types/supabase";
import type { InterviewMode } from "@/lib/personas/types";

// --------------------------------------------------------------------------
// Input validation
// --------------------------------------------------------------------------

const StartSessionInput = z.object({
  personaId: z.enum(["priya", "marcus", "sarah", "david", "jennifer"]),
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
});

export type StartSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string; code: string };

// --------------------------------------------------------------------------
// Server action
// --------------------------------------------------------------------------

/**
 * Validate the picker's selection, check tier gates, insert a session row
 * with status='scheduled', and redirect the user to /session/[id].
 *
 * Throws via redirect on success. Returns a typed error object on failure
 * so the client can surface it without swallowing the exception.
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

  // ---- 4. Tier gates
  const tier = await getUserTier();
  if (!tier) {
    return { ok: false, error: "Couldn't load your plan. Refresh and try again.", code: "no_tier" };
  }

  // Pre-fetch retained session count for the retention gate
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: retainedCount, error: countError } = await (supabase.from("sessions") as any)
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("status", "in", "(failed,abandoned)");

  if (countError) {
    return {
      ok: false,
      error: "Database hiccup. Try that again.",
      code: "db_error",
    };
  }

  const gateResult = checkSessionStart(
    tier.effective_tier,
    {
      personaId: req.personaId,
      interviewType: req.interviewType,
      mode: req.mode as InterviewMode,
      targetFirm: req.targetFirm,
      targetRole: req.targetRole,
      isPanel: req.isPanel,
    },
    {
      activeSessionCount: retainedCount ?? 0,
      studentVerified: tier.is_verified_student,
    },
  );

  if (!gateResult.allowed) {
    return {
      ok: false,
      error: gateResult.message ?? "That session isn't available on your plan.",
      code: gateResult.reason ?? "gated",
    };
  }

  // ---- 5. Insert the session row
  const persona = PERSONAS[req.personaId];
  const durationSeconds = persona.defaultDurationMinutes * 60;

  const insertPayload = {
    user_id: user.id,
    persona: req.personaId as PersonaId,
    interview_type: req.interviewType as InterviewType,
    mode: req.mode,
    is_panel: req.isPanel,
    target_firm: req.targetFirm || null,
    target_role: req.targetRole || null,
    duration_seconds: durationSeconds,
    status: "scheduled" as const,
  };

  // Hand-rolled Database types don't flow through .insert() parameter inference.
  // Same workaround pattern as /dashboard/page.tsx — cast inline. Remove when
  // types are regenerated via `supabase gen types typescript`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (supabase.from("sessions") as any)
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      error: insertError?.message ?? "Couldn't create the session. Try again.",
      code: "insert_failed",
    };
  }

  // ---- 6. Redirect into the room
  // Note: redirect() throws internally; this line does not return normally.
  redirect(`/session/${(inserted as { id: string }).id}`);
}
