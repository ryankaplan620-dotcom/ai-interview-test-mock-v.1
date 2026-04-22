/**
 * Smoke test for Phase I.2 — end-of-interview Q&A.
 *
 * Asserts the pure-function surface of lib/pipeline/qa-feedback.ts and the
 * lib/personas/qa-overlay.ts module. Does NOT exercise the Claude calls,
 * the Supabase writes, or the React component — those are integration
 * concerns checked during live smoke testing.
 *
 * Run with:
 *   npx tsx scripts/smoke-qa.ts
 */

import {
  computeFallbackBoundary,
  countCandidateTurns,
  normalizeQaPayload,
  type QaFeedbackPayload,
} from "../lib/pipeline/qa-feedback";
import { renderQaOverlay, QA_BEHAVIOR_OVERLAY } from "../lib/personas/qa-overlay";

let failed = 0;

function assert(cond: unknown, label: string) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

// Build a synthetic transcript: 1 minute per turn, alternating roles,
// starting at t=0 with the interviewer.
function synthTurns(count: number, secondsPerTurn = 60): Array<{
  role: "user" | "assistant";
  content: string;
  startedAtMs: number;
  endedAtMs: number | null;
}> {
  return Array.from({ length: count }, (_, i) => ({
    role: (i % 2 === 0 ? "assistant" : "user") as "user" | "assistant",
    content: `turn ${i}`,
    startedAtMs: i * secondsPerTurn * 1000,
    endedAtMs: (i + 1) * secondsPerTurn * 1000,
  }));
}

console.log("\n=== Phase I.2 — Q&A feedback smoke test ===\n");

// --------------------------------------------------------------------------
// 1. computeFallbackBoundary — the 15% tail math with clamps
// --------------------------------------------------------------------------
console.log("1. Fallback boundary math");

// 20-minute session → 15% = 180s tail → start around t=1020s
{
  const turns = synthTurns(20); // 20 turns of 60s = 1200s
  const b = computeFallbackBoundary(turns, 1200);
  assert(b.method === "fallback_timestamp", "20-min session uses fallback");
  assert(b.startSeconds !== null && b.startSeconds >= 960, "starts no earlier than 960s");
  assert(b.startSeconds !== null && b.startSeconds <= 1080, "starts no later than 1080s");
  assert(b.startTurnIndex !== null && b.startTurnIndex >= 0, "has a valid turn index");
}

// Clamp: 10-minute session → 15% = 90s, min clamp triggers → tail exactly 90s
{
  const turns = synthTurns(10); // 600s total
  const b = computeFallbackBoundary(turns, 600);
  assert(b.method === "fallback_timestamp", "10-min session uses fallback");
  // tail = max(90, min(300, 600*0.15=90)) = 90
  // target = 600 - 90 = 510s
  assert(
    b.startSeconds !== null && b.startSeconds >= 480 && b.startSeconds <= 540,
    `10-min clamp lands near 510s (got ${b.startSeconds})`,
  );
}

// Clamp: 30-minute session → 15% = 270s → below max, no clamping
{
  const turns = synthTurns(30); // 1800s
  const b = computeFallbackBoundary(turns, 1800);
  // target = 1800 - 270 = 1530s
  assert(
    b.startSeconds !== null && b.startSeconds >= 1500 && b.startSeconds <= 1560,
    `30-min session lands near 1530s (got ${b.startSeconds})`,
  );
}

// Max clamp: 60-minute session → 15% = 540s, capped at 300s → tail = 300s
{
  const turns = synthTurns(60); // 3600s
  const b = computeFallbackBoundary(turns, 3600);
  // target = 3600 - 300 = 3300s
  assert(
    b.startSeconds !== null && b.startSeconds >= 3240 && b.startSeconds <= 3360,
    `60-min session max-clamps to 3300s-ish (got ${b.startSeconds})`,
  );
}

// --------------------------------------------------------------------------
// 2. Step-back-to-interviewer — if target lands on a candidate turn, step back
// --------------------------------------------------------------------------
console.log("\n2. Boundary prefers interviewer turns");
{
  // Turn 17 (index 17, started at t=1020) is odd → user/candidate.
  // Fallback wants t=1020 for a 20-min session. Should step back to turn 16 (assistant).
  const turns = synthTurns(20);
  const b = computeFallbackBoundary(turns, 1200);
  if (b.startTurnIndex !== null) {
    assert(
      turns[b.startTurnIndex].role === "assistant",
      `boundary sits on interviewer turn (idx ${b.startTurnIndex}, role=${turns[b.startTurnIndex].role})`,
    );
  }
}

// --------------------------------------------------------------------------
// 3. countCandidateTurns — counts user turns from the boundary onwards
// --------------------------------------------------------------------------
console.log("\n3. countCandidateTurns");
{
  const turns = synthTurns(10); // alternating, so 5 user turns total
  assert(countCandidateTurns(turns, 0) === 5, "counts all 5 user turns from 0");
  // From idx 5: turn 5 (user), 6 (assistant), 7 (user), 8 (assistant), 9 (user) → 3 user turns
  assert(countCandidateTurns(turns, 5) === 3, "counts 3 user turns from idx 5");
  assert(countCandidateTurns(turns, 10) === 0, "counts 0 turns from past-end");
}

