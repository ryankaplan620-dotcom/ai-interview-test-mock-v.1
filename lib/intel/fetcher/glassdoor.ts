/**
 * Glassdoor fetcher (stub).
 *
 * Structurally complete but disabled by default pending legal review.
 * Glassdoor's TOS prohibits automated scraping — this fetcher will remain
 * dormant until we secure an official data partnership or API license.
 *
 * Feature flag: INTEL_FETCHER_GLASSDOOR (default: false — legal review needed)
 */

const ENABLED = process.env.INTEL_FETCHER_GLASSDOOR === "true";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface GlassdoorData {
  interviewQuestions: GlassdoorQuestion[];
  interviewDifficulty: number | null; // 1-5 scale
  ratings: GlassdoorRatings | null;
  interviewProcess: string | null;
}

export interface GlassdoorQuestion {
  text: string;
  role: string;
  date: string;
  difficulty: number;
}

export interface GlassdoorRatings {
  overall: number;
  cultureValues: number;
  workLifeBalance: number;
  compensation: number;
  careerOpportunities: number;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchGlassdoorData(
  companyName: string,
  requestId: string
): Promise<GlassdoorData | null> {
  if (!ENABLED) {
    console.log(
      `[intel.glassdoor] disabled pending legal review (company=${companyName}, rid=${requestId})`
    );
    return null;
  }

  // TODO: Implement once Glassdoor data partnership is secured.
  // Will use official API endpoints with proper auth.
  console.log(
    `[intel.glassdoor] fetcher not yet implemented (company=${companyName}, rid=${requestId})`
  );
  return null;
}
