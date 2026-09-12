/**
 * User-contributed questions fetcher.
 *
 * Pulls verified user-submitted interview questions from the
 * intel_user_contributions table. These are first-class sources
 * with high trust — real questions from real interviews.
 *
 * No feature flag — always enabled when Supabase is configured.
 */

import type { IntelQuestion } from "../schema";

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchUserContributed(
  companyNameNormalized: string,
  requestId: string
): Promise<IntelQuestion[]> {
  try {
    // Dynamic import to avoid pulling in cookies() at module level
    // which would break in non-server contexts during tree-shaking.
    const { createServerClient } = await import("@/lib/db/server");

    let supabase: Awaited<ReturnType<typeof createServerClient>>;
    try {
      supabase = await createServerClient();
    } catch {
      console.warn(
        `[intel.user-contributed] Supabase not configured, skipping (rid=${requestId})`
      );
      return [];
    }

    // The intel tables aren't in the generated Database type yet, so we
    // cast through `any` to access them until types are regenerated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { data, error } = await db
      .from("intel_user_contributions")
      .select(
        "question_text, interview_type, role, level, round, interview_date, created_at"
      )
      .eq("company_name_normalized", companyNameNormalized)
      .eq("verified", true)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error(
        `[intel.user-contributed] query failed for "${companyNameNormalized}" (rid=${requestId}):`,
        (error as { message: string }).message
      );
      return [];
    }

    if (!data || (data as unknown[]).length === 0) {
      console.log(
        `[intel.user-contributed] no verified questions for "${companyNameNormalized}" (rid=${requestId})`
      );
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions: IntelQuestion[] = (data as any[]).map((row: any) => ({
      text: row.question_text,
      interview_type: normalizeInterviewType(row.interview_type),
      role: row.role ?? "",
      level: row.level ?? "",
      round: row.round ?? "",
      source: "user_contributed" as const,
      posted_date: row.interview_date ?? undefined,
      confidence: 1 as const, // Verified user contributions get confidence 1
      last_seen: row.created_at ?? new Date().toISOString(),
    }));

    console.log(
      `[intel.user-contributed] found ${questions.length} verified questions for "${companyNameNormalized}" (rid=${requestId})`
    );

    return questions;
  } catch (err) {
    console.error(
      `[intel.user-contributed] failed for "${companyNameNormalized}" (rid=${requestId}):`,
      err
    );
    return [];
  }
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function normalizeInterviewType(
  raw: string
): "behavioral" | "technical" | "case" | "domain_knowledge" | "mixed" {
  const lower = (raw ?? "").toLowerCase().trim();
  switch (lower) {
    case "behavioral":
      return "behavioral";
    case "technical":
      return "technical";
    case "case":
      return "case";
    case "domain_knowledge":
      return "domain_knowledge";
    default:
      return "mixed";
  }
}
