import type { AvatarClient } from "./types";

/**
 * Mock avatar — no WebRTC, no video track. The session UI keeps its placeholder
 * PersonaFrame and animates a pulse ring based on setSpeakingState(true/false).
 */
export class MockAvatarClient implements AvatarClient {
  readonly isMock = true;

  private speakingCbs = new Set<(speaking: boolean) => void>();

  async connect(_opts: { personaId: string }): Promise<{ videoTrack: MediaStreamTrack | null }> {
    return { videoTrack: null };
  }

  setSpeakingState(speaking: boolean): void {
    this.speakingCbs.forEach((cb) => cb(speaking));
  }

  disconnect(): void {
    this.speakingCbs.clear();
  }

  /** Mock-only: UI subscribes to speaking state so PersonaFrame can animate. */
  onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.speakingCbs.add(cb);
    return () => this.speakingCbs.delete(cb);
  }
}
