/**
 * Prompt block composer.
 *
 * Takes a CompanyIntel object and an interview context, and produces
 * a tightly formatted text block (under ~1800 tokens) that drops into
 * the persona system prompt. The block gives the interviewer persona
 * company context, recent news, culture signals, interview loop info,
 * and a curated question bank.
 */

import type { CompanyIntel, IntelQuestion } from "../schema";
import { selectQuestions } from "./select-questions";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface PromptBlockContext {
  interviewType: string;
  role: string;
  level: string;
  difficulty: string;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export function composePromptBlock(
  intel: CompanyIntel,
  ctx: PromptBlockContext
): string {
  const lines: string[] = [];

  // ------------------------------------------------------------------
  // Header
  // ------------------------------------------------------------------
  lines.push(`## Company Context: ${intel.company.name}`);
  lines.push(
    `${intel.company.industry}, ${intel.company.size_band}, HQ in ${intel.company.hq_city}.`
  );
  lines.push("");

  // ------------------------------------------------------------------
  // Recent news (reference naturally, do not read verbatim)
  // ------------------------------------------------------------------
  if (intel.recent.news.length > 0) {
    lines.push("### Recent (reference naturally, do not read verbatim):");
    const newsToShow = intel.recent.news.slice(0, 4);
    for (const item of newsToShow) {
      lines.push(`- ${item.headline} (${item.date})`);
    }
    lines.push("");
  }

  // Leadership changes
  if (intel.recent.leadership_changes.length > 0) {
    const changes = intel.recent.leadership_changes.slice(0, 3);
    for (const lc of changes) {
      lines.push(`- Leadership: ${lc.name} (${lc.role}) — ${lc.nature} (${lc.date})`);
    }
    lines.push("");
  }

  // ------------------------------------------------------------------
  // Culture signals
  // ------------------------------------------------------------------
  const hasValues = intel.culture.stated_values.length > 0;
  const hasVibes = intel.culture.interview_vibe_words.length > 0;
  const hasThemes = intel.culture.observed_themes.length > 0;

  if (hasValues || hasVibes || hasThemes) {
    lines.push("### Culture signals:");
    if (hasValues) {
      lines.push(`Values: ${intel.culture.stated_values.slice(0, 5).join(", ")}`);
    }
    if (hasVibes) {
      lines.push(
        `Interview style: ${intel.culture.interview_vibe_words.slice(0, 5).join(", ")}`
      );
    }
    if (hasThemes) {
      lines.push(
        `Observed themes: ${intel.culture.observed_themes.slice(0, 3).join("; ")}`
      );
    }
    lines.push("");
  }

  // ------------------------------------------------------------------
  // Interview loop context
  // ------------------------------------------------------------------
  if (intel.hiring.typical_loop.length > 0) {
    lines.push("### Interview loop context:");
    const total = intel.hiring.typical_loop.length;
    // Try to match current round by interview type
    const matchedRound = intel.hiring.typical_loop.find(
      (r) =>
        r.format.toLowerCase().includes(ctx.interviewType.toLowerCase()) ||
        r.common_question_types.some((t) =>
          t.toLowerCase().includes(ctx.interviewType.toLowerCase())
        )
    );

    if (matchedRound) {
      const roundIdx =
        intel.hiring.typical_loop.indexOf(matchedRound) + 1;
      lines.push(
        `This is typically round ${roundIdx} of ${total}. Format: ${matchedRound.format}. Duration: ${matchedRound.duration_min} min.`
      );
    } else {
      lines.push(
        `Typical loop has ${total} round${total > 1 ? "s" : ""}: ${intel.hiring.typical_loop
          .map((r) => r.round_name)
          .join(", ")}.`
      );
    }
    lines.push("");
  }

  // Bar notes
  if (intel.hiring.bar_notes.length > 0) {
    lines.push(`Bar notes: ${intel.hiring.bar_notes.slice(0, 2).join("; ")}`);
    lines.push("");
  }

  // Comp context (brief)
  if (intel.hiring.comp_ranges.length > 0) {
    const relevantComp = findRelevantComp(intel.hiring.comp_ranges, ctx.role, ctx.level);
    if (relevantComp) {
      lines.push(
        `Comp range (${relevantComp.role} ${relevantComp.level}): $${formatK(relevantComp.base_low)}-$${formatK(relevantComp.base_high)} base, $${formatK(relevantComp.tc_low)}-$${formatK(relevantComp.tc_high)} TC`
      );
      lines.push("");
    }
  }

  // ------------------------------------------------------------------
  // Question bank
  // ------------------------------------------------------------------
  const selected = selectQuestions(intel.questions, {
    interviewType: ctx.interviewType,
    role: ctx.role,
    level: ctx.level,
    count: 8,
  });

  if (selected.length > 0) {
    lines.push(
      "### Question bank (choose from these, adapt to the conversation):"
    );
    selected.forEach((q, i) => {
      lines.push(
        `${i + 1}. (${q.interview_type}, ${q.level || "any"}, conf=${q.confidence}) ${q.text}`
      );
    });
    lines.push("");
  }

  // ------------------------------------------------------------------
  // Footer instruction
  // ------------------------------------------------------------------
  lines.push(
    "Use this context as your own knowledge. Never say \"according to my research\" or reference data sources."
  );

  return lines.join("\n");
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function findRelevantComp(
  ranges: CompanyIntel["hiring"]["comp_ranges"],
  role: string,
  level: string
): CompanyIntel["hiring"]["comp_ranges"][number] | null {
  const roleNorm = role.toLowerCase();
  const levelNorm = level.toLowerCase();

  // Try exact match first
  const exact = ranges.find(
    (r) =>
      r.role.toLowerCase().includes(roleNorm) &&
      r.level.toLowerCase().includes(levelNorm)
  );
  if (exact) return exact;

  // Try role match only
  const roleMatch = ranges.find((r) =>
    r.role.toLowerCase().includes(roleNorm)
  );
  if (roleMatch) return roleMatch;

  // Return first available
  return ranges[0] ?? null;
}

function formatK(n: number): string {
  if (n >= 1000) {
    return `${Math.round(n / 1000)}K`;
  }
  return String(n);
}
