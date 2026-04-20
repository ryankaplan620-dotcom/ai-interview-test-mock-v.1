/**
 * Drill feedback generator.
 *
 * Takes a transcript from a single drill attempt + drill context, returns
 * structured feedback. Similar architecture to interview feedback but with
 * drill-specific rubrics — story polishing cares about structure, specificity,
 * and tightness; pitch_60s cares about time usage; etc.
 *
 * For MVP, only story_polishing is implemented. Other drill types stubbed.
 *
 * Also computes filler word counts + pace purely mechanically from the
 * transcript, outside of Claude. These are deterministic metrics that don't
 * need LLM judgment.
 */

import Anthropic from "@anthropic-ai/sdk";
import { env, shouldMock } from "@/lib/pipeline/env";
import { getStoryPolishingPrompt } from "./drills";
import type { DrillType } from "@/types/supabase";

// --------------------------------------------------------------------------
// Input / output
// --------------------------------------------------------------------------

export interface DrillAttemptFeedback {
  overall_score: number;
  sub_scores: Record<string, number>;
  summary: string;
  strengths: string[];
  improvements: string[];
  /** Mechanical — detected from transcript, not LLM-generated. */
  filler_words: Record<string, number>;
  filler_count: number;
  words_per_minute: number;
}

export interface GenerateDrillFeedbackInput {
  drillType: DrillType;
  promptId: string;
  promptText: string;
  transcript: string;
  durationSeconds: number;
  attemptNumber: number;
  /** Prior attempts' feedback — Claude uses these to detect progression. */
  priorAttempts: Array<{
    attempt_number: number;
    transcript: string;
    overall_score: number | null;
    summary: string | null;
  }>;
}

// --------------------------------------------------------------------------
// Entry point
// --------------------------------------------------------------------------

export async function generateDrillFeedback(
  input: GenerateDrillFeedbackInput,
): Promise<DrillAttemptFeedback> {
  // Mechanical metrics — always computed from transcript, regardless of mock/real
  const fillerWords = countFillerWords(input.transcript);
  const fillerCount = Object.values(fillerWords).reduce((a, b) => a + b, 0);
  const wpm = calculateWPM(input.transcript, input.durationSeconds);

  let claudePart: Omit<DrillAttemptFeedback, "filler_words" | "filler_count" | "words_per_minute">;

  if (shouldMock("claude")) {
    claudePart = mockClaudeFeedback(input);
  } else {
    claudePart = await realClaudeFeedback(input);
  }

  return {
    ...claudePart,
    filler_words: fillerWords,
    filler_count: fillerCount,
    words_per_minute: wpm,
  };
}

// --------------------------------------------------------------------------
// Mechanical metrics
// --------------------------------------------------------------------------

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "literally",
  "kind of",
  "sort of",
  "actually",
  "so",
  "yeah",
  "right",
  "i mean",
  "i guess",
];

function countFillerWords(transcript: string): Record<string, number> {
  // Lowercase + strip punctuation, but keep word boundaries
  const normalized = transcript.toLowerCase().replace(/[^\w\s]/g, " ");

  const counts: Record<string, number> = {};
  for (const filler of FILLER_WORDS) {
    // Match on word boundaries — don't count "um" inside "umbrella"
    // For multi-word fillers like "you know", use full phrase boundary
    const pattern = new RegExp(`\\b${filler.replace(/\s+/g, "\\s+")}\\b`, "g");
    const matches = normalized.match(pattern);
    if (matches && matches.length > 0) {
      // Key in snake_case for clean JSON
      const key = filler.replace(/\s+/g, "_");
      counts[key] = matches.length;
    }
  }
  return counts;
}

function calculateWPM(transcript: string, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const minutes = durationSeconds / 60;
  return Math.round(words / minutes);
}

// --------------------------------------------------------------------------
// Claude tool-use for story polishing
// --------------------------------------------------------------------------

