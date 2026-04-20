/**
 * Mock Claude — deterministic responses per persona and turn number.
 *
 * Used when ANTHROPIC_API_KEY is missing, so the full pipeline is testable
 * without burning credit. Also used as the fallback when FOLIO_FORCE_MOCK_PIPELINE
 * is set.
 *
 * Responses are short and in-character. Turn 0 is always the opening move;
 * subsequent turns rotate through a small bank per persona.
 */

import type { PersonaId } from "@/types/supabase";
import type { InterviewType } from "@/types/supabase";
import type { ConversationContext } from "./types";

interface MockResponseInput {
  ctx: ConversationContext;
  /** Zero-indexed turn number. 0 = opening. */
  turnIndex: number;
  /** The last user utterance (empty string for opening). */
  lastUserTurn: string;
}

const OPENINGS: Record<PersonaId, (firstName: string) => string> = {
  luke: (n) =>
    `Hi${n ? `, ${n}` : ""}. I'm Luke. Thanks for making time. Before we get started, walk me through your resume in about two minutes.`,
  marcus: () =>
    `Hi, I'm Marcus. Walk me through your story. Ninety seconds.`,
  sarah: (n) =>
    `Hey${n ? `, ${n}` : ""}, I'm Sarah. Great to meet you. Before we get into the problem, tell me a little about yourself and what you've been working on lately.`,
  david: () =>
    `David Reed. Good to meet you. Let's jump in. Why PE?`,
  jennifer: (n) =>
    `Hey${n ? `, ${n}` : ""}, I'm Jen — thanks for making time today. Before we jump into a case, tell me about a product you've used recently that you think is poorly designed, and what you'd change about it.`,
};

// Per-persona, per-turn response bank. Mocks rotate through these after the opening.
const FOLLOWUPS: Record<PersonaId, string[]> = {
  luke: [
    "Got it. You mentioned that project — why that one, and not something else?",
    "Can you give me a specific example of that?",
    "How did you measure whether it worked?",
    "Interesting. Tell me about a time you disagreed with a teammate. How did you handle it?",
    "What would you do differently if you could replay that?",
    "Okay. I want to pause you there — what's the one thing you'd point to?",
    "Last question: what's something you've changed your mind about in the last year?",
  ],
  marcus: [
    "Got it. Next: why banking. Why Goldman.",
    "Who have you talked to here? What did they tell you that stuck?",
    "How do the three financial statements link?",
    "If depreciation increases by ten, what happens to free cash flow at a 25% tax rate?",
    "Bottom line it. What's your weakness on the technical side?",
    "Tell me about a time you worked under a tight deadline.",
    "Alright. Two questions from you. Make them count.",
  ],
  sarah: [
    "Cool. Before I give you the problem — any technical area you've been excited about lately?",
    "Alright. I'll give you a problem. Given an array of integers and a target, return the indices of the two numbers that add up to the target. Before you code anything, walk me through how you're thinking about it.",
    "What's the runtime of that approach? Can we do better?",
    "Nice. What if the input is empty? What about duplicates?",
    "Let's trace through on a small example. Walk me through your logic.",
    "How would you test this? What cases would you write?",
    "Last five minutes are yours — what do you want to ask me about the team?",
  ],
  david: [
    "Alright. Walk me through a deal you worked on as an analyst.",
    "How did the sponsor think about the purchase price? Was it reasonable?",
    "What was the value creation thesis? What would kill it?",
    "Pitch me a deal. A company you've been following that you'd take private. Give me the thesis in under two minutes.",
    "What's the bear case? What do you have to believe for this to work?",
    "Walk me through a conceptual LBO. Ten times EBITDA, fifty percent equity, five-year hold, eight percent EBITDA growth. Rough IRR?",
    "One question from you. Then we're done.",
  ],
  jennifer: [
    "Hm, interesting. Who's the user you're most thinking about when you say that?",
    "Okay, let me give you a case. How would you improve Google Maps for long-haul truck drivers? Take a minute to structure before you dive in.",
    "Good. Who specifically — what's actually different about their experience?",
    "What metric tells you this is working? And what's the risk in using that metric alone?",
    "Nice. What's the downside of this feature for the broader user base?",
    "One more — zoom out. If you had one month to move one number at a company like this, what number and how?",
    "Last few minutes — what do you want to ask me?",
  ],
};

const WRAPUP: Record<PersonaId, string> = {
  luke: "Thanks for taking the time. You'll hear from recruiting in the next few days.",
  marcus: "Alright. That's our time. Thanks.",
  sarah: "Thanks so much for chatting today. The team will be in touch.",
  david: "Good. We're done. Thanks.",
  jennifer: "Really enjoyed this — thanks for the conversation. You'll hear from us soon.",
};

// Very lightweight acknowledgments the mock can sprinkle in for realism
const ACKS = ["Got it.", "Okay.", "Hm.", "Right.", "Mhm.", ""];

export function mockClaudeResponse(input: MockResponseInput): string {
  const { ctx, turnIndex, lastUserTurn } = input;
  const personaId = ctx.personaId;

  if (turnIndex === 0) {
    return OPENINGS[personaId](ctx.candidateFirstName ?? "");
  }

  const bank = FOLLOWUPS[personaId];
  // Rough heuristic: if we've hit or passed the last question, wrap up
  if (turnIndex > bank.length) {
    return WRAPUP[personaId];
  }

  const idx = (turnIndex - 1) % bank.length;
  const response = bank[idx];

  // Occasionally prefix with an acknowledgment when the last user turn is substantive —
  // but skip the prefix when the bank entry already opens with its own ack word.
  const leadsWithAck = /^(Got it\.|Okay\.|Hm\.|Right\.|Mhm\.)/.test(response);
  const substantive = (lastUserTurn?.length ?? 0) > 40;
  const ack = substantive && !leadsWithAck ? ACKS[idx % ACKS.length] : "";
  return ack ? `${ack} ${response}` : response;
}

/**
 * Break a mock response into sentence-sized streaming chunks for parity with
 * real Claude's streaming behaviour. The orchestrator can drive UI the same
 * way against mock or real output.
 */
export function* streamMockChunks(fullText: string): Generator<string, void, unknown> {
  // Split on sentence boundaries, keeping punctuation
  const parts = fullText.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) ?? [fullText];
  for (const part of parts) {
    // Further chunk into ~10-char deltas for a streaming feel
    let cursor = 0;
    while (cursor < part.length) {
      const next = Math.min(cursor + 10 + Math.floor(Math.random() * 8), part.length);
      yield part.slice(cursor, next);
      cursor = next;
    }
  }
}

/** Rough estimate of how long this text would take to speak aloud, in ms. */
export function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const wpm = 165; // conversational pace
  return Math.round((words / wpm) * 60 * 1000);
}

// --------------------------------------------------------------------------
// Strip all unused — keep lint happy for the one lint config variant that
// flags unused type imports in file-scope.
// --------------------------------------------------------------------------
export type { InterviewType };
