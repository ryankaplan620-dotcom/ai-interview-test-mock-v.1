import type { TTSClient } from "./types";

/**
 * Mock TTS — no audio played. Resolves `speak()` after a timer calibrated to
 * estimated speech duration, so the orchestrator's speaking phase has realistic
 * length and the user can see transcript pacing.
 */
export class MockTTSClient implements TTSClient {
  readonly isMock = true;

  private currentTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentResolve: (() => void) | null = null;

  async speak(sentence: string, _sentenceIndex: number): Promise<void> {
    const ms = estimateSpeechMs(sentence);
    return new Promise((resolve) => {
      this.currentResolve = resolve;
      this.currentTimeout = setTimeout(() => {
        this.currentResolve = null;
        this.currentTimeout = null;
        resolve();
      }, ms);
    });
  }

  cancel(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    if (this.currentResolve) {
      this.currentResolve();
      this.currentResolve = null;
    }
  }
}

/** Rough estimate of spoken duration in ms. Conversational pace ~165wpm. */
function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wpm = 165;
  const base = (words / wpm) * 60 * 1000;
  // Clamp so very short snippets still feel deliberate
  return Math.max(500, Math.round(base));
}
