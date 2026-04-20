import type { STTClient } from "./types";

/**
 * Mock STT — does no real audio processing. The user submits their turn via
 * a dev textbox wired to `mockSubmit(text)`. Useful for UX testing without
 * burning Deepgram credit and for CI.
 */
export class MockSTTClient implements STTClient {
  readonly isMock = true;

  private interimCbs = new Set<(text: string) => void>();
  private finalCbs = new Set<(e: { text: string; startedAtMs: number; endedAtMs: number }) => void>();
  private utteranceEndCbs = new Set<() => void>();
  private callStartedAtMs: number | null = null;

  async start(_stream: MediaStream): Promise<void> {
    this.callStartedAtMs = Date.now();
    // No-op on the audio stream; user typing drives mockSubmit
  }

  async stop(): Promise<void> {
    this.callStartedAtMs = null;
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

  mockSubmit(text: string): void {
    const callStart = this.callStartedAtMs ?? Date.now();
    const now = Date.now();
    // Simulate a short interim stream before the final
    const interim = text.trim();
    this.interimCbs.forEach((cb) => cb(interim));
    // Fire final then utterance-end on the next tick
    setTimeout(() => {
      this.finalCbs.forEach((cb) =>
        cb({
          text: interim,
          startedAtMs: now - callStart - Math.min(2000, interim.length * 30),
          endedAtMs: now - callStart,
        }),
      );
      this.interimCbs.forEach((cb) => cb(""));
      // utterance_end lands ~400ms after final, matching Deepgram semantics
      setTimeout(() => {
        this.utteranceEndCbs.forEach((cb) => cb());
      }, 400);
    }, 0);
  }
}
