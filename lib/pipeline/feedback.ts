/**
 * Feedback generator.
 *
 * Takes a completed session + its transcript, runs Claude analysis via a
 * structured tool call, returns a FeedbackPayload ready to persist.
 *
 * Falls back to a mock implementation when ANTHROPIC_API_KEY is missing so
 * the feedback UI can be developed without burning credit.
 */

import Anthropic from "@anthropic-ai/sdk";
import { PERSONAS } from "@/lib/personas";
import { env, shouldMock } from "./env";
import type { PersonaId, InterviewType, SessionMode } from "@/types/supabase";
import type { FeedbackPayload, FeedbackQuote } from "./feedback-types";

// --------------------------------------------------------------------------
// Input
// --------------------------------------------------------------------------

export interface GenerateFeedbackInput {
  sessionId: string;
  personaId: PersonaId;
  interviewType: InterviewType;
  mode: SessionMode;
  targetFirm: string | null;
  targetRole: string | null;
  durationSeconds: number;
  actualDurationSeconds: number | null;
  turns: Array<{
    role: "user" | "assistant";
    content: string;
    startedAtMs: number;
    endedAtMs: number | null;
  }>;
}

// --------------------------------------------------------------------------
// Entry point
// --------------------------------------------------------------------------

export async function generateFeedback(input: GenerateFeedbackInput): Promise<FeedbackPayload> {
  if (shouldMock("claude")) {
    return mockFeedback(input);
  }
  return generateRealFeedback(input);
}

// --------------------------------------------------------------------------
// Real generation via Claude tool-use
// --------------------------------------------------------------------------

const FEEDBACK_TOOL = {
  name: "provide_feedback",
  description:
    "Submit your feedback analysis for the candidate's interview session. Use this tool exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      overall_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Holistic 0-100 score. Not a mechanical average of sub-scores — your overall judgment. Use the full range; average candidates land 55-75.",
      },
      structure_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did they organise answers with clear logic? Did they signpost, follow-through on their own framing, and avoid wandering?",
      },
      specificity_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Did they use concrete examples, names, numbers, and moments — or did they trade in generic claims like 'I'm a strong leader'?",
      },
      delivery_score: {
        type: "integer" as const,
        minimum: 0,
        maximum: 100,
        description:
          "Pacing, directness, filler words, confidence, ability to handle silence. Transcript-only, you can't hear tone — infer from phrasing and content.",
      },
      summary: {
        type: "string" as const,
        description:
          "2-3 sentence prose overview. First sentence states the headline read. Second-third sentence gives the main strength and main gap.",
      },
      strengths: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 3,
        maxItems: 5,
        description:
          "3-5 things the candidate did well. Specific, not generic. Reference moments. Each item is one sentence.",
      },
      improvements: {
        type: "array" as const,
        items: { type: "string" as const },
        minItems: 3,
        maxItems: 5,
        description:
          "3-5 things to work on. Specific and actionable. Avoid generic advice like 'practice more'. Each item is one sentence.",
      },
      feedback_quotes: {
        type: "array" as const,
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object" as const,
          properties: {
            user_quote: {
              type: "string" as const,
              description:
                "The candidate's actual words — verbatim or near-verbatim from the transcript. No quotation marks around it.",
            },
            stronger_version: {
              type: "string" as const,
              description:
                "How the same answer could have landed harder. Keep it realistic and say-able out loud — not a paragraph.",
            },
            reasoning: {
              type: "string" as const,
              description:
                "One sentence on why the stronger version works better. Be specific about what changed and why it matters.",
            },
            timestamp_seconds: {
              type: "number" as const,
              description: "Seconds into the session when the candidate said this.",
            },
          },
          required: ["user_quote", "stronger_version", "reasoning"],
        },
        description:
          "3-5 quote-based coaching moments. Pick the highest-leverage ones: moments where a small change would make a real difference. Not the worst moments — the most-teachable ones.",
      },
    },
    required: [
      "overall_score",
      "structure_score",
      "specificity_score",
      "delivery_score",
      "summary",
      "strengths",
      "improvements",
      "feedback_quotes",
    ],
  },
};

