/**
 * Rate limiting — per-user sliding-window limits via Upstash Redis REST.
 *
 * Two independent limits per route, both per-user:
 *   - SHORT window: catches loops and impatient clicking
 *   - DAILY window: catches scripted abuse that respects short windows
 *
 * Either trip independently produces a 429. The response includes:
 *   - Retry-After header (exact seconds until next request will succeed)
 *   - JSON body with which limit tripped and a human-readable message
 *
 * Failure policy: fail OPEN on Upstash errors. Rationale in README. The
 * practical effect is that an Upstash outage does not brick the product —
 * users can still start sessions, we lose abuse protection during the outage.
 * For a $11.50-per-call endpoint with a per-session idempotency check and
 * a per-user tier quota ceiling, this is the correct tradeoff.
 *
 * Why not @upstash/ratelimit: it's great, but drags ~80KB of dependencies
 * and its abstractions assume you want to do aggregate per-IP work. Ours
 * is simpler — a sliding-window counter per (key, window) via one Redis
 * ZSET + ZADD/ZREMRANGEBYSCORE/ZCARD. ~50 lines of code, zero deps beyond
 * fetch. Easier to audit, easier to change.
 */

export interface RateLimitConfig {
  /** Logical identifier used in error messages and log lines. */
  name: string;
  /** Short-window limit. */
  short: { max: number; windowSeconds: number };
  /** Long-window limit. */
  daily: { max: number; windowSeconds: number };
}

/**
 * Pre-baked configurations for each protected route.
 *
 * Calibration rationale:
 *   - Tavus conversation creation costs $11.50/call. The idempotent re-entry
 *     path (session already has a tavus_conversation_url) does NOT trigger
 *     the rate limit — it returns cached without hitting the limiter. So
 *     these limits apply to *new* conversation creates only.
 *   - 3/10min is generous for legitimate use. A user abandoning sessions
 *     and starting fresh ones multiple times in a short window is rare but
 *     possible — 3 covers it. A 4th in 10 minutes is not a legitimate flow.
 *   - 20/day caps the worst case of a Max-tier user running an aggressive
 *     practice day. Max tier includes 6 sessions/month; 20 in a day is
 *     3x the entire month's allotment, so it's a hard ceiling.
 *
 *   - Feedback generation costs ~3 Claude calls (main + memory + Q&A). At
 *     current Sonnet pricing that's ~$0.10-0.20/session depending on
 *     transcript length. Looser limits because this endpoint is lower
 *     per-call cost but can be called multiple times (poll for Q&A results).
 *     The endpoint is also already idempotent for existing feedback, so
 *     most repeat calls short-circuit without hitting Claude.
 */
