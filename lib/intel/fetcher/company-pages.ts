/**
 * Company pages fetcher.
 *
 * Fetches publicly available company information from:
 * - Careers page (values, culture, open roles)
 * - About page (mission, leadership, HQ)
 * - Press/newsroom page (recent announcements)
 *
 * Uses fetch with timeout. Extracts structured data from HTML via
 * simple text parsing (no heavy DOM library needed server-side).
 *
 * Feature flag: INTEL_FETCHER_COMPANY_PAGES (default: enabled)
 */

import { z } from "zod";

const ENABLED = process.env.INTEL_FETCHER_COMPANY_PAGES !== "false";
const TIMEOUT_MS = 5000;

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface CompanyPagesData {
  companyName: string;
  website: string | null;
  aboutText: string | null;
  valuesFromCareers: string[];
  leadershipNames: string[];
  recentPressReleases: PressRelease[];
  hqCity: string | null;
  industry: string | null;
}

export interface PressRelease {
  title: string;
  date: string | null;
  url: string | null;
}

// --------------------------------------------------------------------------
// Zod schema for Google Knowledge Graph (free, 100 req/day without key)
// --------------------------------------------------------------------------

const GoogleSearchResultSchema = z.object({
  organic_results: z.array(
    z.object({
      title: z.string(),
      link: z.string(),
      snippet: z.string().optional(),
    })
  ).optional(),
}).passthrough();

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchCompanyPages(
  companyName: string,
  requestId: string
): Promise<CompanyPagesData | null> {
  if (!ENABLED) {
    console.log(`[intel.company-pages] disabled (company=${companyName}, rid=${requestId})`);
    return null;
  }

  try {
    // Try to find the company website and key pages
    const website = await findCompanyWebsite(companyName, requestId);

    const result: CompanyPagesData = {
      companyName,
      website,
      aboutText: null,
      valuesFromCareers: [],
      leadershipNames: [],
      recentPressReleases: [],
      hqCity: null,
      industry: null,
    };

    if (!website) {
      console.log(`[intel.company-pages] no website found for "${companyName}" (rid=${requestId})`);
      return result;
    }

    // Fetch pages in parallel with individual timeouts
    const [aboutHtml, careersHtml] = await Promise.all([
      fetchPage(`${website}/about`, requestId),
      fetchPage(`${website}/careers`, requestId),
    ]);

    if (aboutHtml) {
      result.aboutText = extractAboutText(aboutHtml);
      result.leadershipNames = extractLeadershipNames(aboutHtml);
      result.hqCity = extractHqCity(aboutHtml);
    }

    if (careersHtml) {
      result.valuesFromCareers = extractValues(careersHtml);
    }

    return result;
  } catch (err) {
    console.error(`[intel.company-pages] failed for "${companyName}" (rid=${requestId}):`, err);
    return null;
  }
}

// --------------------------------------------------------------------------
// Internal helpers
// --------------------------------------------------------------------------

async function findCompanyWebsite(
  companyName: string,
  requestId: string
): Promise<string | null> {
  // Simple heuristic: try common patterns
  const normalized = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const candidates = [
    `https://www.${normalized}.com`,
    `https://${normalized}.com`,
    `https://www.${normalized}.io`,
  ];

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok || res.status === 301 || res.status === 302) {
        console.log(`[intel.company-pages] found website: ${url} (rid=${requestId})`);
        return new URL(res.url || url).origin;
      }
    } catch {
      // Try next candidate
    }
  }

  return null;
}

async function fetchPage(
  url: string,
  requestId: string
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FolioBot/1.0; +https://folio.io)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const text = await res.text();
    // Limit to first 100KB to avoid processing huge pages
    return text.slice(0, 100_000);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[intel.company-pages] timeout for ${url} (rid=${requestId})`);
    }
    return null;
  }
}

function extractAboutText(html: string): string | null {
  // Strip HTML tags, get text content
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 50) return null;

  // Return first 2000 chars of meaningful text
  return text.slice(0, 2000);
}

function extractLeadershipNames(html: string): string[] {
  const names: string[] = [];

  // Look for common leadership title patterns
  const titlePatterns = [
    /(?:CEO|CTO|CFO|COO|CPO|CRO|CMO|Chief\s+\w+\s+Officer)[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/g,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[,\s]*(?:CEO|CTO|CFO|COO|CPO|Chief)/g,
  ];

  for (const pattern of titlePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const name = match[1]?.trim();
      if (name && name.length > 3 && name.length < 50 && !names.includes(name)) {
        names.push(name);
      }
      if (names.length >= 10) break;
    }
  }

  return names;
}

function extractHqCity(html: string): string | null {
  // Look for common HQ patterns
  const patterns = [
    /(?:headquartered?\s+in|based\s+in|hq\s*:\s*|head\s*quarters?\s*:\s*)([A-Z][a-zA-Z\s,]+)/i,
    /([A-Z][a-z]+,\s*[A-Z]{2})\s*(?:\d{5})?/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const city = match[1].trim().replace(/[.,;]+$/, "");
      if (city.length > 2 && city.length < 50) return city;
    }
  }

  return null;
}

function extractValues(html: string): string[] {
  const values: string[] = [];

  // Look for common value/culture section patterns
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\n+/g, "\n");

  // Look for lines after "our values" or "what we believe" headers
  const valueHeaders = /(?:our\s+values|core\s+values|what\s+we\s+believe|our\s+principles|our\s+culture)/i;
  const headerIdx = text.search(valueHeaders);

  if (headerIdx >= 0) {
    const afterHeader = text.slice(headerIdx, headerIdx + 2000);
    const lines = afterHeader.split("\n").filter((l) => l.trim().length > 3 && l.trim().length < 100);

    // Take up to 8 lines after the header as potential values
    for (let i = 1; i < Math.min(lines.length, 9); i++) {
      const line = lines[i].trim();
      if (line.length > 3 && !line.includes("<") && !line.includes("{")) {
        values.push(line);
      }
    }
  }

  return values.slice(0, 8);
}
