/**
 * End-of-interview Q&A feedback — Upgrade 08 / Phase I.2.
 *
 * Every real interview ends with "do you have any questions for me?"
 * Candidates routinely squander this moment. Folio scores it as its own
 * feedback dimension, on its own rubric, rendered in its own panel.
 *
 * Flow:
 *   1. After feedback generation in /api/feedback/generate, we call
 *      detectQaBoundary() which uses a small Claude pass to find the
 *      turn where the persona transitioned to candidate Q&A. Falls back
 *      to a timestamp heuristic (15% from the end, min 90s, max 300s)
 *      when no clean transition is detected.
 *   2. generateQaFeedback() feeds only the Q&A-portion of the transcript
 *      to a Claude tool-use pass scored against the Q&A-specific rubric.
 *   3. Both the boundary and the feedback are persisted to their
 *      respective tables. The main feedback pass can optionally receive
 *      the boundary so its own scoring ignores the Q&A portion.
 *
 * Why boundary detection AND a fallback:
 *   Linguistic detection is more accurate when the persona cleanly asks
 *   "what questions do you have for me?" — but personas sometimes drift,
 *   the session may have ended abruptly mid-Q&A, or the candidate may have
 *   jumped in without waiting. The fallback ensures we always produce
 *   something reasonable for sessions longer than ~6 minutes; sessions
 *   shorter than that are marked 'absent' and skip Q&A feedback entirely.
 *
 * Cost: one extra Claude call for boundary detection (~200 output tokens)
 * plus one for the Q&A rubric (~500 output tokens). Combined ~$0.03 per
 * session on top of the existing feedback + memory passes.
 */

import Anthropic from "@anthropic-ai/sdk";
import { PERSONAS } from "@/lib/personas";
import { env, shouldMock } from "./env";
import { createServiceClient } from "@/lib/db/service";
import type { PersonaId } from "@/types/supabase";

// --------------------------------------------------------------------------
// Tunables
// --------------------------------------------------------------------------

/**
 * Minimum session duration for Q&A detection to run at all.
 * Under 6 minutes there's not enough session structure for a meaningful
 * transition to Q&A — the candidate is still in resume-walk territory.
 */
const MIN_SESSION_SECONDS_FOR_QA = 360;

/**
 * Timestamp-fallback: what fraction of the session tail counts as Q&A when
 * we can't detect a linguistic boundary.
 */
const FALLBACK_TAIL_FRACTION = 0.15;

/** Clamp the fallback window so it's reasonable across all session lengths. */
const FALLBACK_MIN_SECONDS = 90;
const FALLBACK_MAX_SECONDS = 300;

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type QaBoundaryMethod = "transition_detected" | "fallback_timestamp" | "absent";

export interface QaBoundary {
  method: QaBoundaryMethod;
  /** 0-based turn index in the full transcript where Q&A begins. Null if absent. */
  startTurnIndex: number | null;
  /** Seconds from session start where Q&A begins. Null if absent. */
  startSeconds: number | null;
  /** Candidate (user) turn count inside the Q&A window. */
  candidateQuestionsCount: number;
}

export interface QaQuestionBreakdown {
  /** The candidate's actual question, verbatim. */
  question: string;
  /** What the question signals — preparation, generic, reactive, etc. */
  signal: string;
  /** A stronger version of the same question. */
  stronger_version: string;
  /** Why the stronger version lands better. */
  reasoning: string;
}

export interface QaFeedbackPayload {
  overall_score: number;
  preparation_score: number;
  specificity_score: number;
  engagement_score: number;
  composure_score: number;
  summary: string;
  question_breakdown: QaQuestionBreakdown[];
  improvements: string[];
  questions_asked_count: number;
}

export interface TranscriptTurn {
  role: "user" | "assistant";
  content: string;
  startedAtMs: number;
  endedAtMs: number | null;
}

// --------------------------------------------------------------------------
// Entry point — called from /api/feedback/generate AFTER the main feedback
// persists. Like memory extraction, errors are logged and swallowed.
// --------------------------------------------------------------------------

