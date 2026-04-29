/**
 * Question scoring and deduplication.
 *
 * Takes raw questions from all sources, assigns confidence scores
 * based on corroboration across sources, deduplicates by text similarity,
 * and sorts by confidence descending.
 *
 * Confidence levels:
 *   0 = single unverified source
 *   1 = single verified source (e.g. user_contributed, high-upvote reddit)
 *   2 = corroborated by 2 sources
 *   3 = corroborated by 3+ sources
 */

import type { IntelQuestion } from "../schema";

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export function scoreAndDedupeQuestions(
  questions: IntelQuestion[]
): IntelQuestion[] {
  if (questions.length === 0) return [];

  // Step 1: Group by normalized text to detect corroboration
  const groups = groupBySimilarity(questions);

  // Step 2: Score each group and pick the best representative
  const scored: IntelQuestion[] = [];
  for (const group of groups.values()) {
    const representative = pickBestRepresentative(group);
    const confidence = computeConfidence(group);

    scored.push({
      ...representative,
      confidence,
    });
  }

  // Step 3: Sort by confidence desc, then last_seen desc
  scored.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return (b.last_seen ?? "").localeCompare(a.last_seen ?? "");
  });

  return scored;
}

// --------------------------------------------------------------------------
// Grouping by text similarity
// --------------------------------------------------------------------------

function groupBySimilarity(
  questions: IntelQuestion[]
): Map<string, IntelQuestion[]> {
  const groups = new Map<string, IntelQuestion[]>();

  for (const q of questions) {
    const key = normalizeForComparison(q.text);
    const existing = groups.get(key);
    if (existing) {
      existing.push(q);
    } else {
      groups.set(key, [q]);
    }
  }

  return groups;
}

/**
 * Normalize text for deduplication.
 * Lowercase, strip punctuation, collapse whitespace, take first 60 chars.
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

// --------------------------------------------------------------------------
// Scoring
// --------------------------------------------------------------------------

function computeConfidence(group: IntelQuestion[]): 0 | 1 | 2 | 3 {
  // Count distinct sources in the group
  const distinctSources = new Set(group.map((q) => q.source));
  const sourceCount = distinctSources.size;

  // Check if any in the group is from a verified source
  const hasVerified = group.some(
    (q) =>
      q.source === "user_contributed" ||
      (q.confidence >= 1)
  );

  if (sourceCount >= 3) return 3;
  if (sourceCount >= 2) return 2;
  if (hasVerified) return 1;
  return 0;
}

/**
 * Pick the best representative question from a group of duplicates.
 * Prefers: higher original confidence, then user_contributed, then most recent.
 */
function pickBestRepresentative(group: IntelQuestion[]): IntelQuestion {
  return group.reduce((best, current) => {
    // Prefer user_contributed source
    if (current.source === "user_contributed" && best.source !== "user_contributed") {
      return current;
    }
    if (best.source === "user_contributed" && current.source !== "user_contributed") {
      return best;
    }
    // Prefer higher original confidence
    if (current.confidence > best.confidence) return current;
    if (best.confidence > current.confidence) return best;
    // Prefer more recent
    if ((current.last_seen ?? "") > (best.last_seen ?? "")) return current;
    return best;
  });
}
