/**
 * Drill feedback generator.
 *
 * Each drill type ships with its own rubric — pitch_60s scores hook, arc,
 * time discipline, and landing; pushback_drill scores composure, concession,
 * specifics, and commit. The DB shape is shared (overall_score + sub_scores +
 * summary + strengths + improvements) so the existing UI keeps working.
 *
 * Mechanical metrics (filler words, WPM) are computed deterministically from
 * the transcript, outside of Claude.
 *
 * Note: a global scoring redesign (verdict / moments / leveling, no 0-100) is
 * planned. Until that lands, drill scores remain 0-100 — but the sub-score
 * dimensions are drill-specific, not generic.
 */

import Anthropic from "@anthropic-ai/sdk";
import { env, shouldMock } from "@/lib/pipeline/env";
import { getPitch60sPrompt, getPushbackPrompt } from "./drills";
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
  const normalized = transcript.toLowerCase().replace(/[^\w\s]/g, " ");

  const counts: Record<string, number> = {};
  for (const filler of FILLER_WORDS) {
    const pattern = new RegExp(`\\b${filler.replace(/\s+/g, "\\s+")}\\b`, "g");
    const matches = normalized.match(pattern);
    if (matches && matches.length > 0) {
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
// Per-drill tool definitions
// --------------------------------------------------------------------------

const PITCH_60S_TOOL = {
  name: "provide_drill_feedback",
  description:
    "Submit your feedback analysis for this 60-second pitch attempt. Use this tool exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      overall_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Holistic 0-100 score for the pitch. Calibrate against what a strong candidate would deliver: a clean hook, a coherent arc, confident landing, all inside 60 seconds.",
      },
      hook_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did the first sentence earn the next 50? A strong hook gives the listener an identity claim or specific signal in under 10 seconds. Weak hooks open with throat-clearing ('so, um, basically I'm Ryan and...').",
      },
      arc_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Is there a coherent through-line across the minute? Three beats minimum: where they are, what brought them here, why this matters now. Or another structure — but it has to be deliberate, not a chronological list.",
      },
      time_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "How well did they use the 60 seconds? Penalize both ends — under 35s wastes the airtime, over 75s lost discipline. Sweet spot: 50-65s, with the landing intentional rather than panicked.",
      },
      landing_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did the pitch end cleanly with a clear takeaway, or did it trail off? Strong candidates close with a sentence the interviewer remembers. Weak ones say 'yeah, so that's me' or run out of time mid-thought.",
      },
      summary: {
        type: "string" as const,
        description:
          "Two sentences. First: the headline read on this pitch. Second: the single most useful change for the next take. Quote the candidate's words where possible.",
      },
      strengths: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 2,
        maxItems: 3,
        description:
          "2-3 specific things they did well. Quote their actual words. One sentence each.",
      },
      improvements: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 2,
        maxItems: 3,
        description:
          "2-3 specific, actionable fixes. 'Cut the so-um opening — lead with the strongest identity claim' beats 'reduce filler.'",
      },
    },
    required: [
      "overall_score",
      "hook_score",
      "arc_score",
      "time_score",
      "landing_score",
      "summary",
      "strengths",
      "improvements",
    ],
  },
};

const PUSHBACK_TOOL = {
  name: "provide_drill_feedback",
  description:
    "Submit your feedback analysis for this pushback drill attempt. Use this tool exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      overall_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Holistic 0-100 score across the full exchange — the initial answer AND the recovery. Pushback drills are won or lost in the recovery, so weight it heavily.",
      },
      composure_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did they hold steady under the challenge or get rattled? Look for pace breakdown, voice tightening, defensive language ('well actually', 'no but'). Strong candidates pause, then answer; weak ones rush.",
      },
      concession_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did they engage with the actual critique or deflect from it? Strong candidates acknowledge what the interviewer noticed before defending or revising. Weak ones repeat the original answer louder.",
      },
      specifics_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did the recovery contain new, concrete content — names, numbers, decisions — or just rephrasing? The interviewer is asking for substance. Bringing forward specifics they hadn't yet shared is the strongest move.",
      },
      commit_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did they land on a clear updated position or hedge across both? Pushback drills test whether you can update under pressure without folding entirely. End on commitment — adjusted or held — not on 'I see your point.'",
      },
      summary: {
        type: "string" as const,
        description:
          "Two sentences. First: what their pushback recovery looked like. Second: the single thing that would have moved this from 'survived' to 'gained ground.'",
      },
      strengths: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 2,
        maxItems: 3,
        description: "2-3 specific moves that landed. Quote their actual words. One sentence each.",
      },
      improvements: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 2,
        maxItems: 3,
        description:
          "2-3 specific, actionable fixes. Point to what the recovery is missing, not generic advice.",
      },
    },
    required: [
      "overall_score",
      "composure_score",
      "concession_score",
      "specifics_score",
      "commit_score",
      "summary",
      "strengths",
      "improvements",
    ],
  },
};

