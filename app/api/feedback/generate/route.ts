import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/db/server";
import { generateFeedback } from "@/lib/pipeline/feedback";
import { extractAndPersistMemories } from "@/lib/pipeline/memory";
import { generateAndPersistQaFeedback } from "@/lib/pipeline/qa-feedback";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { withRateLimit } from "@/lib/rate-limit/middleware";
import type { FeedbackPayload } from "@/lib/pipeline/feedback-types";
import type { PersonaId, InterviewType, SessionMode } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Input = z.object({
  sessionId: z.string().uuid(),
});

/**
 * Generate (or fetch) feedback for a completed session.
 *
 * Rate limited per-user: 20 per 10 minutes, 100 per 24 hours. Looser than
 * tavus/conversation because this endpoint is re-polled by the UI while
 * Q&A analysis is running, and existing-feedback reads short-circuit
 * without hitting Claude. In practice the rate limit never trips for a
 * legitimate user; it exists to catch buggy polling loops or scripted abuse.
 *
 * Side-effects that run after the FIRST successful feedback persist:
 *   - Memory extraction (Phase I.1) — per-persona first-person notes
 *   - Q&A feedback (Phase I.2) — boundary detection + Q&A rubric scoring
 *
 * Both are non-fatal: any failure is logged, feedback response still returns.
 */
async function handler(req: NextRequest, { user }: { user: { id: string } }) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { sessionId } = parsed.data;
  const supabase = createServerClient();

  // 1. Verify ownership
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

  // 2. Return cached if present
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

  // 5. Persist
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: winner } = await (supabase.from("session_feedback") as any)
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (winner) {
      return NextResponse.json({ feedback: winner, cached: true });
    }
    console.error("[Feedback] Insert error:", insertErr);
    return NextResponse.json(
      { error: "Failed to save feedback. Please try again." },
      { status: 500 },
    );
  }

  // 6. Side-effects (non-fatal)

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

export const POST = withRateLimit(RATE_LIMITS.feedback_generate, handler);
