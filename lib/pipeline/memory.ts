/**
 * Session memory — Upgrade 07.
 *
 * Extracts persona-voice "memory notes" from a completed session and surfaces
 * them back into future sessions with the same persona. Memory is per-user
 * AND per-persona: each interviewer builds an independent read of the
 * candidate across their sessions with that candidate. Marcus does not see
 * what Gemma noted, and vice versa.
 *
 * Flow:
 *   1. After feedback is persisted in /api/feedback/generate, we call
 *      `extractAndPersistMemories()` — a second Claude pass that produces
 *      0-3 short first-person notes.
 *   2. When a new session is created for the same persona in
 *      /api/tavus/conversation, we call `loadMemoriesForSession()` to pull
 *      up to `MEMORY_CONTEXT_MAX` active memories (prioritising recent +
 *      low-surfaced).
 *   3. Those memories are injected into the persona's conversational_context
 *      with formatting that makes them feel like genuine recall.
 *   4. `bump_memory_surfaced_count` is called to track which ones were used,
 *      so frequently-re-surfaced notes fade and newer observations rise.
 *
 * Dev fallback: if ANTHROPIC_API_KEY is missing (shouldMock("claude")), the
 * extractor returns [] so no memories are written. Retrieval still works —
 * it just returns an empty list cleanly.
 *
 * Feature flag: set MEMORY_SURFACE_ENABLED=false to disable retrieval (but
 * continue extracting). Useful for the pre-smoke-test window when we want
 * memory to accumulate but not be exposed to live interviewers yet.
 */

import Anthropic from "@anthropic-ai/sdk";
import { PERSONAS } from "@/lib/personas";
import { env, shouldMock } from "./env";
import { createServiceClient } from "@/lib/db/service";
import type { PersonaId, InterviewType, SessionMode } from "@/types/supabase";
import { formatInterviewType } from "@/lib/utils/session-labels";

// --------------------------------------------------------------------------
// Tunables
// --------------------------------------------------------------------------

/** Max memories pulled into a new session's context. */
export const MEMORY_CONTEXT_MAX = 2;

/** Minimum length for a memory note. Claude occasionally tries shorter; reject. */
const MIN_MEMORY_CHARS = 10;
/** Max length; matches the DB check constraint in migration 0008. */
const MAX_MEMORY_CHARS = 500;

/** Category tag length bounds, matching migration. */
const MIN_CATEGORY_CHARS = 2;
const MAX_CATEGORY_CHARS = 64;

/** Max memories a single session can produce. */
const MAX_EXTRACTED_PER_SESSION = 3;

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface MemoryNote {
  id: string;
  persona: PersonaId;
  memory_text: string;
  category: string;
  confidence: number;
  surfaced_count: number;
  dismissed: boolean;
  created_at: string;
  source_session_id: string | null;
}

interface ExtractedMemory {
  category: string;
  memory_text: string;
  confidence: number;
}

export interface MemoryExtractionInput {
  sessionId: string;
  userId: string;
  personaId: PersonaId;
  interviewType: InterviewType;
  mode: SessionMode;
  targetFirm: string | null;
  targetRole: string | null;
  transcript: Array<{ role: "user" | "assistant"; content: string }>;
  feedbackSummary: string;
  feedbackImprovements: string[];
}

// --------------------------------------------------------------------------
// Surfacing — read path
// --------------------------------------------------------------------------

/**
 * Check whether memory surfacing is globally enabled. Defaults to true.
 * Set MEMORY_SURFACE_ENABLED=false to keep extraction running but hide
 * memory from live sessions (pre-launch caution).
 */
export function memorySurfaceEnabled(): boolean {
  return process.env.MEMORY_SURFACE_ENABLED !== "false";
}

/**
 * Load up to MEMORY_CONTEXT_MAX memories for (user, persona) suitable for
 * injecting into a new Tavus conversation's context. Returns empty list if
 * feature-flagged off or nothing exists.
 *
 * Ranking: least-surfaced first (so stale notes get demoted), then most
 * recent. Confidence 1 notes are included but deprioritized by surfaced_count
 * plus their age tends to push them out naturally.
 */
export async function loadMemoriesForSession(args: {
  userId: string;
  personaId: PersonaId;
}): Promise<MemoryNote[]> {
  if (!memorySurfaceEnabled()) return [];

  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("user_session_memory") as any)
    .select(
      "id, persona, memory_text, category, confidence, surfaced_count, dismissed, created_at, source_session_id",
    )
    .eq("user_id", args.userId)
    .eq("persona", args.personaId)
    .eq("dismissed", false)
    .order("surfaced_count", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(MEMORY_CONTEXT_MAX);

  if (error) {
    console.error("[memory] load failed:", error);
    return [];
  }
  return (data ?? []) as MemoryNote[];
}

