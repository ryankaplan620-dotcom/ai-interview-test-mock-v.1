/**
 * Company Intelligence schema.
 *
 * Canonical type for structured company data injected into persona prompts
 * at session start. Every field is optional at the edges (fetchers may return
 * partial data) but the top-level shape is enforced via Zod so downstream
 * consumers always know what they're working with.
 */

import { z } from "zod";

// ==========================================================================
// Zod schemas (source of truth — TypeScript types derived below)
// ==========================================================================

export const SizeBandSchema = z.enum([
  "startup",
  "growth",
  "midmarket",
  "enterprise",
  "megacap",
]);

export const InterviewTypeSchema = z.enum([
  "behavioral",
  "technical",
  "case",
  "domain_knowledge",
  "mixed",
]);

export const QuestionSourceSchema = z.enum([
  "glassdoor",
  "reddit",
  "wso",
  "blind",
  "fishbowl",
  "levels_fyi",
  "user_contributed",
  "other",
]);

export const LeadershipChangeNatureSchema = z.enum([
  "arrival",
  "departure",
  "promotion",
]);

export const RecentEventKindSchema = z.enum([
  "earnings",
  "funding",
  "layoff",
  "mna",
]);

export const SourceStatusSchema = z.enum(["ok", "stale", "error"]);

// --------------------------------------------------------------------------

export const NewsItemSchema = z.object({
  headline: z.string(),
  date: z.string(),
  source: z.string(),
  url: z.string(),
  one_liner: z.string(),
});

export const EarningsOrFundingSchema = z.object({
  kind: RecentEventKindSchema,
  date: z.string(),
  summary: z.string(),
});

export const LeadershipChangeSchema = z.object({
  name: z.string(),
  role: z.string(),
  date: z.string(),
  nature: LeadershipChangeNatureSchema,
});

export const ProductLaunchSchema = z.object({
  name: z.string(),
  date: z.string(),
  one_liner: z.string(),
});

export const InterviewRoundSchema = z.object({
  round_name: z.string(),
  format: z.string(),
  duration_min: z.number(),
  common_question_types: z.array(z.string()),
});

export const CompRangeSchema = z.object({
  role: z.string(),
  level: z.string(),
  base_low: z.number(),
  base_high: z.number(),
  tc_low: z.number(),
  tc_high: z.number(),
  currency: z.string(),
  source: z.string(),
  date: z.string(),
});

export const IntelQuestionSchema = z.object({
  text: z.string(),
  interview_type: InterviewTypeSchema,
  role: z.string(),
  level: z.string(),
  round: z.string(),
  source: QuestionSourceSchema,
  source_url: z.string().optional(),
  posted_date: z.string().optional(),
  confidence: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  last_seen: z.string(),
});

export const IntelSourceSchema = z.object({
  url: z.string(),
  fetched_at: z.string(),
  status: SourceStatusSchema,
});

export const FreshnessSchema = z.object({
  generated_at: z.string(),
  oldest_field: z.string(),
  ttl_hours: z.number(),
});

// --------------------------------------------------------------------------
// Top-level CompanyIntel schema
// --------------------------------------------------------------------------

export const CompanyIntelSchema = z.object({
  company: z.object({
    name: z.string(),
    aliases: z.array(z.string()),
    ticker: z.string().optional(),
    industry: z.string(),
    sub_industry: z.string(),
    hq_city: z.string(),
    size_band: SizeBandSchema,
  }),
  recent: z.object({
    news: z.array(NewsItemSchema),
    earnings_or_funding: z.array(EarningsOrFundingSchema),
    leadership_changes: z.array(LeadershipChangeSchema),
    products_or_launches: z.array(ProductLaunchSchema),
  }),
  culture: z.object({
    stated_values: z.array(z.string()),
    observed_themes: z.array(z.string()),
    interview_vibe_words: z.array(z.string()),
  }),
  hiring: z.object({
    typical_loop: z.array(InterviewRoundSchema),
    bar_notes: z.array(z.string()),
    comp_ranges: z.array(CompRangeSchema),
  }),
  questions: z.array(IntelQuestionSchema),
  sources: z.array(IntelSourceSchema),
  freshness: FreshnessSchema,
});

// ==========================================================================
// TypeScript types (derived from Zod — single source of truth)
// ==========================================================================

export type SizeBand = z.infer<typeof SizeBandSchema>;
export type InterviewQuestionType = z.infer<typeof InterviewTypeSchema>;
export type QuestionSource = z.infer<typeof QuestionSourceSchema>;
export type LeadershipChangeNature = z.infer<typeof LeadershipChangeNatureSchema>;
export type RecentEventKind = z.infer<typeof RecentEventKindSchema>;
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export type NewsItem = z.infer<typeof NewsItemSchema>;
export type EarningsOrFunding = z.infer<typeof EarningsOrFundingSchema>;
export type LeadershipChange = z.infer<typeof LeadershipChangeSchema>;
export type ProductLaunch = z.infer<typeof ProductLaunchSchema>;
export type InterviewRound = z.infer<typeof InterviewRoundSchema>;
export type CompRange = z.infer<typeof CompRangeSchema>;
export type IntelQuestion = z.infer<typeof IntelQuestionSchema>;
export type IntelSource = z.infer<typeof IntelSourceSchema>;
export type Freshness = z.infer<typeof FreshnessSchema>;
export type CompanyIntel = z.infer<typeof CompanyIntelSchema>;

// ==========================================================================
// Helpers
// ==========================================================================

/** Empty intel object — used as fallback when all fetchers fail. */
export function emptyIntel(companyName: string): CompanyIntel {
  return {
    company: {
      name: companyName,
      aliases: [],
      industry: "unknown",
      sub_industry: "unknown",
      hq_city: "unknown",
      size_band: "enterprise",
    },
    recent: {
      news: [],
      earnings_or_funding: [],
      leadership_changes: [],
      products_or_launches: [],
    },
    culture: {
      stated_values: [],
      observed_themes: [],
      interview_vibe_words: [],
    },
    hiring: {
      typical_loop: [],
      bar_notes: [],
      comp_ranges: [],
    },
    questions: [],
    sources: [],
    freshness: {
      generated_at: new Date().toISOString(),
      oldest_field: "all",
      ttl_hours: 0,
    },
  };
}

/** Validate and parse a raw object into CompanyIntel. Throws on invalid. */
export function parseCompanyIntel(raw: unknown): CompanyIntel {
  return CompanyIntelSchema.parse(raw);
}

/** Safe parse — returns null on invalid instead of throwing. */
export function safeParseCompanyIntel(raw: unknown): CompanyIntel | null {
  const result = CompanyIntelSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Check if intel is stale based on TTL. */
export function isStale(intel: CompanyIntel): boolean {
  const generatedAt = new Date(intel.freshness.generated_at).getTime();
  const ttlMs = intel.freshness.ttl_hours * 60 * 60 * 1000;
  return Date.now() > generatedAt + ttlMs;
}

/** Default TTLs by data category (in hours). */
export const TTL_HOURS = {
  news: 7 * 24,           // 7 days
  questions: 30 * 24,     // 30 days
  comp: 90 * 24,          // 90 days
  culture: 180 * 24,      // 180 days
  filings: 365 * 24,      // 1 year
} as const;