export async function generateAndPersistQaFeedback(args: {
  sessionId: string;
  personaId: PersonaId;
  targetFirm: string | null;
  targetRole: string | null;
  durationSeconds: number;
  turns: TranscriptTurn[];
}): Promise<{ status: "ok" | "absent" | "skipped" | "error"; reason?: string }> {
  // Short sessions don't get Q&A analysis — persona never got to the invitation
  if (args.durationSeconds < MIN_SESSION_SECONDS_FOR_QA) {
    await persistBoundary({
      sessionId: args.sessionId,
      boundary: {
        method: "absent",
        startTurnIndex: null,
        startSeconds: null,
        candidateQuestionsCount: 0,
      },
    });
    return { status: "absent", reason: "session_too_short" };
  }

  if (args.turns.length < 6) {
    await persistBoundary({
      sessionId: args.sessionId,
      boundary: {
        method: "absent",
        startTurnIndex: null,
        startSeconds: null,
        candidateQuestionsCount: 0,
      },
    });
    return { status: "absent", reason: "not_enough_turns" };
  }

  // Boundary detection
  let boundary: QaBoundary;
  try {
    boundary = await detectQaBoundary(args.turns, args.durationSeconds);
  } catch (err) {
    console.error("[qa-feedback] boundary detection failed:", err);
    // Fall back silently — detection errors should not prevent Q&A scoring
    // if the fallback window is a reasonable approximation.
    boundary = computeFallbackBoundary(args.turns, args.durationSeconds);
  }

  await persistBoundary({ sessionId: args.sessionId, boundary });

  if (boundary.method === "absent" || boundary.startTurnIndex === null) {
    return { status: "absent", reason: "no_qa_section" };
  }

  // Q&A feedback pass — only looks at turns inside the Q&A window
  const qaTurns = args.turns.slice(boundary.startTurnIndex);

  // If the candidate never actually asked a question (count=0), we still
  // produce feedback — just heavily weighted toward "you didn't ask anything,
  // here's why that matters." The prompt handles this explicitly.
  let payload: QaFeedbackPayload;
  try {
    payload = await generateQaFeedback({
      personaId: args.personaId,
      targetFirm: args.targetFirm,
      targetRole: args.targetRole,
      qaTurns,
      candidateQuestionsCount: boundary.candidateQuestionsCount,
    });
  } catch (err) {
    console.error("[qa-feedback] generation failed:", err);
    return { status: "error", reason: "generation_failed" };
  }

  try {
    await persistQaFeedback({ sessionId: args.sessionId, payload });
  } catch (err) {
    console.error("[qa-feedback] persist failed:", err);
    return { status: "error", reason: "persist_failed" };
  }

  return { status: "ok" };
}

// --------------------------------------------------------------------------
// Boundary detection — Claude pass + timestamp fallback
// --------------------------------------------------------------------------

const BOUNDARY_TOOL = {
  name: "report_boundary",
  description:
    "Report the transcript-turn index where the interviewer transitioned to asking the " +
    "candidate for questions. Return detected=false if no clean transition is present.",
  input_schema: {
    type: "object" as const,
    properties: {
      detected: {
        type: "boolean" as const,
        description:
          "True if you found a clear turn where the interviewer invited candidate questions " +
          '(for example: "what questions do you have for me?", "any questions on your end?", ' +
          '"I want to leave time for your questions"). False if no such turn exists.',
      },
      turn_index: {
        type: "integer" as const,
        minimum: 0,
        description:
          "0-based index into the transcript turns array where the interviewer's invitation " +
          "occurred. Required when detected=true, omit when detected=false.",
      },
    },
    required: ["detected"],
  },
};

export async function detectQaBoundary(
  turns: TranscriptTurn[],
  durationSeconds: number,
): Promise<QaBoundary> {
  if (shouldMock("claude")) {
    return computeFallbackBoundary(turns, durationSeconds);
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const numbered = turns
    .map((t, i) => `[${i}] ${t.role === "user" ? "CANDIDATE" : "INTERVIEWER"}: ${t.content}`)
    .join("\n");

  const res = await anthropic.messages.create({
    model: env.feedbackModel(),
    max_tokens: 200,
    system:
      "You analyze interview transcripts to find the single turn where the interviewer " +
      "transitioned from asking questions to inviting the candidate's questions. Return the " +
      "interviewer's invitation turn, not the candidate's first question.",
    tools: [BOUNDARY_TOOL],
    tool_choice: { type: "tool", name: BOUNDARY_TOOL.name },
    messages: [
      {
        role: "user",
        content: `Transcript turns:\n\n${numbered}\n\nUse report_boundary to report the turn index where the interviewer invited candidate questions, or detected=false if no such turn exists.`,
      },
    ],
  });

  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return computeFallbackBoundary(turns, durationSeconds);
  }

  const raw = toolUse.input as { detected?: boolean; turn_index?: number };

  if (!raw.detected || typeof raw.turn_index !== "number" || raw.turn_index < 0 || raw.turn_index >= turns.length) {
    return computeFallbackBoundary(turns, durationSeconds);
  }

  const startTurnIndex = raw.turn_index;
  const startSeconds = turns[startTurnIndex].startedAtMs / 1000;

  return {
    method: "transition_detected",
    startTurnIndex,
    startSeconds,
    candidateQuestionsCount: countCandidateTurns(turns, startTurnIndex),
  };
}

