/**
 * Reddit fetcher.
 *
 * Pulls interview questions and culture data from Reddit's public JSON API.
 * Searches relevant subreddits for company-specific interview threads.
 *
 * Subreddits: r/cscareerquestions, r/consulting, r/financialcareers,
 * r/banking, r/sales, r/jobs, r/interviews, plus company-specific subs.
 *
 * Reddit's public .json endpoints don't require auth for read-only.
 * Rate limit: ~60 req/min without OAuth.
 *
 * Feature flag: INTEL_FETCHER_REDDIT (default: enabled)
 */

import { z } from "zod";

const ENABLED = process.env.INTEL_FETCHER_REDDIT !== "false";
const TIMEOUT_MS = 5000;
const USER_AGENT = "FolioBot/1.0 (interview prep platform)";

const SUBREDDITS = [
  "cscareerquestions",
  "consulting",
  "financialcareers",
  "banking",
  "sales",
  "jobs",
  "interviews",
];

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface RedditIntelData {
  interviewQuestions: RedditQuestion[];
  cultureInsights: string[];
  interviewVibeWords: string[];
  threads: RedditThread[];
}

export interface RedditQuestion {
  text: string;
  subreddit: string;
  postUrl: string;
  postedDate: string;
  interviewType: "behavioral" | "technical" | "case" | "domain_knowledge" | "mixed";
  role: string;
  upvotes: number;
}

export interface RedditThread {
  title: string;
  subreddit: string;
  url: string;
  date: string;
  score: number;
}

// --------------------------------------------------------------------------
// Zod schemas for Reddit JSON API
// --------------------------------------------------------------------------

const RedditPostSchema = z.object({
  data: z.object({
    title: z.string(),
    selftext: z.string().optional(),
    subreddit: z.string(),
    permalink: z.string(),
    created_utc: z.number(),
    score: z.number(),
    num_comments: z.number(),
  }),
});

const RedditListingSchema = z.object({
  data: z.object({
    children: z.array(RedditPostSchema),
  }),
});

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function fetchRedditData(
  companyName: string,
  requestId: string
): Promise<RedditIntelData | null> {
  if (!ENABLED) {
    console.log(`[intel.reddit] disabled (company=${companyName}, rid=${requestId})`);
    return null;
  }

  try {
    const result: RedditIntelData = {
      interviewQuestions: [],
      cultureInsights: [],
      interviewVibeWords: [],
      threads: [],
    };

    // Search across relevant subreddits
    const searchPromises = SUBREDDITS.map((sub) =>
      searchSubreddit(sub, companyName, requestId)
    );

    const results = await Promise.allSettled(searchPromises);

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value) continue;
      const { posts, subreddit } = r.value;

      for (const post of posts) {
        const data = post.data;

        // Track the thread
        result.threads.push({
          title: data.title,
          subreddit,
          url: `https://reddit.com${data.permalink}`,
          date: new Date(data.created_utc * 1000).toISOString().split("T")[0],
          score: data.score,
        });

        // Extract questions from post text
        const questions = extractQuestions(data.selftext ?? "", data.title, subreddit, data);
        result.interviewQuestions.push(...questions);

        // Extract culture insights
        const insights = extractCultureInsights(data.selftext ?? "", data.title);
        result.cultureInsights.push(...insights);
      }
    }

    // Dedupe questions by text similarity
    result.interviewQuestions = dedupeQuestions(result.interviewQuestions);

    // Extract vibe words from all threads
    result.interviewVibeWords = extractVibeWords(result.threads, result.cultureInsights);

    // Cap results
    result.interviewQuestions = result.interviewQuestions.slice(0, 20);
    result.cultureInsights = result.cultureInsights.slice(0, 10);
    result.interviewVibeWords = result.interviewVibeWords.slice(0, 8);
    result.threads = result.threads.slice(0, 15);

    console.log(
      `[intel.reddit] found ${result.interviewQuestions.length} questions, ${result.threads.length} threads for "${companyName}" (rid=${requestId})`
    );

    return result;
  } catch (err) {
    console.error(`[intel.reddit] failed for "${companyName}" (rid=${requestId}):`, err);
    return null;
  }
}

// --------------------------------------------------------------------------
// Internal helpers
// --------------------------------------------------------------------------