export const RATE_LIMITS = {
  tavus_conversation: {
    name: "tavus_conversation",
    short: { max: 3, windowSeconds: 600 }, // 3 per 10 minutes
    daily: { max: 20, windowSeconds: 86_400 }, // 20 per 24 hours
  },
  feedback_generate: {
    name: "feedback_generate",
    short: { max: 20, windowSeconds: 600 }, // 20 per 10 minutes
    daily: { max: 100, windowSeconds: 86_400 }, // 100 per 24 hours
  },

  // Outreach scout makes up to 6 Anthropic web_search calls per request —
  // the most expensive per-call route outside Tavus. Bounded accordingly.
  outreach_scout: {
    name: "outreach_scout",
    short: { max: 5, windowSeconds: 600 }, // 5 per 10 minutes
    daily: { max: 30, windowSeconds: 86_400 }, // 30 per day
  },
  // One Claude call per draft.
  outreach_draft: {
    name: "outreach_draft",
    short: { max: 15, windowSeconds: 600 }, // 15 per 10 minutes
    daily: { max: 60, windowSeconds: 86_400 }, // 60 per day
  },
  // Deepgram transcription + a Claude analysis call per attempt.
  practice_attempt: {
    name: "practice_attempt",
    short: { max: 15, windowSeconds: 600 }, // 15 per 10 minutes
    daily: { max: 60, windowSeconds: 86_400 }, // 60 per day
  },
  // Called once (or a handful of times on reconnect) per live session —
  // looser than conversation creation but still bounded.
  deepgram_token: {
    name: "deepgram_token",
    short: { max: 10, windowSeconds: 600 }, // 10 per 10 minutes
    daily: { max: 50, windowSeconds: 86_400 }, // 50 per day
  },
  // Called once per interviewer turn — a real session can have dozens.
  // Generous windows; still bounds a scripted loop against Claude.
  interview_turn: {
    name: "interview_turn",
    short: { max: 60, windowSeconds: 600 }, // 60 per 10 minutes
    daily: { max: 500, windowSeconds: 86_400 }, // 500 per day
  },
  // Called once per spoken line — same shape as interview_turn.
  tts_stream: {
    name: "tts_stream",
    short: { max: 60, windowSeconds: 600 }, // 60 per 10 minutes
    daily: { max: 500, windowSeconds: 86_400 }, // 500 per day
  },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitName = keyof typeof RATE_LIMITS;

// --------------------------------------------------------------------------
// Result
// --------------------------------------------------------------------------

export interface RateLimitAllow {
  allowed: true;
  /** How many requests remain in the tighter of the two windows. */
  remaining: number;
}

export interface RateLimitDeny {
  allowed: false;
  /** Which window tripped. Used to build the client-facing message. */
  trippedWindow: "short" | "daily";
  /** Seconds until the next request will succeed. */
  retryAfterSeconds: number;
  /** Human-readable message for the client. */
  message: string;
}

export type RateLimitResult = RateLimitAllow | RateLimitDeny;

// --------------------------------------------------------------------------
// Upstash REST wiring
// --------------------------------------------------------------------------

function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/**
 * Execute a Redis pipeline against Upstash's REST endpoint. Returns the array
 * of results in order. Throws on network/auth errors; individual command
 * errors surface as objects with an `error` field in the results array.
 */
async function upstashPipeline(
  commands: (string | number)[][],
): Promise<Array<{ result: unknown } | { error: string }>> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  // 3-second hard timeout. The rate-limiter call must not dominate request
  // latency — if Upstash is slow, we fail open rather than make the user wait.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`upstash_http_${res.status}`);
    }
    return (await res.json()) as Array<{ result: unknown } | { error: string }>;
  } finally {
    clearTimeout(timeoutId);
  }
}

// --------------------------------------------------------------------------
// Sliding-window counter
// --------------------------------------------------------------------------

/**
 * Record + check a single sliding window. Returns:
 *   - { ok: true, count } if the request is within the limit
 *   - { ok: false, retryAfterSeconds } if it would exceed the limit
 *
 * Implementation: ZSET keyed per (configName, window, userId). Each request:
 *   1. Trims entries older than the window
 *   2. Inserts itself with the current timestamp as score
 *   3. Counts entries; if count > max, removes itself and rejects
 *
 * This add-first-then-check pattern is atomic-enough for our use case:
 * concurrent requests all insert themselves, each then sees a count that
 * includes its own insert AND anyone who inserted before it. The worst case
 * is that N concurrent requests see counts [count+1, count+2, ..., count+N]
 * and exactly (max - count) of them pass. The rest remove themselves and
 * reject. No under-counting, no over-admitting.
 *
 * This is a true sliding window — not a token bucket, not a fixed window.
 * It's slightly more expensive than fixed-window (extra ZREMRANGEBYSCORE)
 * but doesn't have the edge-bursting pathology where a user can fire 2N
 * requests across a window boundary.
 */
async function checkWindow(args: {
  userId: string;
  configName: string;
  windowKey: "short" | "daily";
  max: number;
  windowSeconds: number;
}): Promise<{ ok: true; count: number } | { ok: false; retryAfterSeconds: number }> {
  const key = `rl:${args.configName}:${args.windowKey}:${args.userId}`;
  const now = Date.now();
  const windowStartMs = now - args.windowSeconds * 1000;
  // Use now+random suffix to dodge ZSET member collisions on submillisecond-concurrent requests.
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

  // Single pipeline: trim, add-self, count. After this, `count` includes us.
  const [trimRes, addRes, countRes, expireRes] = await upstashPipeline([
    ["ZREMRANGEBYSCORE", key, "-inf", String(windowStartMs)],
    ["ZADD", key, String(now), member],
    ["ZCARD", key],
    // TTL on the key so abandoned keys expire. 2x window is a safe margin.
    ["EXPIRE", key, String(args.windowSeconds * 2)],
  ]);

  if ("error" in trimRes) throw new Error(`upstash_trim_${trimRes.error}`);
  if ("error" in addRes) throw new Error(`upstash_add_${addRes.error}`);
  if ("error" in countRes) throw new Error(`upstash_count_${countRes.error}`);
  if ("error" in expireRes) throw new Error(`upstash_expire_${expireRes.error}`);

  const count = Number(countRes.result);
  if (!Number.isFinite(count)) {
    throw new Error("upstash_count_not_numeric");
  }

  if (count <= args.max) {
    // We're within the limit. Our member stays in the set.
    return { ok: true, count };
  }

  // Over the limit. Remove ourselves and return the retry-after calculated
  // from the oldest member (who's expiring soonest).
  const [, oldestRes] = await upstashPipeline([
    ["ZREM", key, member],
    ["ZRANGE", key, "0", "0", "WITHSCORES"],
  ]);

  if ("error" in oldestRes) {
    // Non-fatal; use the window fallback below
    return { ok: false, retryAfterSeconds: args.windowSeconds };
  }

  let retryAfterSeconds = args.windowSeconds;
  const oldestArr = oldestRes.result as string[];
  if (oldestArr && oldestArr.length >= 2) {
    const oldestMs = Number(oldestArr[1]);
    if (Number.isFinite(oldestMs)) {
      const expiresAtMs = oldestMs + args.windowSeconds * 1000;
      retryAfterSeconds = Math.max(1, Math.ceil((expiresAtMs - now) / 1000));
    }
  }
  return { ok: false, retryAfterSeconds };
}

