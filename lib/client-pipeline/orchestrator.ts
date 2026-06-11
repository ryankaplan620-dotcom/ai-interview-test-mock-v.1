/**
 * Folio interview orchestrator.
 *
 * A small state machine that coordinates the four pipeline clients:
 *   - Claude (persona intelligence, via SSE)
 *   - STT (user speech → text)
 *   - TTS (interviewer text → audio)
 *   - Avatar (interviewer video + speaking state)
 *
 * Phase transitions:
 *   idle → connecting → speaking (opening) → listening → thinking → speaking → ...
 *
 * The orchestrator owns the conversation history, emits state to subscribers,
 * and exposes a small imperative API (start / end / setMicEnabled / etc.).
 */

import type {
  ConversationContext,
  ConversationTurn,
  OrchestratorHandle,
  OrchestratorPhase,
  OrchestratorState,
  StreamEvent,
} from "@/lib/pipeline/types";
import type { STTClient, TTSClient, AvatarClient } from "./types";
import { streamInterviewTurn } from "./claude-stream";
import { MockSTTClient } from "./mock-stt";
import { MockTTSClient } from "./mock-tts";
import { MockAvatarClient } from "./mock-avatar";

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

export interface OrchestratorConfig {
  ctx: ConversationContext;
  /** Local microphone stream (must be acquired before start()). */
  micStream: MediaStream;
  /** Which clients to use. Defaults to all mocks. */
  clients?: {
    stt?: STTClient;
    tts?: TTSClient;
    avatar?: AvatarClient;
  };
}

// --------------------------------------------------------------------------
// Factory
// --------------------------------------------------------------------------

export function createOrchestrator(config: OrchestratorConfig): OrchestratorHandle {
  return new Orchestrator(config);
}

// --------------------------------------------------------------------------
// Implementation
// --------------------------------------------------------------------------

class Orchestrator implements OrchestratorHandle {
  private stt: STTClient;
  private tts: TTSClient;
  private avatar: AvatarClient;

  private state: OrchestratorState = {
    phase: "idle",
    transcript: [],
    currentInterviewerLine: null,
    currentUserInterim: null,
    error: null,
    elapsedMs: 0,
  };

  private subscribers = new Set<(s: OrchestratorState) => void>();
  private callStartedAtMs: number | null = null;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private turnAbortController: AbortController | null = null;
  private ended = false;

  /** True while the current interviewer turn is being cut off by the candidate. */
  private bargedIn = false;

  /** Accumulated user turn while we wait for utterance_end. */
  private pendingUserTurn: { text: string; startedAtMs: number; endedAtMs: number } | null = null;

  constructor(private config: OrchestratorConfig) {
    this.stt = config.clients?.stt ?? new MockSTTClient();
    this.tts = config.clients?.tts ?? new MockTTSClient();
    this.avatar = config.clients?.avatar ?? new MockAvatarClient();

    // Wire STT events
    this.stt.onInterim((text) => {
      this.setState({ currentUserInterim: text || null });
    });
    this.stt.onFinal((event) => {
      // Buffer the final text — we commit it when utterance_end fires
      this.pendingUserTurn = event;
      this.setState({ currentUserInterim: event.text });
      // Candidate talking over the interviewer? Real people stop.
      this.maybeBargeIn(event.text);
    });
    this.stt.onUtteranceEnd(() => {
      this.handleUserUtteranceEnd();
    });
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  async start(): Promise<void> {
    if (this.state.phase !== "idle") return;
    this.setState({ phase: "connecting", error: null });

    try {
      // Connect avatar (mock resolves immediately, real does WebRTC)
      await this.avatar.connect({ personaId: this.config.ctx.personaId });

      // Start STT listening on the mic stream
      await this.stt.start(this.config.micStream);

      // Start the timer
      this.callStartedAtMs = Date.now();
      this.elapsedTimer = setInterval(() => {
        if (this.callStartedAtMs === null) return;
        this.setState({ elapsedMs: Date.now() - this.callStartedAtMs });
      }, 500);

      // Run the opening turn (interviewer speaks first)
      await this.runInterviewerTurn({ isOpening: true });
    } catch (err) {
      this.fail(err instanceof Error ? err.message : "start_failed");
    }
  }

  async end(reason: "completed" | "abandoned" | "error"): Promise<void> {
    if (this.ended) return;
    this.ended = true;

    // Abort any in-flight turn
    this.turnAbortController?.abort();

    // Stop timer
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }

    // Cancel TTS playback
    this.tts.cancel();

    // Stop listening
    try {
      await this.stt.stop();
    } catch {
      /* noop */
    }

    // Tear down avatar
    try {
      this.avatar.disconnect();
    } catch {
      /* noop */
    }

    this.setState({
      phase: reason === "error" ? "error" : "ended",
    });
  }

