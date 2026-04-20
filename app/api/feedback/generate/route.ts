import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { generateFeedback } from "@/lib/pipeline/feedback";
import type { FeedbackPayload } from "@/lib/pipeline/feedback-types";
import type { PersonaId, InterviewType, SessionMode } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Claude analysis typically lands in 15-30 seconds. Next.js default (10s for
// Vercel hobby, 60s for Pro) may cut us off — bump explicitly.
export const maxDuration = 60;

const Input = z.object({
  sessionId: z.string().uuid(),
});

/**
 * Generate (or fetch) feedback for a completed session.
 *
 * Idempotent:
 *   - If feedback already exists for the session, return it (no regen).
 *   - If not, read the transcript from transcript_turns, call Claude,
 *     write the result to session_feedback, return it.
 *
 * Unique constraint on session_feedback.session_id protects against races
 * between concurrent requests — the second one fails its insert and falls
 * back to reading the winner's row.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { sessionId } = parsed.data;
  const supabase = createServerClient();

  // --------------------------------------------------------------------
  // 1. Verify session exists, is owned, and is completed
  // --------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select(
      "id, user_id, persona, interview_type, mode, target_firm, target_role, duration_seconds, actual_duration_seconds, status",
    )
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as
    | {
        id: string;
        user_id: string;
        persona: PersonaId;
        interview_type: InterviewType;
        mode: SessionMode;
        target_firm: string | null;
        target_role: string | null;
        duration_seconds: number;
        actual_duration_seconds: number | null;
        status: string;
      }
    | null;

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (session.status !== "completed") {
    return NextResponse.json(
      { error: "not_completed", status: session.status },
      { status: 409 },
    );
  }

  // --------------------------------------------------------------------
  // 2. If feedback already exists, return it
  // --------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingRaw } = await (supabase.from("session_feedback") as any)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existingRaw) {
    return NextResponse.json({ feedback: existingRaw, cached: true });
  }

  // --------------------------------------------------------------------
  // 3. Load transcript from transcript_turns
  // --------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: turnsRaw, error: turnsErr } = await (supabase.from("transcript_turns") as any)
    .select("speaker, text, started_at_seconds, ended_at_seconds")
    .eq("session_id", sessionId)
    .order("started_at_seconds", { ascending: true });

  if (turnsErr) {
    return NextResponse.json({ error: "transcript_fetch_failed" }, { status: 500 });
  }

  const turns = (turnsRaw as Array<{
    speaker: "user" | "interviewer";
    text: string;
    started_at_seconds: number;
    ended_at_seconds: number | null;
  }> | null) ?? [];

  if (turns.length === 0) {
    return NextResponse.json({ error: "empty_transcript" }, { status: 400 });
  }

  // --------------------------------------------------------------------
  // 4. Generate feedback via Claude (or mock)
  // --------------------------------------------------------------------
  let payload: FeedbackPayload;
  try {
    payload = await generateFeedback({
      sessionId: session.id,
      personaId: session.persona,
      interviewType: session.interview_type,
      mode: session.mode,
      targetFirm: session.target_firm,
      targetRole: session.target_role,
      durationSeconds: session.duration_seconds,
      actualDurationSeconds: session.actual_duration_seconds,
      turns: turns.map((t) => ({
        role: t.speaker === "interviewer" ? "assistant" : "user",
        content: t.text,
        startedAtMs: Math.round(t.started_at_seconds * 1000),
        endedAtMs: t.ended_at_seconds !== null ? Math.round(t.ended_at_seconds * 1000) : null,
      })),
    });
  } catch (err) {
    console.error("[feedback.generate] claude error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "generation_failed" },
      { status: 502 },
    );
  }

  // --------------------------------------------------------------------
  // 5. Persist to session_feedback
  //    Unique constraint on session_id handles race: if someone else wrote
  //    first, our insert fails and we read theirs.
  // --------------------------------------------------------------------
  const insertPayload = {
    session_id: session.id,
    overall_score: payload.overall_score,
    structure_score: payload.structure_score,
    specificity_score: payload.specificity_score,
    delivery_score: payload.delivery_score,
    summary: payload.summary,
    strengths: payload.strengths,
    improvements: payload.improvements,
    feedback_quotes: payload.feedback_quotes,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertErr } = await (supabase.from("session_feedback") as any)
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertErr) {
    // Most likely: unique constraint violation — another concurrent request
    // beat us. Read that row and return it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: winner } = await (supabase.from("session_feedback") as any)
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (winner) {
      return NextResponse.json({ feedback: winner, cached: true });
    }
    return NextResponse.json(
      { error: insertErr.message ?? "insert_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ feedback: inserted, cached: false });
}
