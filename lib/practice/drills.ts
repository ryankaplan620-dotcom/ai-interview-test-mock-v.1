/**
 * Drill registry.
 *
 * Two drill types ship today: pitch_60s and pushback_drill. Each defines its
 * own prompt library + rubric. Adding a new drill type is content-only:
 * register it here, add its feedback tool to lib/practice/feedback.ts.
 */

import type { DrillType } from "@/types/supabase";

// --------------------------------------------------------------------------
// Drill-type metadata
// --------------------------------------------------------------------------

export interface DrillTypeConfig {
  id: DrillType;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  /** How many attempts per drill session. */
  targetAttempts: number;
  /** Max seconds per attempt. */
  maxAttemptSeconds: number;
  /** Is this drill type shipped? False = "coming soon" tile. */
  available: boolean;
}

export const DRILL_TYPES: Record<DrillType, DrillTypeConfig> = {
  pitch_60s: {
    id: "pitch_60s",
    name: "60-second pitch",
    shortName: "Pitch",
    tagline: "Your story in exactly one minute.",
    description:
      "One shot. Sixty seconds. A clean hook, a clear through-line, a confident landing. We measure how much of the minute you use and whether your core signal survives the compression.",
    targetAttempts: 1,
    maxAttemptSeconds: 75, // 60 + grace for cutoff
    available: true,
  },
  pause_drill: {
    id: "pause_drill",
    name: "Pause drill",
    shortName: "Pause",
    tagline: "Train yourself to pause before answering.",
    description:
      "Hard questions demand a three-second pause before you open your mouth. Strong candidates do this instinctively, weak ones rush. This drill makes it automatic.",
    targetAttempts: 10,
    maxAttemptSeconds: 120,
    available: false,
  },
  pushback_drill: {
    id: "pushback_drill",
    name: "Pushback",
    shortName: "Pushback",
    tagline: "Hold your ground when the interviewer challenges.",
    description:
      "You'll see a question and the pushback you'll get on your answer. Deliver both back-to-back — the answer, then your recovery. What you do under real-time pressure is what the final round actually tests.",
    targetAttempts: 1,
    maxAttemptSeconds: 180,
    available: true,
  },
};

// --------------------------------------------------------------------------
// 60-second pitch prompts
// --------------------------------------------------------------------------

export type PitchCategory = "opener" | "transition" | "fit" | "pitch";

export interface Pitch60sPrompt {
  id: string;
  text: string;
  category: PitchCategory;
  whatItsLookingFor: string;
}

export const PITCH_60S_PROMPTS: Pitch60sPrompt[] = [
  {
    id: "tmay",
    text: "Tell me about yourself.",
    category: "opener",
    whatItsLookingFor:
      "A clean three-beat arc: where you are now, what brought you here, why you're sitting in this room. Most candidates over-narrate the chronology — cut straight to the relevant signal.",
  },
  {
    id: "walk_resume",
    text: "Walk me through your resume.",
    category: "opener",
    whatItsLookingFor:
      "Not item-by-item — pick the through-line that connects your roles and frame each as a step on that line. Skip whatever doesn't fit the line.",
  },
  {
    id: "why_now",
    text: "Why are you making this move now?",
    category: "transition",
    whatItsLookingFor:
      "A specific push (what you've outgrown) and a specific pull (what this role offers that nothing else does). Avoid generic 'looking for new challenges' language.",
  },
  {
    id: "best_work",
    text: "Tell me about the work you've done that's most relevant for this role.",
    category: "fit",
    whatItsLookingFor:
      "One specific project that maps directly to what the role requires. Concrete about your role, the stakes, the outcome. Resist the temptation to list three.",
  },
  {
    id: "elevator",
    text: "If we had 60 seconds in an elevator — who are you and why should I hire you?",
    category: "pitch",
    whatItsLookingFor:
      "Compress yourself to a single sentence of identity, then earn it with one credibility example. Most candidates skip the identity claim — don't.",
  },
  {
    id: "pivot",
    text: "Tell me how you got from your background to wanting this role.",
    category: "transition",
    whatItsLookingFor:
      "Treat your background as an asset that translates — name the transferable skills explicitly. Don't apologize for the pivot. Frame it as a deliberate move.",
  },
];

export function getPitch60sPrompt(id: string): Pitch60sPrompt | null {
  return PITCH_60S_PROMPTS.find((p) => p.id === id) ?? null;
}

// --------------------------------------------------------------------------
// Pushback prompts
// --------------------------------------------------------------------------

export type PushbackCategory = "behavioral" | "case" | "fit" | "product";