function toolFor(drillType: DrillType) {
  if (drillType === "pitch_60s") return PITCH_60S_TOOL;
  if (drillType === "pushback_drill") return PUSHBACK_TOOL;
  return null;
}

function subScoreKeys(drillType: DrillType): string[] {
  if (drillType === "pitch_60s") return ["hook", "arc", "time", "landing"];
  if (drillType === "pushback_drill") return ["composure", "concession", "specifics", "commit"];
  return [];
}

// --------------------------------------------------------------------------
// Real Claude path
// --------------------------------------------------------------------------

async function realClaudeFeedback(
  input: GenerateDrillFeedbackInput,
): Promise<Omit<DrillAttemptFeedback, "filler_words" | "filler_count" | "words_per_minute">> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("anthropic_not_configured");

  const tool = toolFor(input.drillType);
  if (!tool) throw new Error("drill_type_not_supported");

  const client = new Anthropic({ apiKey });

  const systemPrompt = buildDrillSystemPrompt(input);
  const userPrompt = buildDrillUserPrompt(input);

  const response = await client.messages.create({
    model: env.feedbackModel(),
    max_tokens: 2048,
    system: systemPrompt,
    tools: [tool],
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

  const sub: Record<string, number> = {};
  for (const key of subScoreKeys(input.drillType)) {
    sub[key] = clamp(raw[`${key}_score`]);
  }

  return {
    overall_score: clamp(raw.overall_score),
    sub_scores: sub,
    summary: String(raw.summary ?? "").trim(),
    strengths: strings(raw.strengths).slice(0, 3),
    improvements: strings(raw.improvements).slice(0, 3),
  };
}

// --------------------------------------------------------------------------
// System + user prompts
// --------------------------------------------------------------------------

function buildDrillSystemPrompt(input: GenerateDrillFeedbackInput): string {
  if (input.drillType === "pitch_60s") {
    return `You are an interview coach evaluating a 60-second pitch.

The candidate had one shot to deliver a tight, memorable pitch in under a minute. You're scoring how well they used the constraint — not whether their content is impressive in the abstract, but whether the 60-second version of it would actually land in a real interview.

## What you're evaluating
- **Hook**: Does the first sentence earn the next 50 seconds? Strong hooks make an identity claim or drop a specific signal fast. Weak ones open with filler ("so, um, basically").
- **Arc**: Is there a coherent through-line? Three beats minimum (where they are, what brought them here, why this matters now) — or another deliberate structure. NOT a chronological list of jobs.
- **Time discipline**: Did they use the minute well? Penalize both ends — under 35s wastes airtime, over 75s lost discipline. Sweet spot: 50-65s with an intentional close.
- **Landing**: Did it end cleanly with a memorable takeaway, or trail off?

## Scoring calibration
- 90-100: Interview-ready. Tight hook, clear arc, lands inside the minute with a memorable close.
- 80-89: Solid pitch with a specific fixable gap.
- 65-79: Developing. The content is there but the compression isn't working yet.
- 50-64: Early. Wandering, no clear hook, or over the time budget.
- <50: The pitch isn't built yet — content scattered, no narrative shape.

## Style rules
- Be specific. Quote the candidate's actual words.
- Avoid generic advice. "Cut the 'so yeah I'm Ryan' opener — lead with what you do" beats "improve your hook."
- No flattery, no sandbagging.

## Format
Use the provide_drill_feedback tool exactly once. Populate every field.`;
  }

  if (input.drillType === "pushback_drill") {
    return `You are an interview coach evaluating a pushback drill.

The candidate practiced a two-stage exchange in one recording: they answered an opening question, then received a pushback and delivered a recovery. You are scoring the full exchange, but the recovery carries most of the weight — pushback drills exist to train what happens AFTER the first answer.

## What you're evaluating
- **Composure**: Did they hold steady under the challenge? Look for pace breakdown, voice tightening, or defensive language ('well actually', 'no but'). Strong candidates pause briefly, then answer.
- **Concession**: Did they engage with the actual critique or deflect from it? Strong candidates explicitly acknowledge what the interviewer noticed before defending or revising. Weak ones repeat the original answer at higher volume.
- **Specifics**: Did the recovery introduce new, concrete content — names, numbers, decisions — or just rephrasing? Bringing forward unshared specifics is the strongest move.
- **Commit**: Did they land on a clear updated position, or hedge across both? End on commitment — adjusted or held — not on 'I see your point.'

## Scoring calibration
- 90-100: Composed, conceded the critique, brought new specifics, committed. Gained ground from the pushback.
- 80-89: Solid recovery with a specific gap (often: didn't fully concede, or didn't bring new specifics).
- 65-79: Survived without folding, but the recovery sounds like the original answer at higher volume.
- 50-64: Defensive or evasive. Repeated original points, didn't engage the critique.
- <50: Folded or got rattled. The pushback won.

## Style rules
- Be specific. Quote the candidate's actual words.
- Distinguish what they did in the initial answer vs. the recovery — they're scored together but read separately.
- Avoid generic advice. "Concede the 'team did most of it' point at the start of the recovery, then name your specific calls" beats "be less defensive."
- No flattery, no sandbagging.

## Format
Use the provide_drill_feedback tool exactly once. Populate every field.`;
  }

  return "You are an interview coach evaluating a practice drill.";
}

function buildDrillUserPrompt(input: GenerateDrillFeedbackInput): string {
  const lines: string[] = [];

  lines.push(`## Drill context`);

  if (input.drillType === "pitch_60s") {
    lines.push(`Drill: 60-second pitch`);
    lines.push(`Prompt: ${input.promptText}`);
    const meta = getPitch60sPrompt(input.promptId);
    if (meta) {
      lines.push(``);
      lines.push(`What strong answers do well:`);
      lines.push(meta.whatItsLookingFor);
    }
  } else if (input.drillType === "pushback_drill") {
    lines.push(`Drill: pushback`);
    const meta = getPushbackPrompt(input.promptId);
    lines.push(`Initial question: ${input.promptText}`);
    if (meta) {
      lines.push(`Pushback line delivered after the candidate's answer: "${meta.pushback}"`);
      lines.push(``);
      lines.push(`What strong recoveries do:`);
      lines.push(meta.whatItsLookingFor);
    }
  }

  lines.push(``);
  lines.push(`## This attempt`);
  lines.push(`Duration: ${Math.round(input.durationSeconds)}s`);
  lines.push(``);
  lines.push(`Transcript:`);
  lines.push(`"""`);
  lines.push(input.transcript);
  lines.push(`"""`);

  lines.push(``);
  lines.push(`## Your task`);
  lines.push(`Score this attempt and give feedback via the provide_drill_feedback tool. Be specific and useful.`);

  return lines.join("\n");
}

// --------------------------------------------------------------------------
// Mock feedback
// --------------------------------------------------------------------------

function mockClaudeFeedback(
  input: GenerateDrillFeedbackInput,
): Omit<DrillAttemptFeedback, "filler_words" | "filler_count" | "words_per_minute"> {
  if (input.drillType === "pitch_60s") {
    return {
      overall_score: 76,
      sub_scores: { hook: 70, arc: 78, time: 82, landing: 72 },
      summary:
        "The arc holds together and you land roughly on time, but the opening eats the first 8 seconds before the listener knows who you are. Lead with the identity claim and the rest tightens automatically.",
      strengths: [
        "Specific number in the middle beat — 'cut churn from 8% to 2.3%' — gives the pitch weight.",
        "The transition from current role to why-this-role is clean — listener tracks the move.",
      ],
      improvements: [
        "Cut the 'so, basically' opener. Open with what you do: 'I run growth at a Series B fintech.'",
        "The close trails off into a half-sentence. End on a single concrete takeaway, not 'and yeah, that's pretty much me.'",
      ],
    };
  }

  if (input.drillType === "pushback_drill") {
    return {
      overall_score: 68,
      sub_scores: { composure: 75, concession: 60, specifics: 65, commit: 72 },
      summary:
        "You held composure when the pushback came, but the recovery sounded a lot like the initial answer at higher volume. Conceding the critique first — even briefly — would let the new specifics land.",
      strengths: [
        "You paused before responding to the pushback instead of rushing — exactly the right move.",
        "The commit at the end is clear: 'I'd still make that call, but I'd add a checkpoint at month two.' Holds ground without rigidity.",
      ],
      improvements: [
        "Open the recovery with the concession: 'You're right that the original framing didn't make this clear...' Then pivot to new content.",
        "Bring forward a specific you haven't said yet — a name, a number, a decision. Repeating the same points louder isn't a recovery.",
      ],
    };
  }

  return {
    overall_score: 70,
    sub_scores: {},
    summary: "Drill type not supported by mock feedback.",
    strengths: [],
    improvements: [],
  };
}