const STORY_POLISHING_TOOL = {
  name: "provide_drill_feedback",
  description:
    "Submit your feedback analysis for this story polishing drill attempt. Use this tool exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      overall_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Holistic 0-100 score for this attempt. Not an average of sub-scores. In a 5-attempt drill, scores should generally improve across attempts — if this one regressed, reflect that.",
      },
      structure_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did they open with the headline, then provide supporting detail? STAR structure (Situation, Task, Action, Result) is the most common framework. Did they signpost clearly?",
      },
      specificity_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Concrete nouns, numbers, names vs generic claims. 'We improved performance' is weak. 'Cut p99 latency from 400ms to 60ms' is strong.",
      },
      tightness_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did they say the important things and stop? Long-winded answers lose interviewers. A tight 75-second answer usually beats a sprawling 3-minute one.",
      },
      landing_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did the answer end cleanly or trail off? Strong candidates finish with a clear takeaway. Weak ones drift or repeat themselves.",
      },
      summary: {
        type: "string" as const,
        description:
          "2 sentences. First: the headline read on this attempt. Second: the single most useful thing to change for the next attempt. In attempt 5, say whether this version is ready to use in a real interview.",
      },
      strengths: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 2,
        maxItems: 3,
        description:
          "2-3 specific things they did well. Quote words they actually used when possible. Short — one sentence each.",
      },
      improvements: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 2,
        maxItems: 3,
        description:
          "2-3 specific things to fix in the next attempt. Actionable: 'cut the opening so-um-yeah — lead with the headline' beats 'reduce filler'.",
      },
    },
    required: [
      "overall_score",
      "structure_score",
      "specificity_score",
      "tightness_score",
      "landing_score",
      "summary",
      "strengths",
      "improvements",
    ],
  },
};