async function searchSubreddit(
  subreddit: string,
  companyName: string,
  requestId: string
): Promise<{ posts: z.infer<typeof RedditPostSchema>[]; subreddit: string } | null> {
  const query = encodeURIComponent(`${companyName} interview`);
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${query}&restrict_sr=on&sort=relevance&t=year&limit=10`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return null;

    const json = await res.json();
    const parsed = RedditListingSchema.safeParse(json);
    if (!parsed.success) return null;

    return { posts: parsed.data.data.children, subreddit };
  } catch {
    return null;
  }
}

function extractQuestions(
  text: string,
  title: string,
  subreddit: string,
  postData: z.infer<typeof RedditPostSchema>["data"]
): RedditQuestion[] {
  const questions: RedditQuestion[] = [];
  const combined = `${title}\n${text}`;

  // Look for question patterns
  const questionPatterns = [
    /(?:asked|question was|they asked)[:\s]*["']?([^"'\n]{20,200})\??/gi,
    /(?:interview question)[:\s]*["']?([^"'\n]{20,200})\??/gi,
    /["']([^"'\n]{20,200}\?)['"]/g,
  ];

  for (const pattern of questionPatterns) {
    let match;
    while ((match = pattern.exec(combined)) !== null) {
      const questionText = match[1]?.trim();
      if (!questionText || questionText.length < 15) continue;

      questions.push({
        text: questionText.replace(/['"]+$/, "").trim(),
        subreddit,
        postUrl: `https://reddit.com${postData.permalink}`,
        postedDate: new Date(postData.created_utc * 1000).toISOString().split("T")[0],
        interviewType: classifyQuestionType(questionText),
        role: extractRole(title, text),
        upvotes: postData.score,
      });

      if (questions.length >= 5) break;
    }
  }

  return questions;
}

function classifyQuestionType(
  text: string
): "behavioral" | "technical" | "case" | "domain_knowledge" | "mixed" {
  const lower = text.toLowerCase();

  if (/tell me about a time|describe a situation|walk me through|give me an example/i.test(lower)) {
    return "behavioral";
  }
  if (/code|algorithm|system design|database|api|architecture|debug|implement/i.test(lower)) {
    return "technical";
  }
  if (/case|market size|profitability|growth strategy|how many|estimate/i.test(lower)) {
    return "case";
  }
  if (/what is|explain|define|how does|difference between/i.test(lower)) {
    return "domain_knowledge";
  }
  return "mixed";
}

function extractRole(title: string, text: string): string {
  const combined = `${title} ${text}`.toLowerCase();
  const roles = [
    "software engineer", "product manager", "data scientist", "analyst",
    "associate", "consultant", "manager", "director", "vp", "intern",
    "designer", "marketing", "sales", "operations",
  ];

  for (const role of roles) {
    if (combined.includes(role)) return role;
  }
  return "";
}

function extractCultureInsights(text: string, title: string): string[] {
  const insights: string[] = [];
  const combined = `${title}\n${text}`;

  const patterns = [
    /(?:culture|environment|atmosphere|vibe)\s+(?:is|was|felt)\s+([^.]{10,100})/gi,
    /(?:work[-\s]life|wlb)\s+(?:is|was)\s+([^.]{10,80})/gi,
    /(?:interviewers?\s+(?:were|was|seemed))\s+([^.]{10,80})/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(combined)) !== null) {
      const insight = match[1]?.trim();
      if (insight && insight.length > 10) {
        insights.push(insight);
      }
    }
  }

  return insights;
}

function extractVibeWords(threads: RedditThread[], insights: string[]): string[] {
  const vibeWords = new Map<string, number>();
  const candidates = [
    "fast", "slow", "intense", "chill", "collaborative", "competitive",
    "structured", "unstructured", "case-heavy", "behavioral-heavy",
    "technical", "conversational", "formal", "informal", "friendly",
    "tough", "relaxed", "stressful", "supportive", "demanding",
    "skeptical", "warm", "cold", "professional", "casual",
  ];

  const allText = [
    ...threads.map((t) => t.title),
    ...insights,
  ].join(" ").toLowerCase();

  for (const word of candidates) {
    const count = (allText.match(new RegExp(word, "gi")) || []).length;
    if (count > 0) vibeWords.set(word, count);
  }

  return Array.from(vibeWords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function dedupeQuestions(questions: RedditQuestion[]): RedditQuestion[] {
  const seen = new Set<string>();
  return questions.filter((q) => {
    const normalized = q.text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const key = normalized.slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