export function computeFallbackBoundary(
  turns: TranscriptTurn[],
  durationSeconds: number,
): QaBoundary {
  const tailSeconds = Math.max(
    FALLBACK_MIN_SECONDS,
    Math.min(FALLBACK_MAX_SECONDS, Math.floor(durationSeconds * FALLBACK_TAIL_FRACTION)),
  );
  const targetSeconds = Math.max(0, durationSeconds - tailSeconds);

  // Find the first turn at or after targetSeconds
  let startTurnIndex = turns.findIndex((t) => t.startedAtMs / 1000 >= targetSeconds);
  if (startTurnIndex === -1) {
    // Shouldn't happen given the guard at entry, but defensive
    return {
      method: "absent",
      startTurnIndex: null,
      startSeconds: null,
      candidateQuestionsCount: 0,
    };
  }

  // Prefer starting on an interviewer (assistant) turn when possible — that's
  // the invitation. If the target lands on a candidate turn, step back one.
  if (turns[startTurnIndex].role === "user" && startTurnIndex > 0) {
    startTurnIndex -= 1;
  }

  return {
    method: "fallback_timestamp",
    startTurnIndex,
    startSeconds: turns[startTurnIndex].startedAtMs / 1000,
    candidateQuestionsCount: countCandidateTurns(turns, startTurnIndex),
  };
}

export function countCandidateTurns(turns: TranscriptTurn[], fromIndex: number): number {
  let count = 0;
  for (let i = fromIndex; i < turns.length; i++) {
    if (turns[i].role === "user") count++;
  }
  return count;
}

// --------------------------------------------------------------------------
// Q&A feedback generation — Claude tool-use
// --------------------------------------------------------------------------

const QA_FEEDBACK_TOOL = {
  name: "provide_qa_feedback",
  description:
    "Submit the Q&A-section feedback. Use this tool exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      overall_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Holistic 0-100 judgment on the candidate's questions. Not a mechanical average. " +
          "Most candidates land 40-70 on this dimension — generic questions ('what do you love " +
          "about the firm') are common and score low; genuinely prepared, specific, responsive " +
          "questions are rare and score high.",
      },
      preparation_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did the candidate demonstrate research? Questions referencing specific recent firm " +
          "news, named practice areas, deals, strategy shifts, or the interviewer's own " +
          "background score high. Questions that could have been asked of any firm in the " +
          "industry score low.",
      },
      specificity_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Concrete questions vs. vague ones. 'How has the DACH private equity practice " +
          "evolved since the Bain deal?' scores high. 'What's the culture like?' scores low.",
      },
      engagement_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did the candidate reference something the interviewer said EARLIER in the session? " +
          "This is the single strongest Q&A signal — it proves they were listening and " +
          "thinking in real time, not running through a pre-memorised list. High score for any " +
          "question that builds on an earlier moment.",
      },
      composure_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did they ask questions at all, and with confidence? Asking zero questions is the " +
          "weakest outcome and scores near zero. Asking with a trailing voice or visible " +
          "uncertainty scores 30-50. Asking crisply and waiting attentively for the answer " +
          "scores 70+.",
      },
      summary: {
        type: "string" as const,
        description:
          "1-3 sentence prose summary of the Q&A section. If the candidate asked no questions, " +
          "state that directly and name it as the problem to fix.",
        minLength: 10,
        maxLength: 2000,
      },
      question_breakdown: {
        type: "array" as const,
        description:
          "One entry per candidate question actually asked. If the candidate asked zero " +
          "questions, this MUST be an empty array. Do not fabricate entries.",
        maxItems: 5,
        items: {
          type: "object" as const,
          properties: {
            question: {
              type: "string" as const,
              description: "The candidate's question, verbatim from the transcript.",
            },
            signal: {
              type: "string" as const,
              description:
                "What this question signals about the candidate — preparation, " +
                "generic-off-blog, reactive-to-something-said, etc. One sentence.",
            },
            stronger_version: {
              type: "string" as const,
              description:
                "A concretely stronger version of the same question. Reference specific firm " +
                "context if possible, or tighten the vagueness. One sentence.",
            },
            reasoning: {
              type: "string" as const,
              description:
                "Why the stronger version lands better than what was asked. One sentence.",
            },
          },
          required: ["question", "signal", "stronger_version", "reasoning"],
        },
      },
      improvements: {
        type: "array" as const,
        description:
          "2-5 things the candidate should do differently next time. If they asked no " +
          "questions, focus on the preparation side — what to research, how to close, which " +
          "categories of question work best.",
        minItems: 2,
        maxItems: 5,
        items: { type: "string" as const },
      },
      questions_asked_count: {
        type: "integer" as const,
        minimum: 0,
        description:
          "Count of distinct questions the candidate actually asked. Zero is a valid and " +
          "important answer.",
      },
    },
    required: [
      "overall_score",
      "preparation_score",
      "specificity_score",
      "engagement_score",
      "composure_score",
      "summary",
      "question_breakdown",
      "improvements",
      "questions_asked_count",
    ],
  },
};

