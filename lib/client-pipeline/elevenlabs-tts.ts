import type { TTSClient } from "./types";
import type { AudioSink } from "./audio-sink";

interface ElevenLabsTTSClientOptions {
  sessionId: string;
  /** Shared audio sink (also consumed by the avatar's WebRTC sender). */
  audioSink: AudioSink;
}

/**
 * ElevenLabs streaming TTS client.
 *
 * Flow:
 *   - speak(sentence) POSTs /api/tts/stream (server proxies to ElevenLabs)
 *   - Reads response body as a chunk stream (raw PCM at 22050 Hz)
 *   - Accumulates odd-length residual bytes across chunks (each PCM sample is
 *     2 bytes; chunks may split samples)
 *   - Pushes Int16Array chunks to the shared audio sink, which queues them
 *     for WebRTC upstream to Simli
 *   - Resolves speak() when the sink's queue drains
 *
 * The sink is the bridge to Simli — TTS never plays through speakers locally.
 * The user hears audio on the remote Simli track returned over the peer
 * connection, synchronized with the lip-synced video.
 */
export class ElevenLabsTTSClient implements TTSClient {
  readonly isMock = false;

  private currentAbort: AbortController | null = null;

  constructor(private opts: ElevenLabsTTSClientOptions) {}

  async speak(sentence: string, sentenceIndex: number): Promise<void> {
    // Cancel any in-flight speak() — orchestrator should await sequentially,
    // but this is a safety net if turn is cancelled mid-sentence.
    this.currentAbort?.abort();
    this.currentAbort = new AbortController();

    const res = await fetch("/api/tts/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: this.opts.sessionId,
        text: sentence,
        sentenceIndex,
      }),
      signal: this.currentAbort.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`tts_stream_failed_${res.status}`);
    }

    const reader = res.body.getReader();
    // Carry-over for odd-byte chunks (PCM samples are 16-bit; a chunk may
    // split a sample across the boundary)
    let carry: Uint8Array | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.length === 0) continue;

        const combined: Uint8Array = carry
          ? concatBytes(carry, value)
          : (value as Uint8Array);

        // Trim to even length; stash any trailing odd byte for the next chunk
        const evenLength = combined.length - (combined.length % 2);
        if (evenLength < combined.length) {
          carry = combined.slice(evenLength);
        } else {
          carry = null;
        }
        if (evenLength === 0) continue;

        // Interpret as little-endian 16-bit signed PCM
        // The buffer offset must be 2-byte aligned for Int16Array; use slice to copy.
        const samples = new Int16Array(
          combined.buffer.slice(
            combined.byteOffset,
            combined.byteOffset + evenLength,
          ),
        );
        this.opts.audioSink.pushPcm(samples);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* noop */
      }
    }

    // Wait for the sink queue to drain — only then is this sentence "spoken"
    // from the orchestrator's perspective.
    const remaining = this.opts.audioSink.msUntilQueueDrained();
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }

  cancel(): void {
    this.currentAbort?.abort();
    this.currentAbort = null;
    this.opts.audioSink.flush();
  }
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}
