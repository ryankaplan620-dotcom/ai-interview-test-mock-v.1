/**
 * Shared pipeline types.
 *
 * Safe to import from both server and client. No side effects, no secrets.
 * All wire formats between client ↔ API routes ↔ external services live here.
 */

import type { PersonaId, InterviewType, SessionMode } from "@/types/supabase";
import type { InterviewMode } from "@/lib/personas/types";

// --------------------------------------------------------------------------
// Conversation shape
// --------------------------------------------------------------------------

export interface ConversationTurn {
  /** `user` = the candidate (interviewee). `assistant` = the interviewer persona. */
  role: "user" | "assistant";
  /** Finalised text of the turn. Never partial. */
  content: string;
  /** Milliseconds since call start when the turn began. */
  startedAtMs: number;
  /** Milliseconds since call start when the turn ended (set once finalised). */
  endedAtMs: number | null;
}

export interface ConversationContext {
  /** Session ID (DB). */
  sessionId: string;
  /** Persona identity. */
  personaId: PersonaId;
  /** Interview type (drives question-bank routing). */
  interviewType: InterviewType;
  /** Difficulty overlay. */
  mode: SessionMode;
  /** Target firm (optional, Pro+ firm calibration). */
  targetFirm?: string | null;
  /** Target role (optional). */
  targetRole?: string | null;
  /** Candidate's first name, if we know it. */
  candidateFirstName?: string | null;
  /** Target duration in minutes — the persona paces against this. */
  targetDurationMinutes: number;
}

// --------------------------------------------------------------------------
// Turn-request payload: client → /api/interview/turn
// --------------------------------------------------------------------------

export interface TurnRequestPayload {
  ctx: ConversationContext;
  /** Full conversation so far, oldest → newest. */
  history: ConversationTurn[];
  /**
   * If true, this is the very first turn (the persona's opening move).
   * History should be empty when this is true.
   */
  isOpening?: boolean;
}

// --------------------------------------------------------------------------
// SSE frame format — server → client stream
// --------------------------------------------------------------------------

export type StreamEvent =
  | { type: "start"; turnStartedAtMs: number }
  | { type: "text"; delta: string }
  | { type: "sentence"; sentence: string; sentenceIndex: number }
  | { type: "done"; fullText: string; turnEndedAtMs: number }
  | { type: "error"; error: string };

// --------------------------------------------------------------------------
// Orchestrator phase machine — drives the session UI
// --------------------------------------------------------------------------

export type OrchestratorPhase =
  | "idle" // before start()
  | "connecting" // setting up clients + opening priming
  | "speaking" // interviewer is speaking (TTS playing / avatar lip-syncing)
  | "listening" // user is speaking (STT capturing)
  | "thinking" // user finished, Claude is generating
  | "ending" // end() called, cleaning up
  | "ended"
  | "error";

export interface OrchestratorState {
  phase: OrchestratorPhase;
  /** Finalised conversation turns. */
  transcript: ConversationTurn[];
  /** The interviewer line currently being spoken (grows as text streams). */
  currentInterviewerLine: string | null;
  /** The user's current in-progress transcription (interim, not finalised). */
  currentUserInterim: string | null;
  /** User-visible error message if phase === 'error'. */
  error: string | null;
  /** Milliseconds since call start (updated on every tick). */
  elapsedMs: number;
}

// --------------------------------------------------------------------------
// Client ↔ orchestrator control
// --------------------------------------------------------------------------

export interface OrchestratorHandle {
  start(): Promise<void>;
  end(reason: "completed" | "abandoned" | "error"): Promise<void>;
  setMicEnabled(enabled: boolean): void;
  setCameraEnabled(enabled: boolean): void;
  /** Subscribe to state updates. Returns an unsubscribe fn. */
  subscribe(cb: (s: OrchestratorState) => void): () => void;
  getState(): OrchestratorState;
  /** Dev/mock-mode only: push a user turn as if STT produced it. No-op in real mode. */
  mockSubmitUserTurn(text: string): void;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Map the DB's SessionMode to the personas layer's InterviewMode.
 * These are structurally identical; this helper exists so other layers don't
 * accidentally depend on either enum directly.
 */
export function toInterviewMode(m: SessionMode): InterviewMode {
  return m;
}