export async function generateQaFeedback(args: {
  personaId: PersonaId;
  targetFirm: string | null;
  targetRole: string | null;
  qaTurns: TranscriptTurn[];
  candidateQuestionsCount: number;
}): Promise<QaFeedbackPayload> {
  if (shouldMock("claude")) {
    return mockQaFeedback(args);
  }

  const persona = PERSONAS[args.personaId];
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const transcript = args.qaTurns
    .map((t) => `${t.role === "user" ? "CANDIDATE" : persona.firstName.toUpperCase()}: ${t.content}`)
    .join("\n");

  const system = `You are an experienced interview coach analysing the final Q&A section of a practice interview. The interviewer was ${persona.name}, ${persona.title} at ${persona.firm}. You are scoring the candidate's QUESTIONS, not the interviewer's answers.

## What you care about
The final minutes of any real interview are when the candidate gets to turn the table — ask questions that prove they researched, listened, and thought. Weak candidates ask questions they memorised from a blog post. Strong candidates ask questions that could only come from someone who read the firm's recent news AND paid attention to what the interviewer said earlier in the session.

## Calibration
- A candidate who asks two questions, both referencing specific firm context, one building on something the interviewer said earlier: overall 80-90.
- A candidate who asks two generic questions ("what's the culture like", "what's your favourite thing about the firm"): overall 40-55.
- A candidate who asks zero questions: overall 10-25. This is a meaningful failure to close the interview — call it out directly in the summary and treat the improvements as preparation guidance.
- Asking the interviewer personally-targeted questions ("you mentioned you were on the healthcare team — what surprised you about that practice?") scores very high on engagement — it's the clearest proof they were listening.

## Do not invent questions
If the candidate's transcript in the Q&A section contains zero questions, the question_breakdown array MUST be empty and the questions_asked_count MUST be 0. Do not pad. Do not imagine what they might have asked.

## Do not mark down for clarifying questions the interviewer asked
If the interviewer asked a clarifying question in this section, that doesn't count as a candidate question. Only score questions the CANDIDATE asked.`;

  const user = `Target firm: ${args.targetFirm ?? "not specified"}
Target role: ${args.targetRole ?? "not specified"}
Candidate questions observed in this section: ${args.candidateQuestionsCount}

## Q&A section transcript

${transcript}

Use provide_qa_feedback to submit your evaluation.`;

  const res = await anthropic.messages.create({
    model: env.feedbackModel(),
    max_tokens: 2000,
    system,
    tools: [QA_FEEDBACK_TOOL],
    tool_choice: { type: "tool", name: QA_FEEDBACK_TOOL.name },
    messages: [{ role: "user", content: user }],
  });

  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("qa_feedback_tool_not_called");
  }

  const raw = toolUse.input as QaFeedbackPayload;
  return normalizeQaPayload(raw, args.candidateQuestionsCount);
}

