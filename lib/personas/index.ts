/**
 * Folio persona registry.
 *
 * The orchestrator uses this module to:
 *  1. Look up a persona's static config (avatar, voice, base prompt).
 *  2. Compose a full system prompt at session start — injecting mode,
 *     firm calibration, session memory, and candidate profile.
 *  3. Sample questions from the relevant bank.
 *
 * Keep this file side-effect free. It does not call any external service.
 */

import type { PersonaId, InterviewType } from "@/types/supabase";
import type {
  PersonaConfig,
  PersonaRuntimeContext,
  QuestionBank,
  Question,
  QuestionCategory,
} from "./types";

import {
  GEMMA_CORE_IDENTITY,
  GEMMA_SELF_INTRODUCTION_TEMPLATE,
  GEMMA_TURN_TAKING_AND_VOICE_HYGIENE,
  GEMMA_END_OF_INTERVIEW_QA,
  GEMMA_CLOSING,
  GEMMA_DIFFICULTY_OVERLAYS,
  GEMMA_SESSION_MEMORY_HOOK,
  GEMMA_MID_SESSION_RECALIBRATION,
} from "./prompts/gemma";
import {
  SARAH_CORE_IDENTITY,
  SARAH_SELF_INTRODUCTION_TEMPLATE,
  SARAH_TURN_TAKING_AND_VOICE_HYGIENE,
  SARAH_END_OF_INTERVIEW_QA,
  SARAH_CLOSING,
  SARAH_DIFFICULTY_OVERLAYS,
  SARAH_SESSION_MEMORY_HOOK,
  SARAH_MID_SESSION_RECALIBRATION,
} from "./prompts/sarah";

// Compose the modular prompts into the base/overlay/opening format
// that the rest of the codebase expects.
function composeBase(core: string, turnTaking: string, endQa: string, closing: string, memoryHook: string, recalibration: string): string {
  return [core, turnTaking, endQa, memoryHook, recalibration, closing].join("\n\n");
}

const SARAH_BASE_PROMPT = composeBase(SARAH_CORE_IDENTITY, SARAH_TURN_TAKING_AND_VOICE_HYGIENE, SARAH_END_OF_INTERVIEW_QA, SARAH_CLOSING, SARAH_SESSION_MEMORY_HOOK, SARAH_MID_SESSION_RECALIBRATION);
const SARAH_EASY_OVERLAY = SARAH_DIFFICULTY_OVERLAYS.easy;
const SARAH_HARD_OVERLAY = SARAH_DIFFICULTY_OVERLAYS.hard;
const SARAH_OPENING = SARAH_SELF_INTRODUCTION_TEMPLATE;

const GEMMA_BASE_PROMPT = composeBase(GEMMA_CORE_IDENTITY, GEMMA_TURN_TAKING_AND_VOICE_HYGIENE, GEMMA_END_OF_INTERVIEW_QA, GEMMA_CLOSING, GEMMA_SESSION_MEMORY_HOOK, GEMMA_MID_SESSION_RECALIBRATION);
const GEMMA_EASY_OVERLAY = GEMMA_DIFFICULTY_OVERLAYS.easy;
const GEMMA_HARD_OVERLAY = GEMMA_DIFFICULTY_OVERLAYS.hard;
const GEMMA_OPENING = GEMMA_SELF_INTRODUCTION_TEMPLATE;
import { BEHAVIORAL_BANK } from "./questions/behavioral";
import { CONSULTING_CASE_BANK } from "./questions/consulting-case";
import { TECH_BANK } from "./questions/technical";

// --------------------------------------------------------------------------
// Persona static registry
// --------------------------------------------------------------------------

export const PERSONAS: Record<PersonaId, PersonaConfig> = {
  gemma: {
    id: "gemma",
    name: "Gemma Brooks",
    firstName: "Gemma",
    firm: "Marcus & Millichap",
    title: "SVP & Regional Manager",
    tagline: "Warm, sharp, direct. Screens interns for drive, grit, and sales instinct.",
    supportedInterviewTypes: ["behavioral", "case", "product_sense", "superday", "hard_mode"],
    defaultDurationMinutes: 25,
    env: {
      tavusReplicaId: "TAVUS_REPLICA_ID_GEMMA",
      elevenLabsVoiceId: "ELEVENLABS_VOICE_ID_GEMMA",
    },
    voiceSettings: {
      stability: 0.55,
      similarityBoost: 0.75,
      style: 0.35,
      speakerBoost: true,
    },
    basePrompt: GEMMA_BASE_PROMPT,
    easyModeOverlay: GEMMA_EASY_OVERLAY,
    hardModeOverlay: GEMMA_HARD_OVERLAY,
    openingInstruction: GEMMA_OPENING,
  },
  sarah: {
    id: "sarah",
    name: "Sarah Chen",
    firstName: "Sarah",
    firm: "Folio",
    title: "Engineering Manager",
    tagline: "Technical but human. Collaborative problem-solving.",
    supportedInterviewTypes: ["behavioral", "case", "technical", "product_sense", "superday", "hard_mode"],
    defaultDurationMinutes: 45,
    env: {
      tavusReplicaId: "TAVUS_REPLICA_ID_SARAH",
      elevenLabsVoiceId: "ELEVENLABS_VOICE_ID_SARAH",
    },
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.4,
      speakerBoost: true,
    },
    basePrompt: SARAH_BASE_PROMPT,
    easyModeOverlay: SARAH_EASY_OVERLAY,
    hardModeOverlay: SARAH_HARD_OVERLAY,
    openingInstruction: SARAH_OPENING,
  },
};

