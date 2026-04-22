import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { generateFeedback } from "@/lib/pipeline/feedback";
import { extractAndPersistMemories } from "@/lib/pipeline/memory";
import { generateAndPersistQaFeedback } from "@/lib/pipeline/qa-feedback";
import type { FeedbackPayload } from "@/lib/pipeline/feedback-types";
import type { PersonaId, InterviewType, SessionMode } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Main feedback: 15-30s. Memory extraction: 5-10s. Q&A boundary + feedback: 10-20s.
// All three run sequentially after the main feedback persists. Worst case ~60s,
// which matches the Next route budget.
export const maxDuration = 60;

const Input = z.object({
  sessionId: z.string().uuid(),
});

/**
 * Generate (or fetch) feedback for a completed session.
 *
 * Phases running here:
 *   1. Main feedback pass (Phase D) — rubric scoring, quotes, strengths, improvements.
 *   2. Memory extraction (Phase I.1 / Upgrade 07) — per-persona first-person notes
 *      for future sessions. Non-fatal on error.
 *   3. Q&A feedback (Phase I.2 / Upgrade 08) — boundary detection + separate rubric
 *      for the end-of-interview questions period. Non-fatal on error.
 *
 * Memory + Q&A only run on the FIRST successful feedback persistence (the winner
 * of the unique-constraint race). Re-requests with existing feedback return
 * cached without re-extracting.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { sessionId } = parsed.data;
  const supabase = createServerClient();

  // 1. Verify session exists, is owned, is completed
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

  // 2. Return cached if already present — no re-extraction of memory/Q&A
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingRaw } = await (supabase.from("session_feedback") as any)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existingRaw) {
    return NextResponse.json({ feedback: existingRaw, cached: true });
  }

  // 3. Load transcript
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

  const mappedTurns = turns.map((t) => ({
    role: (t.speaker === "interviewer" ? "assistant" : "user") as "user" | "assistant",
    content: t.text,
    startedAtMs: Math.round(t.started_at_seconds * 1000),
    endedAtMs: t.ended_at_seconds !== null ? Math.round(t.ended_at_seconds * 1000) : null,
  }));

  // 4. Main feedback pass
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

  // 5. Persist — unique constraint handles races
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
    // Race — read the winner's row. No side-effects here, only the winner
    // runs memory + Q&A extraction.
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

  // 6. Side-effects. Both are non-fatal: we've already persisted the main
  //    feedback, and we'd rather return it and log any extraction failures
  //    than fail the whole request.

  // 6a. Memory extraction (Phase I.1)
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
    console.error("[feedback.generate] memory extraction threw:", err);
  }

  // 6b. Q&A feedback (Phase I.2)
  try {
    const qaResult = await generateAndPersistQaFeedback({
      sessionId: session.id,
      personaId: session.persona,
      targetFirm: session.target_firm,
      targetRole: session.target_role,
      durationSeconds: session.actual_duration_seconds ?? session.duration_seconds,
      turns: mappedTurns,
    });
    console.log(
      `[feedback.generate] qa feedback: ${qaResult.status}${qaResult.reason ? ` (${qaResult.reason})` : ""} for session ${session.id}`,
    );
  } catch (err) {
    console.error("[feedback.generate] qa feedback threw:", err);
  }

  return NextResponse.json({ feedback: inserted, cached: false });
}
