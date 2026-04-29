/**
 * SEC EDGAR fetcher.
 *
 * Pulls company data from SEC's free, public EDGAR API:
 * - Company filings (10-K, 10-Q, 8-K, S-1) for stated values, leadership, segments
 * - Company facts for financial metrics
 *
 * SEC EDGAR API is free, no API key required, rate limit 10 req/sec.
 * User-Agent header required per SEC policy.
 *
 * Feature flag: INTEL_FETCHER_SEC (default: enabled)
 */

import { z } from "zod";

const SEC_BASE = "https://efts.sec.gov/LATEST";
const SEC_DATA = "https://data.sec.gov";
const USER_AGENT = "Folio Interview Prep support@folio.io";

const ENABLED = process.env.INTEL_FETCHER_SEC !== "false";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface SecCompanyData {
  cik: string;
  name: string;
  ticker: string | null;
  sic: string | null;
  sicDescription: string | null;
  stateOfIncorporation: string | null;
  fiscalYearEnd: string | null;
  recentFilings: SecFiling[];
  leadership: SecLeadershipEntry[];
}

export interface SecFiling {
  type: string;
  date: string;
  description: string;
  url: string;
}

export interface SecLeadershipEntry {
  name: string;
  title: string;
}

// --------------------------------------------------------------------------
// Zod schemas for SEC API responses
// --------------------------------------------------------------------------

const SecSearchResultSchema = z.object({
  hits: z.object({
    hits: z.array(
      z.object({
        _source: z.object({
          entity_name: z.string().optional(),
          file_num: z.string().optional(),
          entity_id: z.string().optional(),
          display_names: z.array(z.string()).optional(),
        }).passthrough(),
        _id: z.string(),
      })
    ),
  }),
});

const SecSubmissionsSchema = z.object({
  cik: z.string().or(z.number()).transform(String),
  name: z.string(),
  tickers: z.array(z.string()).optional(),
  sic: z.string().optional(),
  sicDescription: z.string().optional(),
  stateOfIncorporation: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  recentFilings: z
    .object({
      recent: z.object({
        form: z.array(z.string()),
        filingDate: z.array(z.string()),
        primaryDocument: z.array(z.string()),
        accessionNumber: z.array(z.string()),
        primaryDocDescription: z.array(z.string()).optional(),
      }),
    })
    .optional(),
}).passthrough();

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchSecData(
  companyName: string,
  requestId: string
): Promise<SecCompanyData | null> {
  if (!ENABLED) {
    console.log(`[intel.sec] disabled via feature flag (company=${companyName}, rid=${requestId})`);
    return null;
  }

  try {
    // Step 1: Search for the company to get CIK
    const cik = await searchCompanyCik(companyName, requestId);
    if (!cik) {
      console.log(`[intel.sec] no CIK found for "${companyName}" (rid=${requestId})`);
      return null;
    }

    // Step 2: Fetch submissions (filings + metadata)
    const submissions = await fetchSubmissions(cik, requestId);
    if (!submissions) return null;

    // Step 3: Extract leadership from most recent 10-K/DEF 14A if available
    const leadership = await extractLeadership(cik, submissions, requestId);

    const recentFilings = extractRecentFilings(submissions, cik);

    return {
      cik,
      name: submissions.name,
      ticker: submissions.tickers?.[0] ?? null,
      sic: submissions.sic ?? null,
      sicDescription: submissions.sicDescription ?? null,
      stateOfIncorporation: submissions.stateOfIncorporation ?? null,
      fiscalYearEnd: submissions.fiscalYearEnd ?? null,
      recentFilings,
      leadership,
    };
  } catch (err) {
    console.error(`[intel.sec] fetch failed for "${companyName}" (rid=${requestId}):`, err);
    return null;
  }
}

// --------------------------------------------------------------------------
// Internal helpers
// --------------------------------------------------------------------------

async function searchCompanyCik(
  companyName: string,
  requestId: string
): Promise<string | null> {
  const url = `${SEC_BASE}/search-index?q="${encodeURIComponent(companyName)}"&dateRange=custom&startdt=2020-01-01&forms=10-K`;

  const res = await fetchWithTimeout(url, requestId);
  if (!res) return null;

  const parsed = SecSearchResultSchema.safeParse(res);
  if (!parsed.success || parsed.data.hits.hits.length === 0) return null;

  const entityId = parsed.data.hits.hits[0]._source.entity_id;
  if (!entityId) return null;

  // Entity ID is CIK with leading zeros
  return entityId.replace(/^0+/, "");
}

async function fetchSubmissions(
  cik: string,
  requestId: string
): Promise<z.infer<typeof SecSubmissionsSchema> | null> {
  const paddedCik = cik.padStart(10, "0");
  const url = `${SEC_DATA}/submissions/CIK${paddedCik}.json`;

  const res = await fetchWithTimeout(url, requestId);
  if (!res) return null;

  const parsed = SecSubmissionsSchema.safeParse(res);
  if (!parsed.success) {
    console.warn(`[intel.sec] submissions parse failed (cik=${cik}, rid=${requestId})`);
    return null;
  }

  return parsed.data;
}

function extractRecentFilings(
  submissions: z.infer<typeof SecSubmissionsSchema>,
  cik: string
): SecFiling[] {
  const recent = submissions.recentFilings?.recent;
  if (!recent) return [];

  const filings: SecFiling[] = [];
  const relevantForms = new Set(["10-K", "10-Q", "8-K", "S-1", "DEF 14A"]);

  for (let i = 0; i < Math.min(recent.form.length, 50); i++) {
    if (!relevantForms.has(recent.form[i])) continue;

    const accession = recent.accessionNumber[i].replace(/-/g, "");
    filings.push({
      type: recent.form[i],
      date: recent.filingDate[i],
      description: recent.primaryDocDescription?.[i] ?? recent.form[i],
      url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}/${recent.primaryDocument[i]}`,
    });

    if (filings.length >= 10) break;
  }

  return filings;
}

async function extractLeadership(
  _cik: string,
  submissions: z.infer<typeof SecSubmissionsSchema>,
  _requestId: string
): Promise<SecLeadershipEntry[]> {
  // For now, extract from the company name context.
  // Full implementation would parse the DEF 14A or 10-K for officer listings.
  // That requires HTML parsing which is Phase 2b work.
  // Return empty for now — other sources (company pages) will fill this.
  void submissions;
  return [];
}

async function fetchWithTimeout(
  url: string,
  requestId: string,
  timeoutMs = 5000
): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[intel.sec] HTTP ${res.status} for ${url} (rid=${requestId})`);
      return null;
    }

    return await res.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[intel.sec] timeout for ${url} (rid=${requestId})`);
    } else {
      console.warn(`[intel.sec] fetch error for ${url} (rid=${requestId}):`, err);
    }
    return null;
  }
}