  setMicEnabled(enabled: boolean): void {
    this.config.micStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  setCameraEnabled(enabled: boolean): void {
    this.config.micStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  subscribe(cb: (s: OrchestratorState) => void): () => void {
    this.subscribers.add(cb);
    // Fire immediately so subscribers get initial state
    cb(this.state);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  getState(): OrchestratorState {
    return this.state;
  }

  mockSubmitUserTurn(text: string): void {
    if (this.stt.mockSubmit) {
      this.stt.mockSubmit(text);
    }
  }

  // ------------------------------------------------------------------
  // Internal — turn coordination
  // ------------------------------------------------------------------

  private async runInterviewerTurn(opts: { isOpening: boolean }): Promise<void> {
    if (this.ended) return;
    this.bargedIn = false;
    this.setState({ phase: "thinking", currentInterviewerLine: "" });

    this.avatar.setSpeakingState(false);
    this.turnAbortController = new AbortController();

    const speakingTasks: Promise<void>[] = [];
    let fullText = "";
    let firstSentenceSeen = false;

    try {
      for await (const event of streamInterviewTurn({
        sessionId: this.config.ctx.sessionId,
        ctx: this.config.ctx,
        history: this.state.transcript,
        isOpening: opts.isOpening,
        elapsedMs: this.elapsed(),
        signal: this.turnAbortController.signal,
      })) {
        if (this.ended || this.bargedIn) break;
        await this.handleStreamEvent(event, {
          onText: (delta) => {
            this.setState({
              currentInterviewerLine: (this.state.currentInterviewerLine ?? "") + delta,
              phase: this.state.phase === "thinking" ? "speaking" : this.state.phase,
            });
            if (!firstSentenceSeen) {
              firstSentenceSeen = true;
              this.avatar.setSpeakingState(true);
            }
          },
          onSentence: (sentence, index) => {
            // Fire-and-forget speak; we await all of them before transitioning
            speakingTasks.push(this.tts.speak(sentence, index));
          },
          onDone: (full) => {
            fullText = full;
          },
          onError: (msg) => {
            this.fail(msg);
          },
        });
      }

      if (this.ended || this.bargedIn) return;

      // Wait for all audio to finish. allSettled: a cancelled TTS task must
      // not be treated as a turn failure (barge-in cancels mid-playback).
      await Promise.allSettled(speakingTasks);

      if (this.ended || this.bargedIn) return;

      this.avatar.setSpeakingState(false);

      // Commit the interviewer turn to transcript
      const now = this.elapsed();
      this.commitTurn({
        role: "assistant",
        content: fullText || this.state.currentInterviewerLine || "",
        startedAtMs: now - 100,
        endedAtMs: now,
      });

      this.setState({
        phase: "listening",
        currentInterviewerLine: null,
      });
    } catch (err) {
      if (this.ended || this.bargedIn) return;
      this.fail(err instanceof Error ? err.message : "turn_failed");
    }
  }

  /**
   * Candidate started talking while the interviewer was mid-turn. If it's
   * substantive speech (not a backchannel like "yeah" / "got it"), cut the
   * interviewer off the way a person stops when talked over: kill audio,
   * abort the stream, commit what was actually said with a "—" cut marker
   * (the persona prompt knows what that marker means), and go to listening.
   */
  private maybeBargeIn(text: string): void {
    if (this.ended || this.bargedIn) return;
    if (this.state.phase !== "speaking") return;
    if (!isSubstantiveSpeech(text)) return;

    this.bargedIn = true;
    this.turnAbortController?.abort();
    this.tts.cancel();
    this.avatar.setSpeakingState(false);

    const spoken = (this.state.currentInterviewerLine ?? "").trim();
    if (spoken.length > 0) {
      const now = this.elapsed();
      this.commitTurn({
        role: "assistant",
        content: `${spoken} —`,
        startedAtMs: now - 100,
        endedAtMs: now,
      });
    }

    this.setState({
      phase: "listening",
      currentInterviewerLine: null,
    });
  }

  private async handleStreamEvent(
    event: StreamEvent,
    handlers: {
      onText: (delta: string) => void;
      onSentence: (sentence: string, index: number) => void;
      onDone: (full: string) => void;
      onError: (msg: string) => void;
    },
  ): Promise<void> {
    switch (event.type) {
      case "start":
        break;
      case "text":
        handlers.onText(event.delta);
        break;
      case "sentence":
        handlers.onSentence(event.sentence, event.sentenceIndex);
        break;
      case "done":
        handlers.onDone(event.fullText);
        break;
      case "error":
        handlers.onError(event.error);
        break;
    }
  }

  private handleUserUtteranceEnd(): void {
    if (this.ended) return;
    if (this.state.phase !== "listening") return;
    if (!this.pendingUserTurn || !this.pendingUserTurn.text.trim()) {
      // Nothing captured — stay in listening
      return;
    }

    // Commit the user turn
    this.commitTurn({
      role: "user",
      content: this.pendingUserTurn.text.trim(),
      startedAtMs: this.pendingUserTurn.startedAtMs,
      endedAtMs: this.pendingUserTurn.endedAtMs,
    });
    this.pendingUserTurn = null;
    this.setState({ currentUserInterim: null });

    // Kick off the interviewer's response
    void this.runInterviewerTurn({ isOpening: false });
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private commitTurn(turn: ConversationTurn): void {
    this.setState({ transcript: [...this.state.transcript, turn] });
  }

  private elapsed(): number {
    return this.callStartedAtMs ? Date.now() - this.callStartedAtMs : 0;
  }

  private fail(message: string): void {
    this.setState({ phase: "error", error: message });
    void this.end("error");
  }

  private setState(patch: Partial<OrchestratorState>): void {
    this.state = { ...this.state, ...patch };
    this.subscribers.forEach((cb) => cb(this.state));
  }
}

/**
 * Distinguish a real interruption from a listener backchannel. Echo from the
 * interviewer's own TTS audio and "mhm" / "yeah, that makes sense" style
 * acknowledgments must not cut the turn — require several words of speech.
 */
function isSubstantiveSpeech(text: string): boolean {
  const words = text
    .toLowerCase()
    .replace(/[^a-z' ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.length >= 4;
}

// --------------------------------------------------------------------------
// Re-exports — useful typing surface for session-view.tsx
// --------------------------------------------------------------------------

export type { OrchestratorHandle, OrchestratorState, OrchestratorPhase };