export interface PushbackPrompt {
  id: string;
  /** The opening question. */
  initial: string;
  /** The challenge the interviewer delivers after the candidate answers. */
  pushback: string;
  category: PushbackCategory;
  whatItsLookingFor: string;
}

export const PUSHBACK_PROMPTS: PushbackPrompt[] = [
  {
    id: "weakness_dismissive",
    initial: "What's your biggest weakness?",
    pushback: "That sounds like a strength dressed up as a weakness. What's a real one?",
    category: "behavioral",
    whatItsLookingFor:
      "Concede the framing fast. Don't fight it. Have a genuine second answer ready — a real weakness with evidence of active work on it. The recovery is the whole point.",
  },
  {
    id: "team_credit",
    initial: "Tell me about your biggest accomplishment.",
    pushback: "It sounds like your team did most of that work. What did you specifically do?",
    category: "behavioral",
    whatItsLookingFor:
      "Don't get defensive. Acknowledge the team explicitly. Then name two or three specific decisions or actions that were uniquely yours. Specificity beats insistence.",
  },
  {
    id: "market_size_off",
    initial: "Estimate the size of the US coffee market.",
    pushback: "Your number is twice the actual figure. Which assumption is wrong?",
    category: "case",
    whatItsLookingFor:
      "Don't defend the number. Walk back to your assumptions, name which is most likely overstated, and re-estimate live. Show the math repair, not the math defense.",
  },
  {
    id: "design_critique",
    initial: "Walk me through your approach to this product decision.",
    pushback: "I'm not convinced — that approach would have failed at scale. What did you miss?",
    category: "product",
    whatItsLookingFor:
      "Treat it as a real critique, not a test of resolve. Name what could have failed, weigh whether you'd actually change the call, then commit — either to an updated position or to holding the original with new evidence.",
  },
  {
    id: "fit_doubt",
    initial: "Why do you want to work here?",
    pushback: "You could give that same answer to any firm. Why us specifically?",
    category: "fit",
    whatItsLookingFor:
      "Concede the critique. Have a specific second answer — something only this firm has, in your own words. The interviewer is testing whether you actually researched the firm or just the role.",
  },
  {
    id: "failure_softball",
    initial: "Tell me about a time you failed.",
    pushback: "That sounds like a learning experience, not a failure. When did something actually go wrong?",
    category: "behavioral",
    whatItsLookingFor:
      "Pivot to a genuine failure with real downside — lost opportunity, broken trust, bad outcome. Show accountability without spiraling. The recovery line matters more than the failure itself.",
  },
  {
    id: "case_recommend",
    initial: "Based on what you've seen, what would you recommend the CEO do?",
    pushback: "I asked for a recommendation, not a list of options. Pick one and defend it.",
    category: "case",
    whatItsLookingFor:
      "Commit to a single recommendation. Acknowledge what you're trading off by picking it. Defending one clear call beats hedging across three.",
  },
  {
    id: "leadership_easy",
    initial: "Tell me about a time you led a team.",
    pushback: "That sounds like coordination, not leadership. When did you actually have to influence people who disagreed with you?",
    category: "behavioral",
    whatItsLookingFor:
      "Take the distinction seriously — coordination is not leadership. Either swap in a different example or reframe the same one around the influence moment, not the orchestration.",
  },
];

export function getPushbackPrompt(id: string): PushbackPrompt | null {
  return PUSHBACK_PROMPTS.find((p) => p.id === id) ?? null;
}

// --------------------------------------------------------------------------
// Cross-drill prompt lookup (for the [id] page)
// --------------------------------------------------------------------------

export interface ResolvedPromptMeta {
  text: string;
  whatItsLookingFor: string;
  /** Present only for pushback drills. */
  pushback: string | null;
}

export function resolvePromptMeta(
  drillType: DrillType,
  promptId: string,
): ResolvedPromptMeta | null {
  if (drillType === "pitch_60s") {
    const p = getPitch60sPrompt(promptId);
    if (!p) return null;
    return { text: p.text, whatItsLookingFor: p.whatItsLookingFor, pushback: null };
  }
  if (drillType === "pushback_drill") {
    const p = getPushbackPrompt(promptId);
    if (!p) return null;
    return { text: p.initial, whatItsLookingFor: p.whatItsLookingFor, pushback: p.pushback };
  }
  return null;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

export function isDrillTypeAvailable(type: DrillType): boolean {
  return DRILL_TYPES[type]?.available ?? false;
}

export function getDrillTypeConfig(type: DrillType): DrillTypeConfig | null {
  return DRILL_TYPES[type] ?? null;
}