/**
 * After memories are injected into a session, bump their surfaced_count.
 * Batched into a single RPC call so we don't do N round-trips.
 */
export async function markMemoriesSurfaced(memoryIds: string[]): Promise<void> {
  if (memoryIds.length === 0) return;
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)("bump_memory_surfaced_count", {
    p_memory_ids: memoryIds,
  });
  if (error) {
    // Non-fatal: the session already has its context; missing this bump just
    // means the same memory might get surfaced again next session. Log it
    // so we notice if it keeps failing.
    console.error("[memory] surfaced bump failed:", error);
  }
}

/**
 * Format memories for injection into a Tavus conversational_context string.
 * Returns empty string if no memories — caller should check before prepending
 * a "Memory from prior sessions:" heading.
 */
export function formatMemoriesForContext(
  memories: MemoryNote[],
  interviewerFirstName: string,
): string {
  if (memories.length === 0) return "";

  const header = `You (${interviewerFirstName}) have met this candidate before. From those prior sessions, you remember:`;
  const notes = memories.map((m) => `- ${m.memory_text}`).join("\n");
  const instruction =
    "You may reference one of these naturally at an appropriate moment — for example, " +
    "when transitioning between questions or when you want to test whether the candidate has " +
    "improved. Do not open with a memory. Do not recite them all. Reference at most one, and " +
    "only if it fits organically.";

  return `${header}\n${notes}\n\n${instruction}`;
}

// --------------------------------------------------------------------------
// Extraction — write path
// --------------------------------------------------------------------------

/**
 * Extract memories from a completed session and persist them.
 * No-op if the transcript is too short or Claude is mocked.
 *
 * Call this from /api/feedback/generate AFTER feedback row is persisted —
 * memories are a side-effect of feedback generation, not part of it.
 * Errors are logged and swallowed — a memory-extraction failure should not
 * poison the feedback response the user is waiting on.
 */
