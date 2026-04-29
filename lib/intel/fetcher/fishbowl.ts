/**
 * Fishbowl fetcher (stub).
 *
 * Structurally complete but disabled by default. Fishbowl (by Glassdoor)
 * hosts professional community discussions with culture and interview
 * insights. Will implement once data access strategy is finalised.
 *
 * Feature flag: INTEL_FETCHER_FISHBOWL (default: false)
 */

const ENABLED = process.env.INTEL_FETCHER_FISHBOWL === "true";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface FishbowlData {
  threads: FishbowlThread[];
  cultureInsights: string[];
}

export interface FishbowlThread {
  title: string;
  url: string;
  date: string;
  replyCount: number;
  bowl: string; // Fishbowl "bowl" (topic group)
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchFishbowlData(
  companyName: string,
  requestId: string
): Promise<FishbowlData | null> {
  if (!ENABLED) {
    console.log(
      `[intel.fishbowl] disabled via feature flag (company=${companyName}, rid=${requestId})`
    );
    return null;
  }

  // TODO: Implement Fishbowl data integration.
  console.log(
    `[intel.fishbowl] fetcher not yet implemented (company=${companyName}, rid=${requestId})`
  );
  return null;
}