// --------------------------------------------------------------------------
// Public: check both windows for a user
// --------------------------------------------------------------------------

export async function checkRateLimit(args: {
  userId: string;
  config: RateLimitConfig;
}): Promise<RateLimitResult> {
  if (!upstashConfigured()) {
    // FAIL OPEN. Logged so we notice if the env vars are missing in prod.
    console.warn(
      `[rate-limit] UPSTASH env not configured — ${args.config.name} check bypassed`,
    );
    return { allowed: true, remaining: args.config.short.max };
  }

  try {
    // Check windows in parallel. Both must allow.
    const [shortRes, dailyRes] = await Promise.all([
      checkWindow({
        userId: args.userId,
        configName: args.config.name,
        windowKey: "short",
        max: args.config.short.max,
        windowSeconds: args.config.short.windowSeconds,
      }),
      checkWindow({
        userId: args.userId,
        configName: args.config.name,
        windowKey: "daily",
        max: args.config.daily.max,
        windowSeconds: args.config.daily.windowSeconds,
      }),
    ]);

    if (!shortRes.ok) {
      return {
        allowed: false,
        trippedWindow: "short",
        retryAfterSeconds: shortRes.retryAfterSeconds,
        message: buildMessage(
          args.config,
          "short",
          shortRes.retryAfterSeconds,
        ),
      };
    }
    if (!dailyRes.ok) {
      return {
        allowed: false,
        trippedWindow: "daily",
        retryAfterSeconds: dailyRes.retryAfterSeconds,
        message: buildMessage(
          args.config,
          "daily",
          dailyRes.retryAfterSeconds,
        ),
      };
    }

    const remaining = Math.min(
      args.config.short.max - shortRes.count,
      args.config.daily.max - dailyRes.count,
    );
    return { allowed: true, remaining };
  } catch (err) {
    // FAIL OPEN on any Upstash error — network, timeout, auth, etc.
    console.error(`[rate-limit] ${args.config.name} check failed, failing open:`, err);
    return { allowed: true, remaining: args.config.short.max };
  }
}

// --------------------------------------------------------------------------
// Error message builder — actionable, not just "rate limited"
// --------------------------------------------------------------------------

const RATE_LIMIT_ACTION_LABELS: Record<RateLimitName, string> = {
  tavus_conversation: "started a session",
  feedback_generate: "requested feedback",
  outreach_scout: "scouted contacts",
  outreach_draft: "drafted an outreach email",
  practice_attempt: "submitted a drill attempt",
  deepgram_token: "started a transcription session",
  interview_turn: "sent a message",
  tts_stream: "requested audio",
};

function buildMessage(
  config: RateLimitConfig,
  window: "short" | "daily",
  retryAfterSeconds: number,
): string {
  const w = config[window];
  const action = RATE_LIMIT_ACTION_LABELS[config.name as RateLimitName] ?? "made this request";
  const windowLabel = humanWindow(w.windowSeconds);
  const retryLabel = humanDuration(retryAfterSeconds);
  return `You've ${action} ${w.max} times in the last ${windowLabel}. Try again in ${retryLabel}.`;
}

export function humanDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function humanWindow(seconds: number): string {
  if (seconds <= 600) return "few minutes";
  if (seconds <= 3600) return "hour";
  if (seconds <= 86_400) return "day";
  return `${Math.ceil(seconds / 86_400)} days`;
}
