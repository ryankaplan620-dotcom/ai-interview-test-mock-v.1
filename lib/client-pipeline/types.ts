/**
 * Client-side pipeline interfaces.
 *
 * Each external service (STT, TTS, avatar) has a small interface that both
 * the mock and real implementations satisfy. The orchestrator only talks to
 * interfaces, so swapping mock → real is a single-line change.
 */

// --------------------------------------------------------------------------
// STT
// --------------------------------------------------------------------------

export interface STTClient {
  /** Start listening to the given audio stream. Must be called before onFinal fires. */
  start(stream: MediaStream): Promise<void>;
  /** Stop listening. Idempotent. */
  stop(): Promise<void>;
  /** Subscribe to interim transcription updates (partial text). */
  onInterim(cb: (text: string) => void): () => void;
  /** Subscribe to finalised turn events. */
  onFinal(cb: (event: { text: string; startedAtMs: number; endedAtMs: number }) => void): () => void;
  /** Subscribe to utterance-end (silence past threshold) events. */
  onUtteranceEnd(cb: () => void): () => void;
  /** Subscribe to unexpected disconnects/errors after a successful start. Optional — mocks never fire it. */
  onError?(cb: (err: Error) => void): () => void;
  /** Mock-only: synthetically submit a user turn. No-op in real implementations. */
  mockSubmit?(text: string): void;
  /** True if this is the mock implementation — UIs may show a dev panel. */
  readonly isMock: boolean;
}

// --------------------------------------------------------------------------
// TTS
// --------------------------------------------------------------------------

export interface TTSClient {
  /**
   * Play audio for the given sentence. The returned promise resolves when
   * playback of this sentence is complete (so the orchestrator can sequence).
   */
  speak(sentence: string, sentenceIndex: number): Promise<void>;
  /** Cancel any in-flight playback immediately. */
  cancel(): void;
  /** True if this is the mock implementation. */
  readonly isMock: boolean;
}

// --------------------------------------------------------------------------
// Avatar
// --------------------------------------------------------------------------

export interface AvatarClient {
  /**
   * Establish the avatar session. Resolves with a video track the UI can
   * render, or null if mock (UI falls back to the placeholder frame).
   */
  connect(opts: { personaId: string }): Promise<{ videoTrack: MediaStreamTrack | null }>;
  /**
   * Signal to the avatar whether the persona is currently speaking —
   * lets mock implementations animate a pulse, and lets real implementations
   * push audio into the lip-sync pipeline.
   */
  setSpeakingState(speaking: boolean): void;
  /** Clean up the peer connection. */
  disconnect(): void;
  /** True if this is the mock implementation. */
  readonly isMock: boolean;
}
