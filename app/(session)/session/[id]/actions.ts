"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/db/server";
import { getUser } from "@/lib/auth/server";

// --------------------------------------------------------------------------
// Supabase casting helper.
// The hand-rolled Database types don't propagate through .insert/.update/.select
// parameter inference under the current @supabase/ssr version. Contained here
// rather than repeated at every call site. Remove when types are generated via
// `supabase gen types typescript`.
// --------------------------------------------------------------------------

type AnyRow = Record<string, unknown>;

/**
 * Mark a session as in-progress. Called when the user clicks "Start call"
 * in the pre-call screen and the orchestrator actually starts streaming.
 *
 * Idempotent: re-calling after started_at is set is a no-op.
 */
export async function markSessionStarted(sessionId: string) {
  const user = await getUser();
  if (!user) return { ok: false as const, error: "unauthorized" };

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = supabase.from("sessions") as any;

  const { data: existing } = await sessions
    .select("id, user_id, started_at, status")
    .eq("id", sessionId)
    .single();

  const row = existing as
    | { id: string; user_id: string; started_at: string | null; status: string }
    | null;

  if (!row || row.user_id !== user.id) {
    return { ok: false as const, error: "not_found" };
  }
  if (row.started_at) {
    return { ok: true as const, alreadyStarted: true };
  }

  const { error } = await sessions
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) return { ok: false as const, error: (error as { message: string }).message };
  return { ok: true as const, alreadyStarted: false };
}

// --------------------------------------------------------------------------
// End session
// --------------------------------------------------------------------------

const EndSessionInput = z.object({
  sessionId: z.string().uuid(),
  finalStatus: z.enum(["completed", "abandoned", "failed"]),
  actualDurationSeconds: z.number().int().nonnegative().max(60 * 60 * 6).optional(),
});

export async function endSession(input: z.infer<typeof EndSessionInput>) {
  const user = await getUser();
  if (!user) return { ok: false as const, error: "unauthorized" };

  const parsed = EndSessionInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "bad_request" };

  const { sessionId, finalStatus, actualDurationSeconds } = parsed.data;

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = supabase.from("sessions") as any;

  const { data: existing } = await sessions
    .select("id, user_id, status")
    .eq("id", sessionId)
    .single();

  const row = existing as { id: string; user_id: string; status: string } | null;
  if (!row || row.user_id !== user.id) {
    return { ok: false as const, error: "not_found" };
  }
  if (["completed", "abandoned", "failed"].includes(row.status)) {
    return { ok: true as const, alreadyEnded: true };
  }

  const updatePayload: AnyRow = {
    status: finalStatus,
    ended_at: new Date().toISOString(),
    actual_duration_seconds: actualDurationSeconds ?? null,
  };

  const { error } = await sessions.update(updatePayload).eq("id", sessionId);

  if (error) return { ok: false as const, error: (error as { message: string }).message };
  return { ok: true as const, alreadyEnded: false };
}

/**
 * Server action wrapper that ends the session and redirects to dashboard.
 */
export async function endSessionAndRedirect(
  sessionId: string,
  finalStatus: "completed" | "abandoned",
  actualDurationSeconds?: number,
) {
  await endSession({ sessionId, finalStatus, actualDurationSeconds });
  redirect("/dashboard");
}
