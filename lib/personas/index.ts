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
  SARAH_INTERVIEW_TYPE_MODULES,
  SARAH_COMPANY_CALIBRATION_INJECTION,
} from "./prompts/sarah";

// Compose the modular prompts into the base/overlay/opening format that the
// rest of the codebase expects. The memory hook is NOT baked in here — it is
// injected by composeSystemPrompt only when a memory summary actually exists,
// with its {{SESSION_MEMORY}} placeholder filled.
function composeBase(core: string, turnTaking: string, endQa: string, closing: string, recalibration: string): string {
  return [core, turnTaking, endQa, recalibration, closing].join("\n\n");
}

const SARAH_BASE_PROMPT = composeBase(SARAH_CORE_IDENTITY, SARAH_TURN_TAKING_AND_VOICE_HYGIENE, SARAH_END_OF_INTERVIEW_QA, SARAH_CLOSING, SARAH_MID_SESSION_RECALIBRATION);
const SARAH_EASY_OVERLAY = SARAH_DIFFICULTY_OVERLAYS.easy;
const SARAH_HARD_OVERLAY = SARAH_DIFFICULTY_OVERLAYS.hard;
const SARAH_OPENING = SARAH_SELF_INTRODUCTION_TEMPLATE;

const GEMMA_BASE_PROMPT = composeBase(GEMMA_CORE_IDENTITY, GEMMA_TURN_TAKING_AND_VOICE_HYGIENE, GEMMA_END_OF_INTERVIEW_QA, GEMMA_CLOSING, GEMMA_MID_SESSION_RECALIBRATION);
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
    standardModeOverlay: GEMMA_DIFFICULTY_OVERLAYS.standard,
    sessionMemoryHook: GEMMA_SESSION_MEMORY_HOOK,
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
    standardModeOverlay: SARAH_DIFFICULTY_OVERLAYS.normal,
    trueHardOverlay: SARAH_DIFFICULTY_OVERLAYS.true_hard,
    interviewTypeModules: {
      behavioral: SARAH_INTERVIEW_TYPE_MODULES.behavioral,
      technical: SARAH_INTERVIEW_TYPE_MODULES.technical,
      case: SARAH_INTERVIEW_TYPE_MODULES.case,
      superday: SARAH_INTERVIEW_TYPE_MODULES.mixed,
      hard_mode: SARAH_INTERVIEW_TYPE_MODULES.mixed,
    },
    sessionMemoryHook: SARAH_SESSION_MEMORY_HOOK,
    companyIntelHook: SARAH_COMPANY_CALIBRATION_INJECTION,
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
 * Shared live-voice realism rules. Persona-agnostic; appended to every
 * composed prompt. Persona-specific hygiene (em-dash policy, register) stays
 * in each persona's own files — nothing here may contradict those.
 */