async function realClaudeFeedback(
  input: GenerateDrillFeedbackInput,
): Promise<Omit<DrillAttemptFeedback, "filler_words" | "filler_count" | "words_per_minute">> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("anthropic_not_configured");

  const client = new Anthropic({ apiKey });

  const systemPrompt = buildDrillSystemPrompt(input);
  const userPrompt = buildDrillUserPrompt(input);

  const response = await client.messages.create({
    model: env.feedbackModel(),
    max_tokens: 2048,
    system: systemPrompt,
    tools: [STORY_POLISHING_TOOL],
    tool_choice: { type: "tool", name: "provide_drill_feedback" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = response.content.find(
    (b): b is Extract<typeof response.content[number], { type: "tool_use" }> => b.type === "tool_use",
  );
  if (!toolUse || toolUse.name !== "provide_drill_feedback") {
    throw new Error("drill_feedback_tool_call_missing");
  }

  const raw = toolUse.input as Record<string, unknown>;
  const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const strings = (arr: unknown): string[] =>
    Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string" && x.length > 0) : [];

  return {
    overall_score: clamp(raw.overall_score),
    sub_scores: {
      structure: clamp(raw.structure_score),
      specificity: clamp(raw.specificity_score),
      tightness: clamp(raw.tightness_score),
      landing: clamp(raw.landing_score),
    },
    summary: String(raw.summary ?? "").trim(),
    strengths: strings(raw.strengths).slice(0, 3),
    improvements: strings(raw.improvements).slice(0, 3),
  };
}

function buildDrillSystemPrompt(input: GenerateDrillFeedbackInput): string {
  if (input.drillType !== "story_polishing") {
    // MVP only ships story_polishing — defensive for when other drill types
    // are added later
    return `You are an interview coach evaluating a practice drill.`;
  }

  return `You are an interview coach running a story-polishing drill with a candidate.

The candidate is rehearsing ONE question five times in a row, with your feedback between each attempt. The goal across the five attempts is convergence: by the fifth rep, their answer should land cleanly and automatically in a real interview.

## What you're evaluating
- **Structure**: did they open with the headline, then give supporting detail? STAR is the most common framework but not the only one.
- **Specificity**: concrete nouns, numbers, and names vs generic claims. "We improved it" is weak; "cut churn from 8% to 2.3%" is strong.
- **Tightness**: did they stop when they were done? Most candidates answer for way too long.
- **Landing**: did the answer end cleanly or trail off?

## Scoring calibration
- 90-100: Real-interview ready. Strong on every dimension.
- 80-89: Solid, with specific fixable gaps.
- 65-79: Developing. The structure is there but something clear is wrong.
- 50-64: Early drafts — content exists but needs significant shape.
- <50: Answers where the core issue is they don't have the story yet, not that they told it poorly.

## Style rules
- Be specific. Quote their actual words when giving feedback.
- No generic advice. "Reduce filler" is weaker than "cut the 'so yeah' at 00:03 — lead with the headline."
- Calibrate against the attempt number. Attempt 1 feedback is about laying foundations. Attempt 5 feedback is about the final polish.
- No flattery, no sandbagging. Land where the evidence lands.

## Format
Use the provide_drill_feedback tool exactly once. Populate every field.`;
}

function buildDrillUserPrompt(input: GenerateDrillFeedbackInput): string {
  const lines: string[] = [];

  lines.push(`## Drill context`);
  lines.push(`Question being practiced: ${input.promptText}`);

  const promptMeta = getStoryPolishingPrompt(input.promptId);
  if (promptMeta) {
    lines.push(``);
    lines.push(`What good answers to this question do well:`);
    lines.push(promptMeta.whatItsLookingFor);
  }

  lines.push(``);
  lines.push(`## This attempt`);
  lines.push(`Attempt number: ${input.attemptNumber} of 5`);
  lines.push(`Duration: ${Math.round(input.durationSeconds)}s`);
  lines.push(``);
  lines.push(`Transcript:`);
  lines.push(`"""`);
  lines.push(input.transcript);
  lines.push(`"""`);

  if (input.priorAttempts.length > 0) {
    lines.push(``);
    lines.push(`## Prior attempts in this drill`);
    for (const prior of input.priorAttempts) {
      lines.push(``);
      lines.push(`**Attempt ${prior.attempt_number}** (score: ${prior.overall_score ?? "—"})`);
      if (prior.summary) lines.push(`Your feedback: ${prior.summary}`);
      lines.push(`Transcript: "${prior.transcript.slice(0, 400)}${prior.transcript.length > 400 ? "..." : ""}"`);
    }
    lines.push(``);
    lines.push(
      `Consider what's improved and what's still stuck. Your feedback should build on the prior coaching, not repeat it.`,
    );
  }

  lines.push(``);
  lines.push(`## Your task`);
  lines.push(
    `Score this attempt and give feedback via the provide_drill_feedback tool. Be specific and useful for the next rep.`,
  );

  return lines.join("\n");
}

// --------------------------------------------------------------------------
// Mock feedback — deterministic per (drillId, attemptNumber)
// --------------------------------------------------------------------------

function mockClaudeFeedback(
  input: GenerateDrillFeedbackInput,
): Omit<DrillAttemptFeedback, "filler_words" | "filler_count" | "words_per_minute"> {
  // Scores climb across attempts — mimics real coaching progression
  const basePerAttempt = [60, 67, 74, 81, 86];
  const overall = basePerAttempt[Math.min(input.attemptNumber - 1, 4)] ?? 70;
  const jitter = (input.attemptNumber * 7) % 8;

  const isFirst = input.attemptNumber === 1;
  const isLast = input.attemptNumber >= 5;

  return {
    overall_score: overall,
    sub_scores: {
      structure: Math.min(95, overall - 2 + jitter),
      specificity: Math.min(95, overall - 4 + ((jitter * 3) % 7)),
      tightness: Math.min(95, overall + 1 + (jitter % 5)),
      landing: Math.min(95, overall - 3 + ((jitter * 5) % 9)),
    },
    summary: isFirst
      ? "A solid first draft — the core story is there, but the opening wanders before you land on what the question is really asking. For the next attempt, lead with the headline."
      : isLast
        ? "This version is tight and specific. The opening lands in the first ten seconds, you hit the key numbers, and the close is clean. This one is ready for a real interview."
        : `Clear improvement over attempt ${input.attemptNumber - 1} — the opening is sharper and you're quoting specifics now. The middle still has room to trim.`,
    strengths: [
      "You opened with a concrete setup (team, timeline, stakes) instead of background context.",
      "Specific number in the outcome — 'cut response time by 40%' — gives the answer weight.",
      ...(isLast
        ? ["You stopped cleanly without the usual 'and yeah, so that's pretty much it.'"]
        : []),
    ].slice(0, 3),
    improvements: [
      isFirst
        ? "Cut the 'so, um, yeah' opening. Lead with the answer: 'The hardest team situation was...'"
        : "Trim the middle — the detail about the meeting schedule is texture, not substance.",
      isFirst
        ? "Name the specific conflict instead of 'there were some tensions.'"
        : "The 'in hindsight' reflection is good but should be one sentence, not three.",
      ...(isLast ? [] : ["Bring the landing up — finish with what you learned, not with what happened."]),
    ].slice(0, 3),
  };
}
