/**
 * Question selector for prompt injection.
 *
 * Filters and sorts questions from the intel bank based on interview
 * context (type, role, level), then returns up to `count` questions
 * for inclusion in the persona system prompt.
 */

import type { IntelQuestion } from "../schema";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface QuestionSelectionContext {
  interviewType: string;
  role: string;
  level: string;
  count?: number;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export function selectQuestions(
  questions: IntelQuestion[],
  ctx: QuestionSelectionContext
): IntelQuestion[] {
  const maxCount = ctx.count ?? 8;

  if (questions.length === 0) return [];

  let filtered = questions;

  // Filter by interview type — include exact match and "mixed"
  if (ctx.interviewType) {
    const typeNorm = ctx.interviewType.toLowerCase().trim();
    filtered = filtered.filter(
      (q) => q.interview_type === typeNorm || q.interview_type === "mixed"
    );

    // If filter is too aggressive, fall back to all questions
    if (filtered.length === 0) filtered = questions;
  }

  // Filter by role — fuzzy match
  if (ctx.role) {
    const roleNorm = ctx.role.toLowerCase().trim();
    const roleFiltered = filtered.filter((q) => {
      if (!q.role) return true; // Questions without a role match all
      return fuzzyRoleMatch(q.role, roleNorm);
    });

    // Only apply if we still have results
    if (roleFiltered.length > 0) filtered = roleFiltered;
  }

  // Sort by confidence desc, then last_seen desc
  filtered.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return (b.last_seen ?? "").localeCompare(a.last_seen ?? "");
  });

  return filtered.slice(0, maxCount);
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Fuzzy role match. Returns true if the question role is compatible
 * with the requested role.
 *
 * Examples:
 *   "software engineer" matches "engineer"
 *   "product manager" matches "pm"
 *   "data scientist" matches "data"
 */
function fuzzyRoleMatch(questionRole: string, requestedRole: string): boolean {
  const qNorm = questionRole.toLowerCase().trim();
  const rNorm = requestedRole.toLowerCase().trim();

  // Exact match
  if (qNorm === rNorm) return true;

  // One contains the other
  if (qNorm.includes(rNorm) || rNorm.includes(qNorm)) return true;

  // Common abbreviations
  const abbreviations: Record<string, string[]> = {
    "software engineer": ["swe", "engineer", "dev", "developer"],
    "product manager": ["pm", "product"],
    "data scientist": ["ds", "data", "ml"],
    "consultant": ["consulting"],
    "analyst": ["analysis"],
    "associate": ["assoc"],
    "intern": ["internship"],
  };

  for (const [full, abbrevs] of Object.entries(abbreviations)) {
    const isQuestionRole = qNorm.includes(full) || abbrevs.some((a) => qNorm.includes(a));
    const isRequestedRole = rNorm.includes(full) || abbrevs.some((a) => rNorm.includes(a));
    if (isQuestionRole && isRequestedRole) return true;
  }

  return false;
}