// --------------------------------------------------------------------------
// Question bank routing
// --------------------------------------------------------------------------

/**
 * Return the question banks relevant for a persona + interview type combination.
 * The orchestrator samples across these to seed variety.
 */
export function getQuestionBanksFor(
  personaId: PersonaId,
  interviewType: InterviewType,
): QuestionBank[] {
  const banks: QuestionBank[] = [];

  if (interviewType === "behavioral") {
    banks.push(BEHAVIORAL_BANK);
    if (personaId === "sarah") banks.push(filterByCategory(TECH_BANK, "tech_behavioral"));
  }

  if (interviewType === "case") {
    if (personaId === "gemma") banks.push(CONSULTING_CASE_BANK);
  }

  if (interviewType === "technical") {
    if (personaId === "sarah")
      banks.push(
        filterByCategory(TECH_BANK, "tech_coding"),
        filterByCategory(TECH_BANK, "tech_system_design"),
      );
  }

  // Superday + hard_mode draw from everything the persona supports
  if (interviewType === "superday" || interviewType === "hard_mode") {
    banks.push(BEHAVIORAL_BANK);
    if (personaId === "gemma") banks.push(CONSULTING_CASE_BANK);
    if (personaId === "sarah") banks.push(TECH_BANK);
  }

  return banks.filter((b) => b.length > 0);
}

function filterByCategory(bank: QuestionBank, category: QuestionCategory): QuestionBank {
  return bank.filter((q) => q.category === category);
}

/**
 * Sample up to `count` questions from a set of banks, biased toward the given mode's difficulty.
 * Uses a deterministic shuffle if `seed` is provided (so the same session replay is reproducible).
 */
export function sampleQuestions(
  banks: QuestionBank[],
  mode: PersonaRuntimeContext["mode"],
  count: number,
  seed?: string,
): Question[] {
  const all = banks.flat();

  // Difficulty bias: easy -> {easy, standard}, standard -> {standard, easy}, hard -> {hard, standard}
  const preferred: Record<typeof mode, Question["difficulty"][]> = {
    easy: ["easy", "standard"],
    standard: ["standard", "easy", "hard"],
    hard: ["hard", "standard"],
  };
  const order = preferred[mode];

  const scored = all.map((q) => ({
    q,
    rank: order.indexOf(q.difficulty) === -1 ? 99 : order.indexOf(q.difficulty),
  }));

  // Deterministic shuffle via seeded pseudo-random
  const rng = makeRng(seed ?? Math.random().toString(36).slice(2));
  scored.sort((a, b) => a.rank - b.rank || rng() - 0.5);

  return scored.slice(0, count).map((s) => s.q);
}