async function generateRealFeedback(input: GenerateFeedbackInput): Promise<FeedbackPayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("anthropic_not_configured");

  const client = new Anthropic({ apiKey });
  const persona = PERSONAS[input.personaId];

  const systemPrompt = buildFeedbackSystemPrompt(persona.firstName, persona.firm);
  const userPrompt = buildFeedbackUserPrompt(input, persona.firstName);

  const response = await client.messages.create({
    model: env.feedbackModel(),
    max_tokens: 4096,
    system: systemPrompt,
    tools: [FEEDBACK_TOOL],
    // Force the model to call our tool (not reply in prose)
    tool_choice: { type: "tool", name: "provide_feedback" },
    messages: [{ role: "user", content: userPrompt }],
  });

  // Find the tool_use block
  const toolUse = response.content.find(
    (b): b is Extract<typeof response.content[number], { type: "tool_use" }> => b.type === "tool_use",
  );
  if (!toolUse || toolUse.name !== "provide_feedback") {
    throw new Error("feedback_tool_call_missing");
  }

  return validatePayload(toolUse.input as unknown as FeedbackPayload);
}

function validatePayload(raw: FeedbackPayload): FeedbackPayload {
  // Belt-and-braces — tool schema should guarantee shape, but guard anyway
  const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const strings = (arr: unknown): string[] =>
    Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  const quotes = (arr: unknown): FeedbackQuote[] =>
    Array.isArray(arr)
      ? arr
          .filter(
            (q): q is Partial<FeedbackQuote> =>
              q !== null && typeof q === "object",
          )
          .map((q) => ({
            user_quote: String(q.user_quote ?? ""),
            stronger_version: String(q.stronger_version ?? ""),
            reasoning: String(q.reasoning ?? ""),
            timestamp_seconds:
              typeof q.timestamp_seconds === "number" ? q.timestamp_seconds : undefined,
          }))
          .filter((q) => q.user_quote && q.stronger_version && q.reasoning)
      : [];

  return {
    overall_score: clamp(raw.overall_score),
    structure_score: clamp(raw.structure_score),
    specificity_score: clamp(raw.specificity_score),
    delivery_score: clamp(raw.delivery_score),
    summary: String(raw.summary ?? "").trim(),
    strengths: strings(raw.strengths).slice(0, 5),
    improvements: strings(raw.improvements).slice(0, 5),
    feedback_quotes: quotes(raw.feedback_quotes).slice(0, 5),
  };
}

// --------------------------------------------------------------------------
// Prompt construction
// --------------------------------------------------------------------------

function buildFeedbackSystemPrompt(interviewerFirstName: string, interviewerFirm: string): string {
  return `You are an interview coach reviewing a practice session between a candidate and ${interviewerFirstName}, a senior professional at ${interviewerFirm}.

Your job: produce honest, specific, actionable feedback the candidate can use tomorrow. Write the way a sharp, trusted friend in the industry would after listening to a recording of the call.

## What matters
1. Structure — did they organise their answers, or did they wander.
2. Specificity — did they use concrete moments and numbers, or trade in generic claims.
3. Delivery — pacing, directness, filler, how they handled hard questions and silence.
4. Substance — did they actually answer the question, or redirect to what they wanted to say.

## Style rules
- Be specific. "Your STAR answer for the disagreement question was strong" beats "good communication."
- Quote the candidate when relevant. Use their actual words, not paraphrases.
- No hedging, no compliment sandwiches, no fake encouragement. If something didn't work, say so and say why.
- No generic advice ("practice more," "be more confident"). Every improvement should be something they could apply in a specific moment.
- Keep your scoring calibrated. A candidate who does everything right scores 85-90. 95+ is rare and reserved for unusually strong answers. 55-75 is the normal range. Below 40 means real concerns.
- Do not flatter. Do not sandbag. Land where the evidence lands.

## Format
Use the provide_feedback tool exactly once. Populate every field. Draw quotes from the transcript you'll see in the user message.`;
}

