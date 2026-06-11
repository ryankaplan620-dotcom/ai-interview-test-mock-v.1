/**
 * Client-side consumer for the /api/interview/turn SSE stream.
 *
 * Takes a TurnRequestPayload, POSTs it, and yields StreamEvent frames as
 * they arrive. The orchestrator drives UI from these frames.
 */

import type {
  ConversationTurn,
  ConversationContext,
  StreamEvent,
} from "@/lib/pipeline/types";

export interface TurnStreamOptions {
  sessionId: string;
  ctx: ConversationContext;
  history: ConversationTurn[];
  isOpening: boolean;
  /** Ms since call start — lets the persona pace against the session clock. */
  elapsedMs?: number;
  signal?: AbortSignal;
}

/**
 * Open a streaming turn request. Returns an async iterator over StreamEvent frames.
 */
export async function* streamInterviewTurn(opts: TurnStreamOptions): AsyncGenerator<StreamEvent> {
  const response = await fetch("/api/interview/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: opts.sessionId,
      isOpening: opts.isOpening,
      history: opts.history,
      elapsedMs: opts.elapsedMs,
    }),
    signal: opts.signal,
  });

  if (!response.ok) {
    yield { type: "error", error: `turn_request_failed_${response.status}` };
    return;
  }
  if (!response.body) {
    yield { type: "error", error: "no_body" };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by double newline
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        // Frame format: "data: <json>"
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;

        try {
          const event = JSON.parse(payload) as StreamEvent;
          yield event;
          if (event.type === "done" || event.type === "error") return;
        } catch {
          // Malformed frame — skip rather than break the stream
          continue;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
