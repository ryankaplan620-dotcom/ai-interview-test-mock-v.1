import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { generateFeedback } from "@/lib/pipeline/feedback";
import { extractAndPersistMemories } from "@/lib/pipeline/memory";
import type { FeedbackPayload } from "@/lib/pipeline/feedback-types";
import type { PersonaId, InterviewType, SessionMode } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Claude analysis typically lands in 15-30 seconds. Memory extraction adds
// ~5-10 seconds on top — still well inside our 60s budget.
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
 *
 * Upgrade 07 (Phase I.1): After feedback is persisted for the first time,
 * fire a side-effect that extracts 0-3 memory notes from the transcript
 * and writes them to user_session_memory for future sessions with the same
 * persona. Memory extraction runs AFTER the response is returned is tempting
 * but would lose the Claude context on Vercel's stateless invocation — so we
 * run it inline. Errors are swallowed so memory issues never block feedback.
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
  // 2. If feedback already exists, return it (no memory re-extraction —
  //    memories are a side-effect of FIRST feedback generation only).
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
  const mappedTurns = turns.map((t) => ({
    role: (t.speaker === "interviewer" ? "assistant" : "user") as "user" | "assistant",
    content: t.text,
    startedAtMs: Math.round(t.started_at_seconds * 1000),
    endedAtMs: t.ended_at_seconds !== null ? Math.round(t.ended_at_seconds * 1000) : null,
  }));

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
      turns: mappedTurns,
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

  let winningFeedback: typeof inserted | null = inserted;

  if (insertErr) {
    // Most likely: unique constraint violation — another concurrent request
    // beat us. Read that row and return it. We do NOT run memory extraction
    // in this branch — only the winner extracts, to avoid duplicate notes.
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

  // --------------------------------------------------------------------
  // 6. Upgrade 07 — extract memories (non-blocking semantics, but inline
  //    because Vercel kills stateless invocations after response).
  //    Any failure here is logged-and-swallowed; feedback is already saved.
  // --------------------------------------------------------------------
  try {
    const memResult = await extractAndPersistMemories({
      sessionId: session.id,
      userId: session.user_id,
      personaId: session.persona,
      interviewType: session.interview_type,
      mode: session.mode,
      targetFirm: session.target_firm,
      targetRole: session.target_role,
      transcript: mappedTurns.map((t) => ({ role: t.role, content: t.content })),
      feedbackSummary: payload.summary,
      feedbackImprovements: payload.improvements,
    });
    if (memResult.extracted > 0) {
      console.log(
        `[feedback.generate] extracted ${memResult.extracted} memory notes for session ${session.id}`,
      );
    } else if (memResult.skipped) {
      console.log(
        `[feedback.generate] memory extraction skipped (${memResult.skipped}) for session ${session.id}`,
      );
    }
  } catch (err) {
    // Defensive — extractAndPersistMemories already swallows its own errors,
    // but belt + braces.
    console.error("[feedback.generate] memory extraction threw:", err);
  }

  return NextResponse.json({ feedback: winningFeedback, cached: false });
}
