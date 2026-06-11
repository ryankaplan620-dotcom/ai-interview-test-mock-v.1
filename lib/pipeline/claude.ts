/**
 * Server-side Claude streaming helper.
 *
 * Used by /api/interview/turn and /api/interview/opening. Streams Claude
 * responses chunk-by-chunk, emitting sentence boundaries as they're detected
 * so downstream TTS can start speaking before Claude finishes thinking.
 *
 * Uses extended thinking off (interview interviewers don't need it; latency matters).
 */

import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import type { ConversationContext, ConversationTurn, StreamEvent } from "./types";
import { PERSONAS, composeSystemPrompt } from "@/lib/personas";
import type { PersonaRuntimeContext } from "@/lib/personas/types";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set — call shouldMock('claude') before using this.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Build the persona system prompt + history messages for a Claude call.
 */
function buildMessages(
  ctx: ConversationContext,
  history: ConversationTurn[],
  isOpening: boolean,
  elapsedMs?: number,
) {
  const persona = PERSONAS[ctx.personaId];
  const runtimeCtx: PersonaRuntimeContext = {
    mode: ctx.mode,
    interviewType: ctx.interviewType,
    candidateFirstName: ctx.candidateFirstName ?? undefined,
    targetFirm: ctx.targetFirm ?? undefined,
    targetRole: ctx.targetRole ?? undefined,
    targetDurationMinutes: ctx.targetDurationMinutes,
    sessionSeed: ctx.sessionId,
    sessionMemorySummary: ctx.sessionMemorySummary ?? undefined,
    companyIntelSummary: ctx.companyIntelSummary ?? undefined,
  };
  const composed = composeSystemPrompt(persona, runtimeCtx);

  // For the opening, we send the persona's opening instruction as a synthetic
  // first user turn. This bootstraps the interviewer voice.
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (isOpening) {
    messages.push({
      role: "user",
      content: `[Interviewer stage direction — not the candidate speaking]\n${composed.firstTurnInstruction}`,
    });
  } else {
    // Reconstruct the conversation. Start with the opening stage direction,
    // so Claude has the same framing it always had.
    messages.push({
      role: "user",
      content: `[Interviewer stage direction — not the candidate speaking]\n${composed.firstTurnInstruction}`,
    });
    for (const turn of history) {
      messages.push({ role: turn.role, content: turn.content });
    }

    // Silent clock for the persona — appended to the latest candidate turn so
    // pacing decisions (digging in vs. landing the plane) happen like a real
    // interviewer's. Never persisted; rebuilt fresh each turn.
    const timeNote = buildTimeNote(elapsedMs, ctx.targetDurationMinutes);
    if (timeNote && messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages[messages.length - 1] = {
        role: "user",
        content: `${messages[messages.length - 1].content}\n\n${timeNote}`,
      };
    }
  }

  return { system: composed.systemPrompt, messages };
}

function buildTimeNote(elapsedMs: number | undefined, targetMinutes: number): string | null {
  if (elapsedMs === undefined || elapsedMs < 0 || targetMinutes <= 0) return null;
  const elapsedMin = elapsedMs / 60_000;
  const remainingMin = targetMinutes - elapsedMin;

  // Round elapsed to the nearest minute the way a person glancing at a clock would
  const shown = Math.max(1, Math.round(elapsedMin));

  if (remainingMin <= 2) {
    return `[Stage note, silent: about ${shown} of ${targetMinutes} minutes elapsed. Time is up — close warmly within your next turn or two. If candidate questions haven't happened, fold a brief version into the close.]`;
  }
  // Wrap-up nudge: ~5 min out on a full-length session, ~3 min on a short one
  if (remainingMin <= Math.min(5, Math.max(3, targetMinutes * 0.2))) {
    return `[Stage note, silent: about ${shown} of ${targetMinutes} minutes elapsed. Start landing the plane — wrap the current thread and move toward the candidate's questions.]`;
  }
  return `[Stage note, silent: about ${shown} of ${targetMinutes} minutes elapsed.]`;
}

/**
 * Stream Claude output for an interview turn.
 *
 * Calls the given emit() callback with StreamEvent frames in order.
 * Returns the full text of the turn on success.
 */
export async function streamClaudeTurn(opts: {
  ctx: ConversationContext;
  history: ConversationTurn[];
  isOpening: boolean;
  emit: (event: StreamEvent) => void;
  /** Wall-clock ms since call start when this turn began. */
  turnStartedAtMs: number;
  /** Ms since call start as reported by the client — drives time stage notes. */
  elapsedMs?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const { ctx, history, isOpening, emit, turnStartedAtMs, elapsedMs, signal } = opts;

  emit({ type: "start", turnStartedAtMs });

  const { system, messages } = buildMessages(ctx, history, isOpening, elapsedMs);

  const stream = await getClient().messages.stream(
    {
      model: env.interviewModel(),
      max_tokens: 800,
      // cache_control is valid at runtime but not in @anthropic-ai/sdk 0.32's TextBlockParam type.
      // Cast to Anthropic.TextBlockParam[] after augmenting with the ephemeral cache field.
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      messages,
    },
    { signal },
  );

  let buffer = "";
  let sentenceIndex = 0;

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const delta = event.delta.text;
      buffer += delta;
      emit({ type: "text", delta });

      // Sentence boundary detection — emit on punctuation followed by space or end
      const match = buffer.match(/^(.*?[.!?…]+)(\s+|$)/);
      if (match) {
        const sentence = match[1].trim();
        if (sentence.length > 3) {
          emit({ type: "sentence", sentence, sentenceIndex });
          sentenceIndex += 1;
        }
        buffer = buffer.slice(match[0].length);
      }
    }
  }

  const final = await stream.finalMessage();
  const fullText =
    final.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("") ||
    // Fallback: if streaming drained the buffer the loop already accumulated it
    buffer;

  // Emit any trailing partial as a final sentence
  if (buffer.trim().length > 0) {
    emit({ type: "sentence", sentence: buffer.trim(), sentenceIndex });
  }

  const turnEndedAtMs = turnStartedAtMs + (Date.now() - turnStartedAtMs);
  emit({ type: "done", fullText, turnEndedAtMs });

  return fullText;
}