export async function extractAndPersistMemories(
  input: MemoryExtractionInput,
): Promise<{ extracted: number; skipped?: string }> {
  // Skip very short sessions — not enough signal to produce useful notes
  const userTurns = input.transcript.filter((t) => t.role === "user");
  if (userTurns.length < 3) {
    return { extracted: 0, skipped: "transcript_too_short" };
  }

  if (shouldMock("claude")) {
    return { extracted: 0, skipped: "claude_mocked" };
  }

  let extracted: ExtractedMemory[];
  try {
    extracted = await extractViaClaude(input);
  } catch (err) {
    console.error("[memory] extraction failed:", err);
    return { extracted: 0, skipped: "extraction_error" };
  }

  if (extracted.length === 0) {
    return { extracted: 0, skipped: "no_observations" };
  }

  const supabase = createServiceClient();
  const rows = extracted.map((m) => ({
    user_id: input.userId,
    persona: input.personaId,
    source_session_id: input.sessionId,
    memory_text: m.memory_text,
    category: m.category,
    confidence: m.confidence,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("user_session_memory") as any).insert(rows);
  if (error) {
    console.error("[memory] insert failed:", error);
    return { extracted: 0, skipped: "insert_error" };
  }

  return { extracted: rows.length };
}

// --------------------------------------------------------------------------
// Claude extraction call
// --------------------------------------------------------------------------

const MEMORY_TOOL = {
  name: "record_memories",
  description:
    "Record 0-3 memory notes about this candidate for future sessions. Return an empty array " +
    "if nothing from this session is worth remembering next time.",
  input_schema: {
    type: "object" as const,
    properties: {
      memories: {
        type: "array" as const,
        maxItems: MAX_EXTRACTED_PER_SESSION,
        items: {
          type: "object" as const,
          properties: {
            category: {
              type: "string" as const,
              minLength: MIN_CATEGORY_CHARS,
              maxLength: MAX_CATEGORY_CHARS,
              description:
                "Short snake_case tag. Examples: conflict_hedging, strong_star_structure, " +
                "vague_metrics, rambles_under_pressure, filler_under_silence, crisp_resume_walk.",
            },
            memory_text: {
              type: "string" as const,
              minLength: MIN_MEMORY_CHARS,
              maxLength: MAX_MEMORY_CHARS,
              description:
                "The note, written in first person as YOU (the interviewer). 1-2 sentences. " +
                "Specific to THIS candidate, not generic advice. Something you'd actually want " +
                "to reference or test when you see them again.",
            },
            confidence: {
              type: "integer" as const,
              minimum: 1,
              maximum: 5,
              description:
                "1 = tentative ('might be a pattern'), 5 = high confidence ('I'm sure of this'). " +
                "Most notes land 2-4. Reserve 5 for patterns demonstrated repeatedly.",
            },
          },
          required: ["category", "memory_text", "confidence"],
        },
      },
    },
    required: ["memories"],
  },
};

async function extractViaClaude(input: MemoryExtractionInput): Promise<ExtractedMemory[]> {
  const persona = PERSONAS[input.personaId];
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = buildMemorySystemPrompt(persona.firstName, persona.firm, persona.title);
  const user = buildMemoryUserPrompt(input, persona.firstName);

  const res = await anthropic.messages.create({
    model: env.feedbackModel(),
    max_tokens: 800,
    system,
    tools: [MEMORY_TOOL],
    tool_choice: { type: "tool", name: MEMORY_TOOL.name },
    messages: [{ role: "user", content: user }],
  });

  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("memory_tool_not_called");
  }

  const raw = toolUse.input as { memories?: ExtractedMemory[] };
  const memories = raw.memories ?? [];

  // Defensive validation — Claude schemas are generally honored but we've
  // seen edge cases with minLength so enforce here too.
  return memories
    .filter((m): m is ExtractedMemory => {
      return (
        typeof m.category === "string" &&
        m.category.length >= MIN_CATEGORY_CHARS &&
        m.category.length <= MAX_CATEGORY_CHARS &&
        typeof m.memory_text === "string" &&
        m.memory_text.length >= MIN_MEMORY_CHARS &&
        m.memory_text.length <= MAX_MEMORY_CHARS &&
        Number.isInteger(m.confidence) &&
        m.confidence >= 1 &&
        m.confidence <= 5
      );
    })
    .slice(0, MAX_EXTRACTED_PER_SESSION);
}

function buildMemorySystemPrompt(firstName: string, firm: string, title: string): string {
  return `You are ${firstName}, a ${title} at ${firm}. You just finished a practice interview with a candidate. You're taking brief private notes for yourself — things you want to remember for the next time you interview this person.

## What to record
A memory is a short observation you would actually bring up or test in a future session. Good notes are:
- Specific to THIS candidate, not generic feedback
- Observations of a pattern, not a one-off stumble
- Written in first person as you
- Short — one or two sentences

## What NOT to record
- Restating the score or the grade ("weak behavioral answers" is not a memory)
- Generic coaching advice ("needs more STAR structure")
- Details that won't persist — if the candidate was nervous about a specific hard question, that's session-specific, not a pattern
- Anything complimentary that isn't also actionable for next time

## How many
Most sessions produce 1-2 notes. Some produce 0. A very rich session produces 3. If nothing notable stood out, return an empty array — do not pad.

## Tone
Think of these as your own private notes. You don't have to be diplomatic. You will not show these to the candidate. Be honest with yourself about what you noticed.`;
}

function buildMemoryUserPrompt(input: MemoryExtractionInput, firstName: string): string {
  const lines: string[] = [];

  lines.push(`## Session context`);
  lines.push(`Interviewer: ${firstName} (you)`);
  lines.push(`Format: ${formatInterviewType(input.interviewType)}`);
  lines.push(`Difficulty: ${input.mode}`);
  if (input.targetFirm) lines.push(`Candidate is targeting: ${input.targetFirm}`);
  if (input.targetRole) lines.push(`For role: ${input.targetRole}`);
  lines.push("");

  lines.push(`## Transcript`);
  lines.push("");
  for (const t of input.transcript) {
    const label = t.role === "user" ? "CANDIDATE" : firstName.toUpperCase();
    lines.push(`${label}: ${t.content}`);
  }
  lines.push("");

  lines.push(`## Your own feedback summary from this session`);
  lines.push(input.feedbackSummary);
  lines.push("");
  if (input.feedbackImprovements.length > 0) {
    lines.push(`## The improvements you flagged`);
    for (const imp of input.feedbackImprovements) lines.push(`- ${imp}`);
    lines.push("");
  }

  lines.push(`## Your task`);
  lines.push(
    `Using the record_memories tool, write 0-3 notes about this candidate that you want to remember for the next time you interview them. Follow the style rules in the system prompt. Return an empty memories array if nothing is worth remembering.`,
  );

  return lines.join("\n");
}