function buildFeedbackUserPrompt(input: GenerateFeedbackInput, interviewerFirstName: string): string {
  const lines: string[] = [];

  lines.push(`## Session context`);
  lines.push(`Interviewer: ${interviewerFirstName}`);
  lines.push(`Format: ${humanInterviewType(input.interviewType)}`);
  lines.push(`Difficulty: ${input.mode}`);
  if (input.targetFirm) lines.push(`Target firm: ${input.targetFirm}`);
  if (input.targetRole) lines.push(`Target role: ${input.targetRole}`);
  lines.push(`Target duration: ${Math.round(input.durationSeconds / 60)} minutes`);
  if (input.actualDurationSeconds !== null) {
    lines.push(`Actual duration: ${Math.round(input.actualDurationSeconds / 60)} minutes`);
  }
  lines.push("");
  lines.push(`## Transcript`);
  lines.push(`Times are seconds since session start.`);
  lines.push("");

  for (const turn of input.turns) {
    const label = turn.role === "user" ? "CANDIDATE" : interviewerFirstName.toUpperCase();
    const t = Math.round(turn.startedAtMs / 1000);
    lines.push(`[${formatTime(t)}] ${label}: ${turn.content}`);
  }

  lines.push("");
  lines.push(`## Your task`);
  lines.push(
    `Review the transcript and produce feedback via the provide_feedback tool. Be honest and specific. The candidate will read what you write.`,
  );

  return lines.join("\n");
}

function humanInterviewType(t: InterviewType): string {
  const map: Record<InterviewType, string> = {
    behavioral: "Behavioral",
    case: "Case",
    technical: "Technical",
    product_sense: "Product sense",
    superday: "Superday",
    hard_mode: "Hard mode",
  };
  return map[t];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// --------------------------------------------------------------------------
// Mock feedback — deterministic per session for dev without API key
// --------------------------------------------------------------------------

function mockFeedback(input: GenerateFeedbackInput): FeedbackPayload {
  const userTurns = input.turns.filter((t) => t.role === "user");
  const firstUserQuote = userTurns[0]?.content.slice(0, 140) ?? "I was a big part of the team.";
  const persona = PERSONAS[input.personaId];

  // Deterministic pseudo-score from session ID so the same session always
  // shows the same mock scores — helps during UI iteration.
  const seed = hashString(input.sessionId);
  const baseScore = 60 + (seed % 25); // 60-84

  return {
    overall_score: baseScore,
    structure_score: Math.max(40, Math.min(95, baseScore - 5 + (seed % 11))),
    specificity_score: Math.max(40, Math.min(95, baseScore - 10 + ((seed * 3) % 15))),
    delivery_score: Math.max(40, Math.min(95, baseScore + 2 + ((seed * 7) % 9))),
    summary:
      `A solid session overall — you kept pace with ${persona.firstName} and landed your core stories. ` +
      `Your strongest moments were when you anchored on specific numbers and specific people. ` +
      `The clearest thing to work on: tighter opening thirty seconds on each answer so the point lands before the detail.`,
    strengths: [
      "Opened your resume walkthrough with a clear thread — the commercial real estate focus came through in under thirty seconds.",
      "Used concrete numbers when describing your Marcus & Millichap internship, which made the experience feel real and not padded.",
      "Recovered well from the follow-up on disagreement — you named the other person's position before explaining yours, which is harder than it sounds.",
    ],
    improvements: [
      "Your 'why this firm' answer was generic; name one specific thing the firm does that you can't get elsewhere.",
      "You hedged with 'I think' and 'kind of' four times in the first three minutes — eliminate those in a re-run.",
      "When asked a hard question, you filled the silence with filler. Practice taking a deliberate one-second pause before answering the hard ones.",
    ],
    feedback_quotes: [
      {
        user_quote: firstUserQuote,
        stronger_version:
          "I led the sourcing work for one deal — a thirty-unit property in Dallas — and the sponsor closed it in Q3.",
        reasoning:
          "Your original claim was vague about your role. The stronger version names the specific thing you owned and the outcome, which is what recruiters are listening for.",
        timestamp_seconds: userTurns[0]?.startedAtMs ? userTurns[0].startedAtMs / 1000 : 45,
      },
      {
        user_quote:
          "I think I'm pretty good at working with different kinds of people.",
        stronger_version:
          "On my last team, I worked with an analyst who preferred written updates and a VP who wanted live calls — I adapted to both and shipped on time.",
        reasoning:
          "Specific examples always beat self-assessment adjectives. 'Pretty good at' tells the interviewer nothing; the example shows it.",
        timestamp_seconds: userTurns[1]?.startedAtMs ? userTurns[1].startedAtMs / 1000 : 120,
      },
      {
        user_quote: "Yeah, so, um, I guess the main thing was probably...",
        stronger_version: "The main thing was...",
        reasoning:
          "Every word before 'the main thing was' is a filler that softens your point. When you know your answer, lead with it.",
        timestamp_seconds: 280,
      },
    ],
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
