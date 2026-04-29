/**
 * Wall Street Oasis (WSO) fetcher (stub).
 *
 * Structurally complete but disabled by default. WSO contains valuable
 * finance interview questions and compensation threads. Will implement
 * once scraping strategy / partnership is finalised.
 *
 * Feature flag: INTEL_FETCHER_WSO (default: false)
 */

const ENABLED = process.env.INTEL_FETCHER_WSO === "true";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface WsoData {
  threads: WsoThread[];
  interviewQuestions: WsoQuestion[];
  compensationMentions: WsoCompMention[];
}

export interface WsoThread {
  title: string;
  url: string;
  date: string;
  replyCount: number;
}

export interface WsoQuestion {
  text: string;
  role: string;
  date: string;
  threadUrl: string;
}

export interface WsoCompMention {
  role: string;
  level: string;
  amount: string;
  date: string;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchWsoData(
  companyName: string,
  requestId: string
): Promise<WsoData | null> {
  if (!ENABLED) {
    console.log(
      `[intel.wso] disabled via feature flag (company=${companyName}, rid=${requestId})`
    );
    return null;
  }

  // TODO: Implement WSO scraping or API integration.
  console.log(
    `[intel.wso] fetcher not yet implemented (company=${companyName}, rid=${requestId})`
  );
  return null;
}