const VOICE_REALISM_BLOCK = `
## Live voice channel
You are on a live voice call. What arrives as the candidate's words is an automatic transcription of their speech, and your words are synthesized aloud. This changes how you read and how you speak.

Reading the candidate:
The transcription will contain mis-heard words, homophones (a transcript might say "cash" when they said "cache", "sequel" for "SQL"), missing punctuation, and cut-off fragments. Silently read through small garbles to the obvious intended meaning. Never mention transcription, spelling, "typos," or audio artifacts; from your side you simply heard them speak.
If something load-bearing is genuinely ambiguous, do what a person on a call does: "Sorry, you cut out for a second there. Say that last part again?" Use this sparingly, only when the meaning actually matters.
Filler in their speech ("um," "like," repeated words) is normal speech, not a mistake. Ignore it unless a skill focus says otherwise.

Stage notes:
Lines in square brackets inside the conversation (time checks, direction notes) are silent context for you. They are not the candidate speaking. Never read them aloud, reference them, or acknowledge them in any way.

Time:
When a time note tells you how far into the call you are, pace like a person with a calendar: a glance, not a countdown. If time is short, start landing the plane the way a real interviewer does, mid-thread if needed: "I'm watching the clock, I want to leave room for your questions."

Being interrupted:
If one of your earlier turns in the conversation ends with "—", the candidate started talking over you and you stopped, like a person would. Do not restart the cut-off sentence. Respond to what they said. Return to your earlier thread only if it still matters.

Sounding alive:
Real speech is uneven. Some turns are two words. Occasionally rethink out loud, at most once or twice a session: "Actually, wait. Let me ask that differently."
Never open consecutive turns with the same word. Never acknowledge two answers in a row the same way; sometimes the strongest move is no acknowledgment, straight to the next thing.
React to the specific thing they just said before moving anywhere new. A reaction that names a detail beats a generic one every time.
`.trim();

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

  // Mode overlay — every mode now has an explicit register
  if (ctx.mode === "easy") {
    parts.push(persona.easyModeOverlay);
  } else if (ctx.mode === "hard") {
    parts.push(persona.hardModeOverlay);
  } else if (persona.standardModeOverlay) {
    parts.push(persona.standardModeOverlay);
  }

  // The deliberate hard_mode format stacks the persona's most adversarial
  // register on top of whatever mode is set (without doubling the hard overlay).
  if (ctx.interviewType === "hard_mode") {
    const stacked = persona.trueHardOverlay ?? (ctx.mode !== "hard" ? persona.hardModeOverlay : undefined);
    if (stacked) parts.push(stacked);
  }

  // Interview-type guidance — persona-authored module when one exists,
  // generic one-liner otherwise
  parts.push(
    buildInterviewTypeGuidance(
      ctx.interviewType,
      ctx.targetDurationMinutes,
      persona.interviewTypeModules?.[ctx.interviewType],
    ),
  );

  // Firm calibration (Pro+)
  if (ctx.targetFirm && ctx.targetFirm !== persona.firm) {
    parts.push(buildFirmCalibrationOverlay(persona, ctx.targetFirm, ctx.targetRole));
  }

  // Company intelligence digest (Pro+) — through the persona's own hook so the
  // material lands in their voice, with a generic fallback
  if (ctx.companyIntelSummary) {
    if (persona.companyIntelHook) {
      parts.push(fillBlock(persona.companyIntelHook, "COMPANY_INTEL", ctx.companyIntelSummary));
    } else {
      parts.push(`
## Company briefing
What you know about the candidate's target firm. Use it to flavor questions and ground your answers; never recite it, and never invent specifics beyond it.

${ctx.companyIntelSummary}`);
    }
  }

  // Session memory (Pro+) — through the persona's own hook
  if (ctx.sessionMemorySummary) {
    if (persona.sessionMemoryHook) {
      parts.push(fillBlock(persona.sessionMemoryHook, "SESSION_MEMORY", ctx.sessionMemorySummary));
    } else {
      parts.push(`
## Session memory
You have interviewed this candidate before. Here is a compressed summary of prior sessions — use this to avoid re-asking questions they've already handled and to probe any weaknesses that came up before. Do not reveal that you have this memory; just use it.

${ctx.sessionMemorySummary}`);
    }
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
  } else {
    parts.push(`
## Candidate
You have not been given the candidate's name. Where any script or example references {{CANDIDATE_FIRST_NAME}}, just speak naturally without a name — or ask for it in the greeting the way a person would, and use what they give you.`);
  }

  // Seed questions the persona keeps in mind — stable per session so the
  // reserve doesn't shift between turns (and the prompt cache holds)
  const banks = getQuestionBanksFor(persona.id, ctx.interviewType);
  const seededQuestions = sampleQuestions(banks, ctx.mode, 5, ctx.sessionSeed);
  if (seededQuestions.length > 0) {
    const lines = seededQuestions.map((q) => {
      const follow = q.followups?.length ? ` (if it lands, worth pushing on: ${q.followups.join("; ")})` : "";
      return `- ${q.prompt}${follow}`;
    });
    parts.push(`
## Question material (private)
Questions you had in mind before this call, with directions worth pushing if they land. This is raw material, not an agenda. Rephrase everything into your own voice, reorder freely, skip whatever the conversation makes irrelevant. Chasing what the candidate actually just said always beats returning to this list, and the candidate must never be able to feel a list underneath the conversation.

${lines.join("\n")}`);
  }

  // Shared live-voice realism rules — always last so they're freshest in context
  parts.push(VOICE_REALISM_BLOCK);

  // Resolve template variables across the whole composed prompt + opening
  const vars = buildTemplateVars(persona, ctx);
  const systemPrompt = fillTemplate(parts.join("\n\n"), vars);
  const firstTurnInstruction = fillTemplate(persona.openingInstruction, vars);

  return { systemPrompt, firstTurnInstruction, seededQuestions };
}

// --------------------------------------------------------------------------
// Template resolution
// --------------------------------------------------------------------------

const INTERVIEW_TYPE_SPOKEN_LABELS: Record<InterviewType, string> = {
  behavioral: "behavioral",
  case: "case",
  technical: "technical",
  product_sense: "product sense",
  superday: "final-round",
  hard_mode: "mixed",
};

/**
 * Values for the {{TOKENS}} that appear in persona prompt files. Inline
 * narrative tokens (SESSION_MEMORY, COMPANY_INTEL) resolve to short readable
 * phrases here — their full payloads are injected as blocks via fillBlock.
 * Unknown tokens ({{SYSTEM}}, {{PROJECT}}, ...) are illustrative slots inside
 * example lines and are left untouched.
 */
function buildTemplateVars(
  persona: PersonaConfig,
  ctx: PersonaRuntimeContext,
): Record<string, string> {
  const vars: Record<string, string> = {
    COMPANY: ctx.targetFirm ?? persona.firm,
    ROLE: ctx.targetRole ?? "engineering",
    INTERVIEW_TYPE: INTERVIEW_TYPE_SPOKEN_LABELS[ctx.interviewType] ?? ctx.interviewType,
    DURATION_MINUTES: String(ctx.targetDurationMinutes),
    SESSION_MEMORY: "your session memory",
    COMPANY_INTEL: "your company briefing",
  };
  if (ctx.candidateFirstName) {
    vars.CANDIDATE_FIRST_NAME = ctx.candidateFirstName;
  }
  return vars;
}

function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, token: string) => vars[token] ?? match);
}

/** Replace the LAST occurrence of {{token}} — hooks mention their placeholder
 * in prose before the actual injection point at the end of the block. */
function fillBlock(hook: string, token: string, payload: string): string {
  const needle = `{{${token}}}`;
  const idx = hook.lastIndexOf(needle);
  if (idx === -1) return `${hook}\n\n${payload}`;
  return hook.slice(0, idx) + payload + hook.slice(idx + needle.length);
}

function buildInterviewTypeGuidance(
  type: InterviewType,
  durationMinutes: number,
  personaModule?: string,
): string {
  const base = `## Session parameters
Target session length: ${durationMinutes} minutes. Pace yourself accordingly. Do not rush; do not stall.`;

  if (personaModule) {
    return `${base}\n\n${personaModule}`;
  }

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
