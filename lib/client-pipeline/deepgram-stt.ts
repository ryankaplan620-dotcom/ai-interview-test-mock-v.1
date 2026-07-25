import type { STTClient } from "./types";

/**
 * Deepgram streaming STT client.
 *
 * Architecture:
 *   - Mints a 60-second temp key via /api/deepgram/token.
 *   - Opens a WebSocket to wss://api.deepgram.com/v1/listen with the temp
 *     key in the subprotocol (browsers can't set Authorization headers).
 *   - Captures audio from the mic MediaStream via MediaRecorder (webm/opus,
 *     250ms timeslice) and sends each chunk as a binary WS frame.
 *   - Parses Deepgram Results + UtteranceEnd messages and fires the
 *     STTClient callbacks.
 *
 * Semantics worth remembering:
 *   - Deepgram can emit multiple `is_final: true` Results within a single
 *     user utterance. We accumulate them into `currentTurnText` and fire
 *     onFinal with the accumulated text on each is_final so the orchestrator
 *     always has the latest commit.
 *   - The turn is considered complete only when `UtteranceEnd` arrives
 *     (silence past `utterance_end_ms`). We fire onUtteranceEnd and reset.
 *   - Interim (non-final) Results fire onInterim with the current tail.
 */
export class DeepgramSTTClient implements STTClient {
  readonly isMock = false;

  private ws: WebSocket | null = null;
  private recorder: MediaRecorder | null = null;
  private interimCbs = new Set<(text: string) => void>();
  private finalCbs = new Set<(e: { text: string; startedAtMs: number; endedAtMs: number }) => void>();
  private utteranceEndCbs = new Set<() => void>();
  private errorCbs = new Set<(err: Error) => void>();

  /** Set by stop() so the post-connect close/error listeners don't report our own teardown. */
  private intentionalClose = false;

