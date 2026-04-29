/**
 * Company intel orchestrator.
 *
 * Entry point for fetching company intelligence. Orchestrates:
 *   1. Check cache
 *   2. If fresh, return cached data
 *   3. If stale or missing, synthesize from all sources
 *   4. Cache the result
 *   5. Return
 *
 * Respects a timeout budget (default 5000ms). If synthesis takes longer
 * than the budget, returns whatever data completed within the window,
 * falling back to stale cache if available.
 */

import type { CompanyIntel } from "../schema";
import { isStale } from "../schema";
import { getCachedIntel, setCachedIntel, incrementAccessCount } from "./cache";
import { synthesizeIntel } from "./synthesize";

const DEFAULT_TIMEOUT_MS = 5000;

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchCompanyIntel(
  companyName: string,
  requestId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CompanyIntel> {
  const normalized = companyName.toLowerCase().trim().replace(/\s+/g, " ");

  // Step 1: Check cache
  const cached = await getCachedIntel(normalized);

  if (cached && !isStale(cached)) {
    console.log(
      `[intel.fetch-company] cache hit (fresh) for "${companyName}" (rid=${requestId})`
    );
    // Fire-and-forget access count increment
    incrementAccessCount(normalized).catch(() => {});
    return cached;
  }

  if (cached) {
    console.log(
      `[intel.fetch-company] cache hit (stale) for "${companyName}", re-synthesizing (rid=${requestId})`
    );
  } else {
    console.log(
      `[intel.fetch-company] cache miss for "${companyName}", synthesizing (rid=${requestId})`
    );
  }

  // Step 2: Synthesize with timeout budget
  try {
    const intel = await withTimeout(
      synthesizeIntel(companyName, requestId),
      timeoutMs
    );

    // Step 3: Cache the result (fire-and-forget)
    setCachedIntel(companyName, intel).catch((err) => {
      console.error(
        `[intel.fetch-company] cache write failed for "${companyName}" (rid=${requestId}):`,
        err
      );
    });

    // Bump access count
    incrementAccessCount(normalized).catch(() => {});

    return intel;
  } catch (err) {
    // Timeout or synthesis failure — return stale cache if available
    if (cached) {
      console.warn(
        `[intel.fetch-company] synthesis timed out/failed for "${companyName}", returning stale cache (rid=${requestId})`
      );
      incrementAccessCount(normalized).catch(() => {});
      return cached;
    }

    console.error(
      `[intel.fetch-company] synthesis failed for "${companyName}", no cache available (rid=${requestId}):`,
      err
    );

    // Last resort: return empty intel
    const { emptyIntel } = await import("../schema");
    return emptyIntel(companyName);
  }
}

// --------------------------------------------------------------------------
// Timeout helper
// --------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
