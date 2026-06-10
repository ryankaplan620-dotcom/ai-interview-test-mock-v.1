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
  gemma: (n) =>
    `Thanks for making the time${n ? `, ${n}` : ""}. I'm Gemma, I run hiring for our summer internship program. Let's keep this more of a conversation than an interrogation — so, to start: what drew you to this?`,
  sarah: (n) =>
    `Hey${n ? `, ${n}` : ""}, I'm Sarah. Great to meet you. Before we get into the problem, tell me a little about yourself and what you've been working on lately.`,
};

// Per-persona, per-turn response bank. Mocks rotate through these after the opening.
const FOLLOWUPS: Record<PersonaId, string[]> = {
  gemma: [
    "So why commercial real estate? And why investment sales specifically, over something like banking or consulting?",
    "Tell me about a time you got told no, over and over, and kept going anyway.",
    "Be honest with me — did you actually enjoy that, or were you just pushing through it?",
    "When's the last time someone gave you tough feedback? What'd you do with it?",
    "Quick one: an owner tells you flat out they're not selling. What do you say next?",
    "This job is straight commission, and the first year is mostly cold-calling with no guarantee. How does that sit with you?",
    "What have you done on your own to learn about this business?",
    "Alright — what do you want to ask me?",
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
};

const WRAPUP: Record<PersonaId, string> = {
  gemma: "This was a good conversation — thanks for the time. We'll follow up on next steps soon. Take care.",
  sarah: "Thanks so much for chatting today. The team will be in touch.",
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