  /** Text committed so far in the current utterance (is_final accumulations). */
  private currentTurnText = "";
  /** Latest interim tail — shown to the user while they're mid-sentence. */
  private currentInterim = "";
  /** Wall-clock ms when the current turn's first word landed. */
  private currentTurnStartedAtMs: number | null = null;
  /** Wall-clock ms when the STT session started. */
  private streamStartedAtMs: number | null = null;

  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  async start(stream: MediaStream): Promise<void> {
    // 1. Mint temp token
    const tokenRes = await fetch("/api/deepgram/token", { method: "POST" });
    if (!tokenRes.ok) {
      throw new Error(`deepgram_token_failed_${tokenRes.status}`);
    }
    const { token, model } = (await tokenRes.json()) as { token: string; model: string };

    // 2. Open WS — Deepgram auth via subprotocol ["token", key]
    const params = new URLSearchParams({
      model,
      smart_format: "true",
      punctuate: "true",
      interim_results: "true",
      // endpointing drives speech_final on Results (triggers is_final when user pauses briefly)
      endpointing: "500",
      // utterance_end_ms emits the UtteranceEnd message after sustained silence
      utterance_end_ms: "1000",
      vad_events: "true",
      language: "en",
    });
    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    const ws = new WebSocket(url, ["token", token]);
    ws.binaryType = "arraybuffer";
    this.ws = ws;

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onError);
        reject(new Error("deepgram_ws_connect_failed"));
      };
      ws.addEventListener("open", onOpen);
      ws.addEventListener("error", onError);
    });

    // 3. Wire message handler
    ws.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return; // Binary responses are metadata; ignore
      try {
        const msg = JSON.parse(event.data);
        this.handleDeepgramMessage(msg);
      } catch {
        // Skip malformed
      }
    });

    // Post-connect close/error — a network blip, server timeout, or the 60s temp
    // token expiring mid-session would otherwise fail silently (sends are already
    // guarded on readyState, so nothing downstream would ever hear about it).
    ws.addEventListener("close", (event) => {
      if (this.intentionalClose) return;
      this.errorCbs.forEach((cb) => cb(new Error(`deepgram_ws_closed_${event.code}`)));
    });
    ws.addEventListener("error", () => {
      if (this.intentionalClose) return;
      this.errorCbs.forEach((cb) => cb(new Error("deepgram_ws_error")));
    });

    // 4. Start MediaRecorder
    const mimeType = pickMimeType();
    if (!mimeType) {
      throw new Error("deepgram_no_supported_mime");
    }
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32_000 });
    this.recorder = recorder;

    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size === 0) return;
      if (ws.readyState !== WebSocket.OPEN) return;
      // Send the Blob directly as a binary frame. MediaRecorder's output is
      // valid webm starting with init segment + media segments; Deepgram's
      // streaming endpoint handles it when sent in order.
      e.data.arrayBuffer().then((buf) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(buf);
      });
    });

    // 5. Keepalive — Deepgram closes idle connections after ~10s of silence
    this.keepAliveInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "KeepAlive" }));
      }
    }, 5000);

    this.streamStartedAtMs = Date.now();
    recorder.start(250);
  }

  async stop(): Promise<void> {
    this.intentionalClose = true;
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.recorder && this.recorder.state !== "inactive") {
      try {
        this.recorder.stop();
      } catch {
        /* noop */
      }
    }
    this.recorder = null;

    if (this.ws) {
      // Send close signal per Deepgram protocol — lets server flush final Results
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "CloseStream" }));
        }
      } catch {
        /* noop */
      }
      try {
        this.ws.close();
      } catch {
        /* noop */
      }
      this.ws = null;
    }

    this.currentTurnText = "";
    this.currentInterim = "";
    this.currentTurnStartedAtMs = null;
  }

  onInterim(cb: (text: string) => void): () => void {
    this.interimCbs.add(cb);
    return () => this.interimCbs.delete(cb);
  }

  onFinal(cb: (e: { text: string; startedAtMs: number; endedAtMs: number }) => void): () => void {
    this.finalCbs.add(cb);
    return () => this.finalCbs.delete(cb);
  }

  onUtteranceEnd(cb: () => void): () => void {
    this.utteranceEndCbs.add(cb);
    return () => this.utteranceEndCbs.delete(cb);
  }

  onError(cb: (err: Error) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }

  // ------------------------------------------------------------------
  // Internal — Deepgram message handling
  // ------------------------------------------------------------------

  private handleDeepgramMessage(msg: DeepgramMessage): void {
    if (msg.type === "Results") {
      const transcript = msg.channel?.alternatives?.[0]?.transcript ?? "";
      if (!transcript.trim()) return;

      const nowRelative = Date.now() - (this.streamStartedAtMs ?? Date.now());

      if (msg.is_final) {
        // Commit this segment to the current turn
        if (this.currentTurnStartedAtMs === null) {
          this.currentTurnStartedAtMs = nowRelative - Math.round((msg.duration ?? 0) * 1000);
        }
        this.currentTurnText = (this.currentTurnText + " " + transcript).trim();
        this.currentInterim = "";

        this.finalCbs.forEach((cb) =>
          cb({
            text: this.currentTurnText,
            startedAtMs: this.currentTurnStartedAtMs ?? nowRelative,
            endedAtMs: nowRelative,
          }),
        );
        // Mirror to interim so the UI shows the committed text while we wait for utterance-end
        this.interimCbs.forEach((cb) => cb(this.currentTurnText));
      } else {
        // Interim — show tail appended to accumulated turn text
        this.currentInterim = transcript;
        const display = (this.currentTurnText + " " + transcript).trim();
        this.interimCbs.forEach((cb) => cb(display));
      }
      return;
    }

    if (msg.type === "UtteranceEnd") {
      // Only fire if we actually have a turn to commit
      if (!this.currentTurnText.trim()) return;

      this.utteranceEndCbs.forEach((cb) => cb());

      this.currentTurnText = "";
      this.currentInterim = "";
      this.currentTurnStartedAtMs = null;
      return;
    }

    // SpeechStarted / Metadata / etc — ignored for now
  }
}

// --------------------------------------------------------------------------
// Mime selection — browsers disagree on which codecs MediaRecorder supports.
// Deepgram auto-detects from the container as long as we pick one of these.
// --------------------------------------------------------------------------

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4", // Safari fallback
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return null;
}

// --------------------------------------------------------------------------
// Deepgram wire format (partial — only the fields we consume)
// --------------------------------------------------------------------------

interface DeepgramMessage {
  type: "Results" | "UtteranceEnd" | "SpeechStarted" | "Metadata";
  is_final?: boolean;
  speech_final?: boolean;
  duration?: number;
  start?: number;
  channel?: {
    alternatives: Array<{ transcript: string; confidence?: number }>;
  };
}