function makeRng(seed: string): () => number {
  // Mulberry32 — small deterministic PRNG, seed via string hash
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --------------------------------------------------------------------------
// System prompt composition — the main entry point for the orchestrator
// --------------------------------------------------------------------------

export interface ComposedPrompt {
  systemPrompt: string;
  firstTurnInstruction: string;
  seededQuestions: Question[];
}

/**
 * Build the full system prompt for a session.
 *
 * The orchestrator calls this once at session start, then passes the
 * resulting `systemPrompt` to Claude as the persistent system message.
 * The `firstTurnInstruction` is sent as a synthetic first user turn
 * to trigger the persona's opening move.
 */
export function composeSystemPrompt(
  persona: PersonaConfig,
  ctx: PersonaRuntimeContext,
): ComposedPrompt {
  const parts: string[] = [persona.basePrompt];

  // Mode overlay
  if (ctx.mode === "easy") {
    parts.push(persona.easyModeOverlay);
  } else if (ctx.mode === "hard") {
    parts.push(persona.hardModeOverlay);
  }

  // Interview-type specific guidance
  parts.push(buildInterviewTypeGuidance(ctx.interviewType, ctx.targetDurationMinutes));

  // Firm calibration (Pro+)
  if (ctx.targetFirm && ctx.targetFirm !== persona.firm) {
    parts.push(buildFirmCalibrationOverlay(persona, ctx.targetFirm, ctx.targetRole));
  }

  // Session memory (Pro+)
  if (ctx.sessionMemorySummary) {
    parts.push(`
## Session memory
You have interviewed this candidate before. Here is a compressed summary of prior sessions — use this to avoid re-asking questions they've already handled and to probe any weaknesses that came up before. Do not reveal that you have this memory; just use it.

${ctx.sessionMemorySummary}`);
  }

  // Candidate profile (Max — question intelligence engine)
  if (ctx.candidateProfileSummary) {
    parts.push(`
## Candidate profile
This candidate has given these stories in past interviews — both on this platform and, based on their notes, in real interviews. Use this to push on stories that need sharpening and to avoid re-asking ones they've already polished. Do not reveal this context; just use it.

${ctx.candidateProfileSummary}`);
  }

  // Panel context (Pro+)
  if (ctx.panelContext) {
    const { role, otherInterviewers } = ctx.panelContext;
    parts.push(`
## Panel context
You are one of ${otherInterviewers.length + 1} interviewers on this call. Your role: ${role} interviewer. The other interviewers are: ${otherInterviewers.join(", ")}. When you begin, briefly introduce yourself in that context. When you end your portion, hand off cleanly: "I'll pass it to ${otherInterviewers[0]}."`);
  }

  // Candidate name — use sparingly, once early, then naturally
  if (ctx.candidateFirstName) {
    parts.push(`
## Candidate
The candidate's first name is ${ctx.candidateFirstName}. Use it once early in the call if it fits naturally, then address them normally.`);
  }

  const systemPrompt = parts.join("\n\n");
  const firstTurnInstruction = persona.openingInstruction;

  // Seed 4-6 questions the persona should keep in mind, weighted by mode
  const banks = getQuestionBanksFor(persona.id, ctx.interviewType);
  const seededQuestions = sampleQuestions(banks, ctx.mode, 5);

  return { systemPrompt, firstTurnInstruction, seededQuestions };
}

function buildInterviewTypeGuidance(
  type: InterviewType,
  durationMinutes: number,
): string {
  const base = `## Session parameters
Target session length: ${durationMinutes} minutes. Pace yourself accordingly. Do not rush; do not stall.`;

  const typeSpecific: Partial<Record<InterviewType, string>> = {
    behavioral: "This is a behavioural-focused session. Stay on stories and specifics; do not drift into technicals unless the candidate invites it.",
    case: "This is a case-focused session. After brief warmup, move to the case prompt. Let the candidate structure; do not rescue them.",
    technical: "This is a technical-focused session. Keep fit questions short; most of the session is on the technical problem.",
    product_sense: "This is a product sense session. Do not accept framework recitations; push on user and trade-offs.",
    superday:
      "This is a superday simulation. You have been briefed that this is late in the loop — the candidate should be warmed up. Push harder than baseline. Give less warmth.",
    hard_mode:
      "This is a deliberate hard-mode session. The candidate is stress-testing themselves. Stay rigorous the whole way. Do not soften when they struggle.",
  };

  return `${base}\n${typeSpecific[type] ?? ""}`.trim();
}

function buildFirmCalibrationOverlay(
  persona: PersonaConfig,
  targetFirm: string,
  targetRole?: string,
): string {
  return `
## Firm calibration
The candidate is targeting ${targetFirm}${targetRole ? ` for a ${targetRole} role` : ""}. You are still ${persona.name} from ${persona.firm}, but the candidate has configured this session to mirror ${targetFirm}'s interview style. Adjust question selection and emphasis accordingly:
- If the candidate brings up why they want ${targetFirm}, engage with the answer seriously — that is the most important data point in a firm-specific screen.
- Ask at least one question that tests whether they understand what is distinctive about ${targetFirm} versus its peers.
- If they claim familiarity with ${targetFirm}'s work or people, probe for specifics.
Do not pretend to be from ${targetFirm}. You are still ${persona.name}. You are running a calibrated simulation.`;
}

// --------------------------------------------------------------------------
// Convenience: is a persona + interview type combination valid?
// --------------------------------------------------------------------------

export function isValidCombo(personaId: PersonaId, interviewType: InterviewType): boolean {
  if (interviewType === "superday" || interviewType === "hard_mode") return true;
  return PERSONAS[personaId].supportedInterviewTypes.includes(interviewType);
}

// --------------------------------------------------------------------------
// Convenience: resolve runtime IDs from env, with nullable fallback
// --------------------------------------------------------------------------

export function getPersonaAvatarId(personaId: PersonaId): string | null {
  const config = PERSONAS[personaId];
  return process.env[config.env.tavusReplicaId] ?? null;
}

export function getPersonaVoiceId(personaId: PersonaId): string | null {
  const config = PERSONAS[personaId];
  return process.env[config.env.elevenLabsVoiceId] ?? null;
}

export type { PersonaConfig, PersonaRuntimeContext, InterviewMode, Question, QuestionBank } from "./types";