// --------------------------------------------------------------------------
// 4. normalizeQaPayload — clamp scores, trust observed count, truncate arrays
// --------------------------------------------------------------------------
console.log("\n4. normalizeQaPayload");

// Out-of-range scores get clamped
{
  const raw: QaFeedbackPayload = {
    overall_score: 150,
    preparation_score: -10,
    specificity_score: 50,
    engagement_score: 100,
    composure_score: 42,
    summary: "Clean summary.",
    question_breakdown: [],
    improvements: ["Do better."],
    questions_asked_count: 999, // ignored
  };
  const out = normalizeQaPayload(raw, 2);
  assert(out.overall_score === 100, "clamps >100 to 100");
  assert(out.preparation_score === 0, "clamps <0 to 0");
  assert(out.specificity_score === 50, "preserves valid mid");
  assert(out.engagement_score === 100, "preserves valid max");
  assert(out.questions_asked_count === 2, "trusts observed count over LLM count");
}

// Non-numeric scores coerce to 0
{
  const raw = {
    overall_score: "sixty" as unknown as number,
    preparation_score: NaN,
    specificity_score: 70,
    engagement_score: 80,
    composure_score: 60,
    summary: "ok",
    question_breakdown: [],
    improvements: [],
    questions_asked_count: 1,
  } as QaFeedbackPayload;
  const out = normalizeQaPayload(raw, 1);
  assert(out.overall_score === 0, "non-number score coerces to 0");
  assert(out.preparation_score === 0, "NaN score coerces to 0");
}

// Improvements array filters non-strings and truncates to 5
{
  const raw: QaFeedbackPayload = {
    overall_score: 70,
    preparation_score: 70,
    specificity_score: 70,
    engagement_score: 70,
    composure_score: 70,
    summary: "ok",
    question_breakdown: [],
    improvements: [
      "keep one",
      "",
      "keep two",
      "keep three",
      "keep four",
      "keep five",
      "drop six",
    ] as string[],
    questions_asked_count: 0,
  };
  const out = normalizeQaPayload(raw, 0);
  assert(out.improvements.length === 5, "improvements truncate to 5");
  assert(!out.improvements.includes(""), "empty strings filtered out");
  assert(!out.improvements.includes("drop six"), "excess items truncated from tail");
}

// Question breakdown filters malformed entries
{
  const raw: QaFeedbackPayload = {
    overall_score: 70,
    preparation_score: 70,
    specificity_score: 70,
    engagement_score: 70,
    composure_score: 70,
    summary: "ok",
    question_breakdown: [
      {
        question: "valid Q",
        signal: "valid signal",
        stronger_version: "valid stronger",
        reasoning: "valid why",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { question: "missing fields" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      null as any,
    ],
    improvements: [],
    questions_asked_count: 1,
  };
  const out = normalizeQaPayload(raw, 1);
  assert(out.question_breakdown.length === 1, "malformed breakdown entries dropped");
  assert(out.question_breakdown[0].question === "valid Q", "valid entry preserved");
}

// Summary is trimmed and clamped to 2000 chars
{
  const huge = "x".repeat(3000);
  const raw: QaFeedbackPayload = {
    overall_score: 70,
    preparation_score: 70,
    specificity_score: 70,
    engagement_score: 70,
    composure_score: 70,
    summary: huge,
    question_breakdown: [],
    improvements: [],
    questions_asked_count: 0,
  };
  const out = normalizeQaPayload(raw, 0);
  assert(out.summary.length === 2000, "oversized summary is truncated to 2000 chars");
}

// --------------------------------------------------------------------------
// 5. renderQaOverlay — placeholder substitution
// --------------------------------------------------------------------------
console.log("\n5. Q&A overlay rendering");

{
  const overlay = renderQaOverlay("Priya Patel");
  assert(overlay.includes("Priya Patel"), "persona name substituted in");
  assert(!overlay.includes("{{PERSONA_NAME_PLACEHOLDER}}"), "placeholder fully replaced");
  assert(overlay.includes("Candidate Q&A period"), "section header present");
  assert(
    overlay.includes("three minutes"),
    "3-minute timing guidance present",
  );
  assert(
    overlay.includes("in character"),
    "in-character-answer guidance present",
  );
  assert(
    overlay.includes("We'll be in touch."),
    "canonical close line present",
  );
  assert(
    overlay.includes("I'm an AI"),
    "explicit AI-break prohibition present",
  );
}

// Raw overlay template still contains the placeholder (so we know we're
// substituting, not hardcoding)
{
  assert(
    QA_BEHAVIOR_OVERLAY.includes("{{PERSONA_NAME_PLACEHOLDER}}"),
    "raw template contains placeholder",
  );
}

// --------------------------------------------------------------------------
// Final
// --------------------------------------------------------------------------
console.log(`\n=== ${failed === 0 ? "PASS" : "FAIL"} — ${failed} failures ===\n`);
process.exit(failed === 0 ? 0 : 1);
