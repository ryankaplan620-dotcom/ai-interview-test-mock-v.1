/**
 * Intel synthesis pipeline.
 *
 * Calls ALL fetchers in parallel via Promise.allSettled, then merges
 * results into a single CompanyIntel object. Uses emptyIntel() as the
 * base and overlays data from each source by priority:
 *
 *   SEC > company-pages > levels > reddit > news
 *       > glassdoor/wso/blind/fishbowl > user-contributed
 *
 * Each source that succeeds enriches specific fields; sources that fail
 * are silently skipped (logged, not thrown).
 */

import {
  type CompanyIntel,
  type IntelQuestion,
  type IntelSource,
  type NewsItem,
  emptyIntel,
  TTL_HOURS,
} from "../schema";
import { fetchSecData } from "../fetcher/sec";
import { fetchCompanyPages } from "../fetcher/company-pages";
import { fetchLevelsData } from "../fetcher/levels";
import { fetchRedditData } from "../fetcher/reddit";
import { fetchNewsData } from "../fetcher/news";
import { fetchGlassdoorData } from "../fetcher/glassdoor";
import { fetchWsoData } from "../fetcher/wso";
import { fetchBlindData } from "../fetcher/blind";
import { fetchFishbowlData } from "../fetcher/fishbowl";
import { fetchUserContributed } from "../fetcher/user-contributed";
import { scoreAndDedupeQuestions } from "./score-questions";

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function synthesizeIntel(
  companyName: string,
  requestId: string
): Promise<CompanyIntel> {
  const intel = emptyIntel(companyName);
  const sources: IntelSource[] = [];
  const allQuestions: IntelQuestion[] = [];

  const normalizedName = companyName.toLowerCase().trim().replace(/\s+/g, " ");

  // Fire all fetchers in parallel
  const [
    secResult,
    pagesResult,
    levelsResult,
    redditResult,
    newsResult,
    glassdoorResult,
    wsoResult,
    blindResult,
    fishbowlResult,
    userContribResult,
  ] = await Promise.allSettled([
    fetchSecData(companyName, requestId),
    fetchCompanyPages(companyName, requestId),
    fetchLevelsData(companyName, requestId),
    fetchRedditData(companyName, requestId),
    fetchNewsData(companyName, requestId),
    fetchGlassdoorData(companyName, requestId),
    fetchWsoData(companyName, requestId),
    fetchBlindData(companyName, requestId),
    fetchFishbowlData(companyName, requestId),
    fetchUserContributed(normalizedName, requestId),
  ]);

  // ------------------------------------------------------------------
  // Priority 1: SEC — company metadata, filings, leadership
  // ------------------------------------------------------------------
  if (secResult.status === "fulfilled" && secResult.value) {
    const sec = secResult.value;
    intel.company.name = sec.name || companyName;
    if (sec.ticker) intel.company.ticker = sec.ticker;
    if (sec.sicDescription) intel.company.industry = sec.sicDescription;

    for (const filing of sec.recentFilings) {
      sources.push({
        url: filing.url,
        fetched_at: new Date().toISOString(),
        status: "ok",
      });
    }

    // Map leadership changes
    for (const leader of sec.leadership) {
      intel.recent.leadership_changes.push({
        name: leader.name,
        role: leader.title,
        date: new Date().toISOString().split("T")[0],
        nature: "arrival",
      });
    }
  }

  // ------------------------------------------------------------------
  // Priority 2: Company pages — about, values, leadership, HQ
  // ------------------------------------------------------------------
  if (pagesResult.status === "fulfilled" && pagesResult.value) {
    const pages = pagesResult.value;
    if (pages.hqCity) intel.company.hq_city = pages.hqCity;
    if (pages.industry) intel.company.industry = pages.industry;
    if (pages.valuesFromCareers.length > 0) {
      intel.culture.stated_values = pages.valuesFromCareers;
    }
    if (pages.website) {
      sources.push({
        url: pages.website,
        fetched_at: new Date().toISOString(),
        status: "ok",
      });
    }
  }

  // ------------------------------------------------------------------
  // Priority 3: Levels.fyi — comp ranges
  // ------------------------------------------------------------------
  if (levelsResult.status === "fulfilled" && levelsResult.value) {
    const levels = levelsResult.value;
    intel.hiring.comp_ranges = levels.compRanges.map((cr) => ({
      role: cr.role,
      level: cr.level,
      base_low: cr.baseLow,
      base_high: cr.baseHigh,
      tc_low: cr.tcLow,
      tc_high: cr.tcHigh,
      currency: cr.currency,
      source: cr.source,
      date: cr.date,
    }));
    sources.push({
      url: "https://levels.fyi",
      fetched_at: new Date().toISOString(),
      status: "ok",
    });
  }

  // ------------------------------------------------------------------
  // Priority 4: Reddit — questions, culture, vibe words
  // ------------------------------------------------------------------
  if (redditResult.status === "fulfilled" && redditResult.value) {
    const reddit = redditResult.value;

    // Interview vibe words (only if not already populated)
    if (
      reddit.interviewVibeWords.length > 0 &&
      intel.culture.interview_vibe_words.length === 0
    ) {
      intel.culture.interview_vibe_words = reddit.interviewVibeWords;
    }

    // Culture insights as observed themes
    if (reddit.cultureInsights.length > 0) {
      intel.culture.observed_themes.push(...reddit.cultureInsights);
    }

    // Questions
    for (const q of reddit.interviewQuestions) {
      allQuestions.push({
        text: q.text,
        interview_type: q.interviewType,
        role: q.role,
        level: "",
        round: "",
        source: "reddit",
        source_url: q.postUrl,
        posted_date: q.postedDate,
        confidence: q.upvotes >= 10 ? 1 : 0,
        last_seen: q.postedDate,
      });
    }

    for (const thread of reddit.threads) {
      sources.push({
        url: thread.url,
        fetched_at: new Date().toISOString(),
        status: "ok",
      });
    }
  }

  // ------------------------------------------------------------------
  // Priority 5: News — recent articles
  // ------------------------------------------------------------------
  if (newsResult.status === "fulfilled" && newsResult.value) {
    const news = newsResult.value;
    intel.recent.news = news.articles.map(
      (a): NewsItem => ({
        headline: a.headline,
        date: a.date,
        source: a.source,
        url: a.url,
        one_liner: a.oneLiner,
      })
    );
  }

  // ------------------------------------------------------------------
  // Priority 6+: Glassdoor, WSO, Blind, Fishbowl (stubs — currently null)
  // ------------------------------------------------------------------
  // Glassdoor
  if (glassdoorResult.status === "fulfilled" && glassdoorResult.value) {
    const gd = glassdoorResult.value;
    for (const q of gd.interviewQuestions) {
      allQuestions.push({
        text: q.text,
        interview_type: "mixed",
        role: q.role,
        level: "",
        round: "",
        source: "glassdoor",
        confidence: 1,
        last_seen: q.date,
      });
    }
    if (gd.interviewProcess && intel.hiring.bar_notes.length === 0) {
      intel.hiring.bar_notes.push(gd.interviewProcess);
    }
  }

  // WSO
  if (wsoResult.status === "fulfilled" && wsoResult.value) {
    const wso = wsoResult.value;
    for (const q of wso.interviewQuestions) {
      allQuestions.push({
        text: q.text,
        interview_type: "mixed",
        role: q.role,
        level: "",
        round: "",
        source: "wso",
        confidence: 0,
        last_seen: q.date,
      });
    }
  }

  // Blind
  if (blindResult.status === "fulfilled" && blindResult.value) {
    const blind = blindResult.value;
    if (blind.cultureInsights.length > 0) {
      intel.culture.observed_themes.push(...blind.cultureInsights);
    }
    for (const m of blind.interviewMentions) {
      allQuestions.push({
        text: m.text,
        interview_type: "mixed",
        role: m.role,
        level: "",
        round: "",
        source: "blind",
        confidence: 0,
        last_seen: m.date,
      });
    }
  }

  // Fishbowl
  if (fishbowlResult.status === "fulfilled" && fishbowlResult.value) {
    const fb = fishbowlResult.value;
    if (fb.cultureInsights.length > 0) {
      intel.culture.observed_themes.push(...fb.cultureInsights);
    }
  }

  // ------------------------------------------------------------------
  // Priority 7: User-contributed questions
  // ------------------------------------------------------------------
  if (userContribResult.status === "fulfilled" && userContribResult.value) {
    allQuestions.push(...userContribResult.value);
  }

  // ------------------------------------------------------------------
  // Score, dedupe, and attach questions
  // ------------------------------------------------------------------
  intel.questions = scoreAndDedupeQuestions(allQuestions);
  intel.sources = sources;

  // ------------------------------------------------------------------
  // Freshness
  // ------------------------------------------------------------------
  intel.freshness.generated_at = new Date().toISOString();
  intel.freshness.ttl_hours = calculateTtl(
    secResult.status === "fulfilled" && !!secResult.value,
    pagesResult.status === "fulfilled" && !!pagesResult.value,
    levelsResult.status === "fulfilled" && !!levelsResult.value,
    redditResult.status === "fulfilled" && !!redditResult.value,
    newsResult.status === "fulfilled" && !!newsResult.value
  );
  intel.freshness.oldest_field = determineOldestField(intel);

  console.log(
    `[intel.synthesize] complete for "${companyName}" — ${intel.questions.length} questions, ${intel.sources.length} sources (rid=${requestId})`
  );

  return intel;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function calculateTtl(
  hasSec: boolean,
  hasPages: boolean,
  hasLevels: boolean,
  hasReddit: boolean,
  hasNews: boolean
): number {
  // The more sources succeeded, the longer we can cache.
  // If only a few sources worked, refresh sooner.
  const successCount = [hasSec, hasPages, hasLevels, hasReddit, hasNews].filter(
    Boolean
  ).length;

  if (successCount >= 4) return TTL_HOURS.news; // 7 days
  if (successCount >= 2) return 3 * 24; // 3 days
  if (successCount >= 1) return 24; // 1 day
  return 6; // 6 hours — very few sources, retry soon
}

function determineOldestField(intel: CompanyIntel): string {
  if (intel.recent.news.length > 0) return "news";
  if (intel.questions.length > 0) return "questions";
  if (intel.hiring.comp_ranges.length > 0) return "comp";
  if (intel.culture.stated_values.length > 0) return "culture";
  return "all";
}
