/**
 * News fetcher.
 *
 * Pulls recent company news for context injection into persona prompts.
 * Uses NewsAPI (https://newsapi.org) when NEWSAPI_KEY is set, otherwise
 * falls back to Google News RSS.
 *
 * Feature flag: INTEL_FETCHER_NEWS (default: enabled)
 */

import { z } from "zod";

const ENABLED = process.env.INTEL_FETCHER_NEWS !== "false";
const NEWSAPI_KEY = process.env.NEWSAPI_KEY ?? null;
const TIMEOUT_MS = 5000;
const MAX_ARTICLES = 8;
const LOOKBACK_DAYS = 90;

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface NewsData {
  articles: NewsArticle[];
}

export interface NewsArticle {
  headline: string;
  date: string;
  source: string;
  url: string;
  oneLiner: string;
}

// --------------------------------------------------------------------------
// Zod schemas
// --------------------------------------------------------------------------

const NewsApiArticleSchema = z.object({
  title: z.string(),
  publishedAt: z.string(),
  source: z.object({ name: z.string() }),
  url: z.string(),
  description: z.string().nullable().optional(),
});

const NewsApiResponseSchema = z.object({
  status: z.string(),
  totalResults: z.number(),
  articles: z.array(NewsApiArticleSchema),
});

const NewsArticleSchema = z.object({
  headline: z.string().min(1),
  date: z.string(),
  source: z.string(),
  url: z.string(),
  oneLiner: z.string(),
});

const NewsDataSchema = z.object({
  articles: z.array(NewsArticleSchema),
});

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchNewsData(
  companyName: string,
  requestId: string
): Promise<NewsData | null> {
  if (!ENABLED) {
    console.log(
      `[intel.news] disabled via feature flag (company=${companyName}, rid=${requestId})`
    );
    return null;
  }

  try {
    let articles: NewsArticle[];

    if (NEWSAPI_KEY) {
      articles = await fetchFromNewsApi(companyName, requestId);
    } else {
      articles = await fetchFromGoogleNewsRss(companyName, requestId);
    }

    // Cap to max articles
    articles = articles.slice(0, MAX_ARTICLES);

    // Validate with Zod
    const parsed = NewsDataSchema.safeParse({ articles });
    if (!parsed.success) {
      console.warn(
        `[intel.news] validation failed for "${companyName}" (rid=${requestId}):`,
        parsed.error.message
      );
      // Return whatever articles we have, filtered to valid ones
      const validArticles = articles.filter(
        (a) => a.headline && a.date && a.source && a.url
      );
      return { articles: validArticles };
    }

    console.log(
      `[intel.news] found ${parsed.data.articles.length} articles for "${companyName}" (rid=${requestId})`
    );

    return parsed.data;
  } catch (err) {
    console.error(
      `[intel.news] failed for "${companyName}" (rid=${requestId}):`,
      err
    );
    return null;
  }
}

// --------------------------------------------------------------------------
// NewsAPI
// --------------------------------------------------------------------------

async function fetchFromNewsApi(
  companyName: string,
  requestId: string
): Promise<NewsArticle[]> {
  const fromDate = getFromDate();
  const query = encodeURIComponent(companyName);
  const url = `https://newsapi.org/v2/everything?q=${query}&from=${fromDate}&sortBy=publishedAt&pageSize=${MAX_ARTICLES}&language=en&apiKey=${NEWSAPI_KEY}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(
        `[intel.news] NewsAPI HTTP ${res.status} for "${companyName}" (rid=${requestId})`
      );
      return [];
    }

    const json = await res.json();
    const parsed = NewsApiResponseSchema.safeParse(json);
    if (!parsed.success) {
      console.warn(
        `[intel.news] NewsAPI parse failed for "${companyName}" (rid=${requestId})`
      );
      return [];
    }

    return parsed.data.articles.map((a) => ({
      headline: a.title,
      date: a.publishedAt.split("T")[0],
      source: a.source.name,
      url: a.url,
      oneLiner: a.description?.slice(0, 200) ?? "",
    }));
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(
        `[intel.news] NewsAPI timeout for "${companyName}" (rid=${requestId})`
      );
    }
    return [];
  }
}

// --------------------------------------------------------------------------
// Google News RSS (fallback — no API key required)
// --------------------------------------------------------------------------

async function fetchFromGoogleNewsRss(
  companyName: string,
  requestId: string
): Promise<NewsArticle[]> {
  const query = encodeURIComponent(companyName);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FolioBot/1.0)",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(
        `[intel.news] Google News RSS HTTP ${res.status} for "${companyName}" (rid=${requestId})`
      );
      return [];
    }

    const xml = await res.text();
    return parseRssItems(xml);
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(
        `[intel.news] Google News RSS timeout for "${companyName}" (rid=${requestId})`
      );
    }
    return [];
  }
}

/**
 * Parse RSS XML with simple regex extraction.
 * Extracts <title>, <link>, <pubDate> from <item> tags.
 */
function parseRssItems(xml: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const cutoff = getCutoffDate();

  // Match each <item>...</item> block
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < MAX_ARTICLES) {
    const block = match[1];

    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");

    if (!title || !link) continue;

    // Parse date and check if within lookback window
    const dateStr = pubDate ? parsePubDate(pubDate) : new Date().toISOString().split("T")[0];
    if (pubDate && new Date(dateStr) < cutoff) continue;

    articles.push({
      headline: decodeHtmlEntities(title),
      date: dateStr,
      source: extractSource(title),
      url: link,
      oneLiner: "",
    });
  }

  return articles;
}

function extractTag(block: string, tag: string): string | null {
  // Handle both <tag>content</tag> and <tag><![CDATA[content]]></tag>
  const regex = new RegExp(
    `<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`
  );
  const m = block.match(regex);
  return m?.[1]?.trim() ?? null;
}

function parsePubDate(pubDate: string): string {
  try {
    return new Date(pubDate).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function extractSource(title: string): string {
  // Google News titles often end with " - Source Name"
  const dashIndex = title.lastIndexOf(" - ");
  if (dashIndex > 0) {
    return title.slice(dashIndex + 3).trim();
  }
  return "Google News";
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// --------------------------------------------------------------------------
// Date helpers
// --------------------------------------------------------------------------

function getFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - LOOKBACK_DAYS);
  return d.toISOString().split("T")[0];
}

function getCutoffDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - LOOKBACK_DAYS);
  return d;
}
