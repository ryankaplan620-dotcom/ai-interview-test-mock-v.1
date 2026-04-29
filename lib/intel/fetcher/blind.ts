/**
 * Blind fetcher (stub).
 *
 * Structurally complete but disabled by default. Blind (Teamblind)
 * contains anonymous employee insights about culture and interview
 * experiences. Will implement once data access strategy is finalised.
 *
 * Feature flag: INTEL_FETCHER_BLIND (default: false)
 */

const ENABLED = process.env.INTEL_FETCHER_BLIND === "true";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface BlindData {
  threads: BlindThread[];
  cultureInsights: string[];
  interviewMentions: BlindInterviewMention[];
}

export interface BlindThread {
  title: string;
  url: string;
  date: string;
  replyCount: number;
}

export interface BlindInterviewMention {
  text: string;
  role: string;
  date: string;
  threadUrl: string;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchBlindData(
  companyName: string,
  requestId: string
): Promise<BlindData | null> {
  if (!ENABLED) {
    console.log(
      `[intel.blind] disabled via feature flag (company=${companyName}, rid=${requestId})`
    );
    return null;
  }

  // TODO: Implement Blind data integration.
  console.log(
    `[intel.blind] fetcher not yet implemented (company=${companyName}, rid=${requestId})`
  );
  return null;
}
