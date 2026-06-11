/**
 * Intel cache layer.
 *
 * Reads and writes CompanyIntel to the company_intel_cache Supabase table.
 * Handles the case where Supabase isn't configured (returns null, logs warning).
 *
 * Table schema (from migration 0011):
 *   - company_name_normalized (unique key)
 *   - data (jsonb — full CompanyIntel blob)
 *   - freshness_generated_at, ttl_hours, session_count, last_accessed_at
 */

import type { CompanyIntel } from "../schema";
import { safeParseCompanyIntel } from "../schema";

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Reads cached intel for a company. Returns null if not found, expired,
 * or if Supabase is not configured.
 */
export async function getCachedIntel(
  companyNameNormalized: string
): Promise<CompanyIntel | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("company_intel_cache")
      .select("data")
      .eq("company_name_normalized", companyNameNormalized)
      .single();

    if (error || !data) {
      // .single() returns error when no rows found — that's expected
      return null;
    }

    // Validate the stored JSON against our schema
    const intel = safeParseCompanyIntel(data.data);
    if (!intel) {
      console.warn(
        `[intel.cache] stored data failed validation for "${companyNameNormalized}"`
      );
      return null;
    }

    return intel;
  } catch (err) {
    console.error(
      `[intel.cache] getCachedIntel failed for "${companyNameNormalized}":`,
      err
    );
    return null;
  }
}

/**
 * Upserts intel into the cache. Uses company_name_normalized as the
 * conflict target for upsert.
 */
export async function setCachedIntel(
  companyName: string,
  intel: CompanyIntel
): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) return;

  const normalized = companyName.toLowerCase().trim().replace(/\s+/g, " ");

  try {
    const { error } = await supabase.from("company_intel_cache").upsert(
      {
        company_name: companyName,
        company_name_normalized: normalized,
        data: intel as unknown as Record<string, unknown>,
        freshness_generated_at: intel.freshness.generated_at,
        ttl_hours: intel.freshness.ttl_hours,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_name_normalized" }
    );

    if (error) {
      console.error(
        `[intel.cache] setCachedIntel failed for "${companyName}":`,
        error.message
      );
    }
  } catch (err) {
    console.error(
      `[intel.cache] setCachedIntel failed for "${companyName}":`,
      err
    );
  }
}

/**
 * Bumps session_count and updates last_accessed_at for a cached company.
 * Fire-and-forget — errors are logged but not thrown.
 */
export async function incrementAccessCount(
  companyNameNormalized: string
): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) return;

  try {
    // Use rpc or raw update with increment
    const { error } = await supabase.rpc("increment_intel_access_count" as never, {
      p_company_name_normalized: companyNameNormalized,
    } as never);

    // If the RPC doesn't exist, fall back to a manual update
    if (error) {
      const { data: existing } = await supabase
        .from("company_intel_cache")
        .select("session_count")
        .eq("company_name_normalized", companyNameNormalized)
        .single();

      if (existing) {
        await supabase
          .from("company_intel_cache")
          .update({
            session_count: (existing.session_count ?? 0) + 1,
            last_accessed_at: new Date().toISOString(),
          })
          .eq("company_name_normalized", companyNameNormalized);
      }
    }
  } catch (err) {
    console.error(
      `[intel.cache] incrementAccessCount failed for "${companyNameNormalized}":`,
      err
    );
  }
}

// --------------------------------------------------------------------------
// Internal: lazy Supabase client
// --------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSupabaseClient(): Promise<any | null> {
  try {
    const { createServerClient } = await import("@/lib/db/server");
    // The intel tables aren't in the generated Database type yet, so we
    // return `any` to access them until types are regenerated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createServerClient() as any;
  } catch {
    console.warn(
      "[intel.cache] Supabase not configured — cache operations will be skipped"
    );
    return null;
  }
}
