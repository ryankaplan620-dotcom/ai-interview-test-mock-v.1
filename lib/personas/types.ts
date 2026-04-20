/**
 * Persona type definitions.
 *
 * A "persona" is one of Folio's five interviewers. Each has:
 *  - A Simli avatar (rendered video)
 *  - An ElevenLabs voice (synthesised audio)
 *  - A Claude system prompt (intelligence and personality)
 *  - Firm/role tagging for routing
 *  - A roster of interview types they natively run
 *
 * The registry in ./index.ts composes all of these at runtime.
 */

import type { PersonaId, InterviewType } from "@/types/supabase";

// --------------------------------------------------------------------------
// Runtime context — what the orchestrator knows when the call begins
// --------------------------------------------------------------------------

export type InterviewMode = "easy" | "standard" | "hard";

export interface PersonaRuntimeContext {
  /** Difficulty setting. `hard` is the Max-tier True Hard Mode. */
  mode: InterviewMode;

  /** Interview format for this session. */
  interviewType: InterviewType;

  /** Candidate-facing name (from profile) — the interviewer addresses them directly. */
  candidateFirstName?: string;

  /** Target firm (Pro+: firm calibration). */
  targetFirm?: string;

  /** Target role (Pro+: firm calibration). */
  targetRole?: string;

  /**
   * Compressed summary of the candidate's prior sessions.
   * Pro+ session memory surface. Omitted on Trial / Student / General.
   */
  sessionMemorySummary?: string;

  /**
   * Question intelligence engine context — what the candidate has been asked
   * before, what they struggled with, what their strongest stories are.
   * Max-tier only.
   */
  candidateProfileSummary?: string;

  /**
   * Panel mode: this persona is one of multiple interviewers on the call.
   * Alters opening and handoff behaviour. Pro+ only.
   */
  panelContext?: {
    isPanel: true;
    role: "lead" | "second" | "third";
    otherInterviewers: string[]; // first names of co-interviewers
  };

  /** Target session duration in minutes. Drives pacing. */
  targetDurationMinutes: number;
}

// --------------------------------------------------------------------------
// Persona static config
// --------------------------------------------------------------------------

export interface PersonaConfig {
  id: PersonaId;

  /** Full display name. */
  name: string;
  /** First name — what the candidate calls them. */
  firstName: string;

  /** Firm (display). */
  firm: string;
  /** Role at the firm (display). */
  title: string;

  /** One-line descriptor for pickers. */
  tagline: string;

  /** Which interview formats this persona can natively run. */
  supportedInterviewTypes: InterviewType[];

  /** Typical session length in minutes. */
  defaultDurationMinutes: number;

  /** Env var keys for avatar + voice IDs. */
  env: {
    simliAvatarId: string; // e.g. "SIMLI_AVATAR_ID_LUKE"
    elevenLabsVoiceId: string; // e.g. "ELEVENLABS_VOICE_ID_LUKE"
  };

  /** Voice settings tuned per persona — ElevenLabs stability/similarity. */
  voiceSettings: {
    stability: number; // 0-1
    similarityBoost: number; // 0-1
    style: number; // 0-1
    speakerBoost: boolean;
  };

  /** Base system prompt — the persona's character. Mode instructions get composed in. */
  basePrompt: string;

  /** Hard-mode overlay — what changes when Max tier activates True Hard Mode. */
  hardModeOverlay: string;

  /** Easy-mode overlay — gentler framing for first-time candidates. */
  easyModeOverlay: string;

  /** Opening move — persona-specific instruction for how the call begins. */
  openingInstruction: string;
}

// --------------------------------------------------------------------------
// Question bank types (seed variety for the orchestrator)
// --------------------------------------------------------------------------

export type QuestionCategory =
  | "behavioral"
  | "consulting_case"
  | "banking_fit"
  | "banking_technical"
  | "tech_behavioral"
  | "tech_coding"
  | "tech_system_design"
  | "pe_fit"
  | "pe_technical"
  | "product_sense"
  | "product_strategy";

export interface Question {
  id: string;
  category: QuestionCategory;
  prompt: string;
  /** Follow-ups the persona should lean toward if the candidate answers. */
  followups?: string[];
  /** Difficulty tier — persona selects up or down based on mode. */
  difficulty: "easy" | "standard" | "hard";
  /** Optional firm tags — lets firm calibration select firm-specific questions. */
  firmTags?: string[];
  /** Free-text tags for retrieval (e.g. "leadership", "failure", "disagreement"). */
  tags: string[];
}

export type QuestionBank = Question[];