export function normalizeQaPayload(raw: QaFeedbackPayload, observedCount: number): QaFeedbackPayload {
  // Defensive coercion + clamping. If the LLM returned a count that disagrees
  // with what we observed, trust our observation.
  return {
    overall_score: clamp(raw.overall_score, 0, 100),
    preparation_score: clamp(raw.preparation_score, 0, 100),
    specificity_score: clamp(raw.specificity_score, 0, 100),
    engagement_score: clamp(raw.engagement_score, 0, 100),
    composure_score: clamp(raw.composure_score, 0, 100),
    summary: (raw.summary ?? "").trim().slice(0, 2000),
    question_breakdown: Array.isArray(raw.question_breakdown)
      ? raw.question_breakdown
          .filter(
            (q) =>
              q &&
              typeof q.question === "string" &&
              typeof q.signal === "string" &&
              typeof q.stronger_version === "string" &&
              typeof q.reasoning === "string",
          )
          .slice(0, 5)
      : [],
    improvements: Array.isArray(raw.improvements)
      ? raw.improvements.filter((s): s is string => typeof s === "string" && s.length > 0).slice(0, 5)
      : [],
    questions_asked_count: observedCount,
  };
}

function clamp(n: unknown, min: number, max: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// --------------------------------------------------------------------------
// Persistence
// --------------------------------------------------------------------------

async function persistBoundary(args: {
  sessionId: string;
  boundary: QaBoundary;
}): Promise<void> {
  const supabase = createServiceClient();
  const row = {
    session_id: args.sessionId,
    method: args.boundary.method,
    start_turn_index: args.boundary.startTurnIndex,
    start_seconds: args.boundary.startSeconds,
    candidate_questions_count: args.boundary.candidateQuestionsCount,
  };
  // upsert — if the feedback route retries, we overwrite cleanly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("session_qa_boundary") as any)
    .upsert(row, { onConflict: "session_id" });
  if (error) {
    console.error("[qa-feedback] boundary upsert failed:", error);
  }
}

async function persistQaFeedback(args: {
  sessionId: string;
  payload: QaFeedbackPayload;
}): Promise<void> {
  const supabase = createServiceClient();
  const row = {
    session_id: args.sessionId,
    overall_score: args.payload.overall_score,
    preparation_score: args.payload.preparation_score,
    specificity_score: args.payload.specificity_score,
    engagement_score: args.payload.engagement_score,
    composure_score: args.payload.composure_score,
    summary: args.payload.summary,
    question_breakdown: args.payload.question_breakdown,
    improvements: args.payload.improvements,
    questions_asked_count: args.payload.questions_asked_count,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("session_qa_feedback") as any)
    .upsert(row, { onConflict: "session_id" });
  if (error) {
    // Unlike boundary, failing here means the user won't see Q&A feedback —
    // but the main session_feedback is already persisted, so the failure is
    // bounded. Log and let the next retry pick it up.
    throw error;
  }
}

// --------------------------------------------------------------------------
// Mock for dev-without-key
// --------------------------------------------------------------------------

function mockQaFeedback(args: {
  qaTurns: TranscriptTurn[];
  candidateQuestionsCount: number;
}): QaFeedbackPayload {
  if (args.candidateQuestionsCount === 0) {
    return {
      overall_score: 15,
      preparation_score: 20,
      specificity_score: 10,
      engagement_score: 10,
      composure_score: 20,
      summary:
        "You didn't ask any questions at the end. This is a meaningful miss — the Q&A section is your clearest chance to signal preparation and genuine interest.",
      question_breakdown: [],
      improvements: [
        "Always come with at least two prepared questions referencing the firm's recent news or strategy.",
        "Even if you have no pre-planned question, react to something the interviewer said earlier in the session.",
        "Avoid closing an interview with silence — it's consistently read as low interest.",
      ],
      questions_asked_count: 0,
    };
  }
  return {
    overall_score: 65,
    preparation_score: 60,
    specificity_score: 55,
    engagement_score: 70,
    composure_score: 75,
    summary:
      "Solid Q&A section. Your questions were clear and showed baseline preparation. One question built on something the interviewer said earlier, which is the strongest Q&A signal.",
    question_breakdown: args.qaTurns
      .filter((t) => t.role === "user")
      .slice(0, 3)
      .map((t) => ({
        question: t.content.slice(0, 200),
        signal: "Prepared baseline question — could be tightened with more specificity.",
        stronger_version:
          "A version of this question that references a named recent firm event or the interviewer's stated background.",
        reasoning:
          "Specificity is the signal. Generic questions fade in an interviewer's memory; specific ones don't.",
      })),
    improvements: [
      "Name one specific recent firm event in at least one question.",
      "Reference something the interviewer said earlier in the session — this is the single strongest Q&A signal.",
    ],
    questions_asked_count: args.candidateQuestionsCount,
  };
}
