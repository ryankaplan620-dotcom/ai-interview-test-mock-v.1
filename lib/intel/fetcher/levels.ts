/**
 * Levels.fyi fetcher.
 *
 * Pulls compensation data and role/level taxonomy from Levels.fyi.
 * Uses their public-facing data (no official API — scrapes the publicly
 * accessible compensation pages).
 *
 * Feature flag: INTEL_FETCHER_LEVELS (default: enabled)
 */

import { z } from "zod";

const ENABLED = process.env.INTEL_FETCHER_LEVELS !== "false";
const TIMEOUT_MS = 5000;

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface LevelsData {
  compRanges: LevelsCompRange[];
  roleLevels: string[];
  companyTier: string | null;
}

export interface LevelsCompRange {
  role: string;
  level: string;
  baseLow: number;
  baseHigh: number;
  tcLow: number;
  tcHigh: number;
  currency: string;
  source: string;
  date: string;
  sampleSize: number;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchLevelsData(
  companyName: string,
  requestId: string
): Promise<LevelsData | null> {
  if (!ENABLED) {
    console.log(`[intel.levels] disabled (company=${companyName}, rid=${requestId})`);
    return null;
  }

  try {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const url = `https://www.levels.fyi/companies/${slug}/salaries`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FolioBot/1.0)",
        Accept: "text/html",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.log(`[intel.levels] HTTP ${res.status} for "${companyName}" (rid=${requestId})`);
      return null;
    }

    const html = await res.text();
    const compRanges = extractCompRanges(html, companyName);
    const roleLevels = extractRoleLevels(html);
    const companyTier = extractCompanyTier(html);

    console.log(
      `[intel.levels] found ${compRanges.length} comp ranges for "${companyName}" (rid=${requestId})`
    );

    return { compRanges, roleLevels, companyTier };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[intel.levels] timeout for "${companyName}" (rid=${requestId})`);
    } else {
      console.error(`[intel.levels] failed for "${companyName}" (rid=${requestId}):`, err);
    }
    return null;
  }
}

// --------------------------------------------------------------------------
// Extraction helpers
// --------------------------------------------------------------------------

function extractCompRanges(html: string, companyName: string): LevelsCompRange[] {
  const ranges: LevelsCompRange[] = [];

  // Look for salary data patterns in the HTML
  // Levels.fyi uses JSON-LD or embedded data for salary ranges
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      if (data.baseSalary || data["@type"] === "JobPosting") {
        // Extract from structured data if available
        const base = data.baseSalary?.value;
        if (base) {
          ranges.push({
            role: data.title ?? "Software Engineer",
            level: "mid",
            baseLow: typeof base.minValue === "number" ? base.minValue : 0,
            baseHigh: typeof base.maxValue === "number" ? base.maxValue : 0,
            tcLow: 0,
            tcHigh: 0,
            currency: base.currency ?? "USD",
            source: "levels_fyi",
            date: new Date().toISOString().split("T")[0],
            sampleSize: 0,
          });
        }
      }
    } catch {
      // JSON parse failed, continue with HTML extraction
    }
  }

  // Fallback: extract from text patterns
  const salaryPatterns = /\$(\d{2,3}(?:,\d{3})?)[kK]?\s*[-–to]+\s*\$(\d{2,3}(?:,\d{3})?)[kK]?/g;
  let match;
  while ((match = salaryPatterns.exec(html)) !== null && ranges.length < 10) {
    const low = parseNumber(match[1]);
    const high = parseNumber(match[2]);
    if (low > 20000 && high > low) {
      ranges.push({
        role: "Various",
        level: "mid",
        baseLow: low,
        baseHigh: high,
        tcLow: Math.round(low * 1.2),
        tcHigh: Math.round(high * 1.5),
        currency: "USD",
        source: "levels_fyi",
        date: new Date().toISOString().split("T")[0],
        sampleSize: 0,
      });
    }
  }

  return ranges;
}

function extractRoleLevels(html: string): string[] {
  const levels: string[] = [];
  const levelPatterns = [
    /(?:L[3-9]|E[3-7]|IC[1-6]|Senior|Staff|Principal|Junior|Mid|Lead)/g,
  ];

  for (const pattern of levelPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const level = match[0];
      if (!levels.includes(level)) levels.push(level);
      if (levels.length >= 10) break;
    }
  }

  return levels;
}

function extractCompanyTier(html: string): string | null {
  // Levels.fyi sometimes classifies companies by tier
  if (html.includes("tier-1") || html.includes("Tier 1")) return "tier-1";
  if (html.includes("tier-2") || html.includes("Tier 2")) return "tier-2";
  if (html.includes("tier-3") || html.includes("Tier 3")) return "tier-3";
  return null;
}

function parseNumber(s: string): number {
  const n = parseInt(s.replace(/,/g, ""), 10);
  // If it's a small number like 150, assume it's in thousands
  return n < 1000 ? n * 1000 : n;
}
