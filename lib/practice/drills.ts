/**
 * Drill registry.
 *
 * Engine 2 is content-driven — drill types define their own rubrics, prompts,
 * and config shapes here. Adding a new drill type (pause coaching, 60s pitch,
 * pushback handling) is a pure content addition: register the drill, add its
 * feedback prompt to lib/practice/feedback.ts, ship.
 *
 * MVP ships story_polishing only. Others are stubbed with metadata so the
 * picker UI can show "coming soon" tiles.
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
  /** How many attempts per drill session. story_polishing = 5. */
  targetAttempts: number;
  /** Max seconds per attempt. */
  maxAttemptSeconds: number;
  /** Is this drill type shipped in MVP? False = "coming soon" tile. */
  available: boolean;
}

export const DRILL_TYPES: Record<DrillType, DrillTypeConfig> = {
  story_polishing: {
    id: "story_polishing",
    name: "Story polishing",
    shortName: "Story",
    tagline: "Rehearse one answer until it's automatic.",
    description:
      "Pick a behavioral question. Answer it five times in a row. Between attempts, see what's working and what needs sharpening. By the fifth rep, your answer should land cleanly without thinking.",
    targetAttempts: 5,
    maxAttemptSeconds: 180,
    available: true,
  },
  pitch_60s: {
    id: "pitch_60s",
    name: "60-second pitch",
    shortName: "Pitch",
    tagline: "Your resume walkthrough in exactly one minute.",
    description:
      "One shot. Sixty seconds. Clear hook, clear story, clear landing. We measure how much of the minute you use and whether your core message survives the compression.",
    targetAttempts: 1,
    maxAttemptSeconds: 75, // 60 + small grace for cutoff
    available: false,
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
      "Answer. Then get pushed on it. Defend, adjust, or concede — what you do under real-time pressure is what the final round tests.",
    targetAttempts: 5,
    maxAttemptSeconds: 120,
    available: false,
  },
};

// --------------------------------------------------------------------------
// Story polishing prompt library
// --------------------------------------------------------------------------

export interface StoryPolishingPrompt {
  id: string;
  text: string;
  /** Grouping for filter UI. */
  category: "leadership" | "conflict" | "failure" | "achievement" | "why" | "weakness";
  /** What good answers to this question do well — shown as brief guidance before first attempt. */
  whatItsLookingFor: string;
}

export const STORY_POLISHING_PROMPTS: StoryPolishingPrompt[] = [
  {
    id: "lead_team",
    text: "Tell me about a time you led a team through a difficult situation.",
    category: "leadership",
    whatItsLookingFor:
      "A specific team, a specific difficulty, what you did differently because you were leading, and the outcome. Not just 'we worked hard' — what decisions did you own?",
  },
  {
    id: "disagreement",
    text: "Tell me about a time you had a disagreement with a teammate or manager.",
    category: "conflict",
    whatItsLookingFor:
      "The other person's position before your own. What the disagreement actually was about. How you resolved it without the other person becoming the villain of your story.",
  },
  {
    id: "failure",
    text: "Tell me about a time you failed.",
    category: "failure",
    whatItsLookingFor:
      "A real failure, not a humblebrag. What you thought would happen, what actually happened, and what you changed afterward. The interviewer wants to see accountability without self-flagellation.",
  },
  {
    id: "proud",
    text: "What's the accomplishment you're most proud of?",
    category: "achievement",
    whatItsLookingFor:
      "Not the biggest thing on your resume — the one that took the most from you. Specificity about what you actually did. Why this one, not others.",
  },
  {
    id: "why_firm",
    text: "Why this firm?",
    category: "why",
    whatItsLookingFor:
      "One concrete thing the firm does that you can't get elsewhere. Names, deals, projects — not values-statement language. Don't repeat their marketing copy back to them.",
  },
  {
    id: "why_role",
    text: "Why this role?",
    category: "why",
    whatItsLookingFor:
      "Connection between your actual background and what the role requires. Not 'I love the work' — what specifically about your experience has prepared you for this specific job.",
  },
  {
    id: "weakness",
    text: "What's your biggest weakness?",
    category: "weakness",
    whatItsLookingFor:
      "An actual weakness, not a humblebrag ('I care too much'). What you've done about it with evidence of progress. Self-awareness beats fake humility.",
  },
  {
    id: "conflict_hard",
    text: "Tell me about a time you had to tell someone their work wasn't good enough.",
    category: "conflict",
    whatItsLookingFor:
      "Direct language about what you said. The other person's reaction. What happened after. Most candidates soften this into unrecognizability — don't.",
  },
  {
    id: "outside_comfort",
    text: "Tell me about a time you stepped outside your comfort zone.",
    category: "achievement",
    whatItsLookingFor:
      "What the comfort zone was. Why stepping out was uncomfortable specifically for you. What changed in you afterward, not just in the outcome.",
  },
  {
    id: "change_mind",
    text: "Tell me about a time you changed your mind on something important.",
    category: "leadership",
    whatItsLookingFor:
      "Your original position. The specific thing that changed your mind. How you think about that topic now. Shows intellectual honesty — rarer than candidates think.",
  },
];

export function getStoryPolishingPrompt(id: string): StoryPolishingPrompt | null {
  return STORY_POLISHING_PROMPTS.find((p) => p.id === id) ?? null;
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
