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
  PRIYA_BASE_PROMPT,
  PRIYA_EASY_OVERLAY,
  PRIYA_HARD_OVERLAY,
  PRIYA_OPENING,
} from "./prompts/priya";
import {
  MARCUS_BASE_PROMPT,
  MARCUS_EASY_OVERLAY,
  MARCUS_HARD_OVERLAY,
  MARCUS_OPENING,
} from "./prompts/marcus";
import {
  SARAH_BASE_PROMPT,
  SARAH_EASY_OVERLAY,
  SARAH_HARD_OVERLAY,
  SARAH_OPENING,
} from "./prompts/sarah";
import {
  DAVID_BASE_PROMPT,
  DAVID_EASY_OVERLAY,
  DAVID_HARD_OVERLAY,
  DAVID_OPENING,
} from "./prompts/david";
import {
  JENNIFER_BASE_PROMPT,
  JENNIFER_EASY_OVERLAY,
  JENNIFER_HARD_OVERLAY,
  JENNIFER_OPENING,
} from "./prompts/jennifer";

import { BEHAVIORAL_BANK } from "./questions/behavioral";
import { CONSULTING_CASE_BANK } from "./questions/consulting-case";
import { BANKING_BANK } from "./questions/banking";
import { TECH_BANK } from "./questions/technical";
import { PE_FINANCE_BANK } from "./questions/pe-finance";
import { PRODUCT_SENSE_BANK } from "./questions/product-sense";

// --------------------------------------------------------------------------
// Persona static registry
// --------------------------------------------------------------------------

export const PERSONAS: Record<PersonaId, PersonaConfig> = {
  priya: {
    id: "priya",
    name: "Priya Patel",
    firstName: "Priya",
    firm: "McKinsey & Company",
    title: "Senior Recruiter",
    tagline: "Consulting behavioral and case screens.",
    supportedInterviewTypes: ["behavioral", "case"],
    defaultDurationMinutes: 30,
    env: {
      tavusReplicaId: "TAVUS_REPLICA_ID_PRIYA",
      elevenLabsVoiceId: "ELEVENLABS_VOICE_ID_PRIYA",
    },
    voiceSettings: {
      stability: 0.55,
      similarityBoost: 0.75,
      style: 0.35,
      speakerBoost: true,
    },
    basePrompt: PRIYA_BASE_PROMPT,
    easyModeOverlay: PRIYA_EASY_OVERLAY,
    hardModeOverlay: PRIYA_HARD_OVERLAY,
    openingInstruction: PRIYA_OPENING,
  },
  marcus: {
    id: "marcus",
    name: "Marcus Hale",
    firstName: "Marcus",
    firm: "Goldman Sachs",
    title: "Managing Director",
    tagline: "Banking behavioral plus foundational technicals.",
    supportedInterviewTypes: ["behavioral", "technical"],
    defaultDurationMinutes: 30,
    env: {
      tavusReplicaId: "TAVUS_REPLICA_ID_MARCUS",
      elevenLabsVoiceId: "ELEVENLABS_VOICE_ID_MARCUS",
    },
    voiceSettings: {
      stability: 0.6,
      similarityBoost: 0.8,
      style: 0.2,
      speakerBoost: true,
    },
    basePrompt: MARCUS_BASE_PROMPT,
    easyModeOverlay: MARCUS_EASY_OVERLAY,
    hardModeOverlay: MARCUS_HARD_OVERLAY,
    openingInstruction: MARCUS_OPENING,
  },
  sarah: {
    id: "sarah",
    name: "Sarah Chen",
    firstName: "Sarah",
    firm: "Meta",
    title: "Engineering Manager",
    tagline: "Tech behavioral and coding problems, walk-through style.",
    supportedInterviewTypes: ["behavioral", "technical"],
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
  david: {
    id: "david",
    name: "Danielle Carter",
    firstName: "David",
    firm: "Bain Capital",
    title: "Partner",
    tagline: "PE deal walkthroughs, thesis pitches, LBO conceptuals.",
    supportedInterviewTypes: ["behavioral", "technical"],
    defaultDurationMinutes: 30,
    env: {
      tavusReplicaId: "TAVUS_REPLICA_ID_DAVID",
      elevenLabsVoiceId: "ELEVENLABS_VOICE_ID_DAVID",
    },
    voiceSettings: {
      stability: 0.65,
      similarityBoost: 0.8,
      style: 0.15,
      speakerBoost: true,
    },
    basePrompt: DAVID_BASE_PROMPT,
    easyModeOverlay: DAVID_EASY_OVERLAY,
    hardModeOverlay: DAVID_HARD_OVERLAY,
    openingInstruction: DAVID_OPENING,
  },
  jennifer: {
    id: "jennifer",
    name: "Jennifer Ortiz",
    firstName: "Jen",
    firm: "Stripe",
    title: "Product Lead",
    tagline: "Product sense cases and strategy conversations.",
    supportedInterviewTypes: ["behavioral", "product_sense"],
    defaultDurationMinutes: 45,
    env: {
      tavusReplicaId: "TAVUS_REPLICA_ID_JENNIFER",
      elevenLabsVoiceId: "ELEVENLABS_VOICE_ID_JENNIFER",
    },
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.45,
      speakerBoost: true,
    },
    basePrompt: JENNIFER_BASE_PROMPT,
    easyModeOverlay: JENNIFER_EASY_OVERLAY,
    hardModeOverlay: JENNIFER_HARD_OVERLAY,
    openingInstruction: JENNIFER_OPENING,
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
    if (personaId === "priya") banks.push(CONSULTING_CASE_BANK);
  }

  if (interviewType === "technical") {
    if (personaId === "marcus")
      banks.push(filterByCategory(BANKING_BANK, "banking_technical"), filterByCategory(BANKING_BANK, "banking_fit"));
    if (personaId === "sarah")
      banks.push(
        filterByCategory(TECH_BANK, "tech_coding"),
        filterByCategory(TECH_BANK, "tech_system_design"),
      );
    if (personaId === "david")
      banks.push(filterByCategory(PE_FINANCE_BANK, "pe_technical"), filterByCategory(PE_FINANCE_BANK, "pe_fit"));
  }

  if (interviewType === "product_sense") {
    if (personaId === "jennifer")
      banks.push(
        filterByCategory(PRODUCT_SENSE_BANK, "product_sense"),
        filterByCategory(PRODUCT_SENSE_BANK, "product_strategy"),
      );
  }

  // Superday + hard_mode draw from everything the persona supports
  if (interviewType === "superday" || interviewType === "hard_mode") {
    banks.push(BEHAVIORAL_BANK);
    if (personaId === "priya") banks.push(CONSULTING_CASE_BANK);
    if (personaId === "marcus") banks.push(BANKING_BANK);
    if (personaId === "sarah") banks.push(TECH_BANK);
    if (personaId === "david") banks.push(PE_FINANCE_BANK);
    if (personaId === "jennifer") banks.push(PRODUCT_SENSE_BANK);
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
