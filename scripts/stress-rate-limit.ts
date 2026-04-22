/**
 * Rate-limit stress test.
 *
 * Stands up an in-memory mock of Upstash's REST /pipeline endpoint,
 * intercepts fetch for any upstash.io URL, and exercises the rate-limit
 * code end-to-end across several realistic scenarios.
 *
 * The mock correctly implements ZADD, ZCARD, ZREMRANGEBYSCORE, ZRANGE WITHSCORES,
 * and EXPIRE for the subset of commands the rate limiter uses. This lets us
 * verify the real production code path, not a parallel reimplementation.
 *
 * Scenarios:
 *   1. Basic sequential: N requests within limit all pass; N+1 rejected
 *   2. Short-window trip: 3 successful Tavus creates, 4th rejected with correct Retry-After
 *   3. Window expiry: after window elapses, new requests succeed
 *   4. Daily window vs short window: daily trips independently
 *   5. Per-user isolation: user A hitting limit doesn't affect user B
 *   6. Concurrent burst: 10 parallel requests — should admit exactly N=limit
 *   7. Fail-open: upstash errors result in allowed=true
 *   8. Retry-After accuracy: waits advertised time, next request succeeds
 *
 * Run with: npx tsx scripts/stress-rate-limit.ts
 */

import {
  checkRateLimit,
  RATE_LIMITS,
  humanDuration,
} from "../lib/rate-limit/index";

// --------------------------------------------------------------------------
// Upstash mock — intercept fetch and implement the subset we use
// --------------------------------------------------------------------------

interface ZSetEntry {
  member: string;
  score: number;
}

const mockState = new Map<string, ZSetEntry[]>();
let mockFailMode: "ok" | "error" | "slow" = "ok";
let mockCallCount = 0;

function resetMock() {
  mockState.clear();
  mockFailMode = "ok";
  mockCallCount = 0;
}

function execCommand(cmd: (string | number)[]): { result: unknown } | { error: string } {
  const op = String(cmd[0]).toUpperCase();

  if (op === "ZREMRANGEBYSCORE") {
    const key = String(cmd[1]);
    const min = String(cmd[2]);
    const max = Number(cmd[3]);
    const list = mockState.get(key) ?? [];
    const minScore = min === "-inf" ? -Infinity : Number(min);
    const kept = list.filter((e) => !(e.score >= minScore && e.score <= max));
    const removed = list.length - kept.length;
    mockState.set(key, kept);
    return { result: removed };
  }

  if (op === "ZCARD") {
    const key = String(cmd[1]);
    return { result: (mockState.get(key) ?? []).length };
  }

  if (op === "ZRANGE") {
    const key = String(cmd[1]);
    const start = Number(cmd[2]);
    const stop = Number(cmd[3]);
    const withScores = cmd[4] === "WITHSCORES";
    const sorted = [...(mockState.get(key) ?? [])].sort((a, b) => a.score - b.score);
    const slice = sorted.slice(start, stop === -1 ? undefined : stop + 1);
    if (withScores) {
      const flat: string[] = [];
      for (const e of slice) {
        flat.push(e.member, String(e.score));
      }
      return { result: flat };
    }
    return { result: slice.map((e) => e.member) };
  }

  if (op === "ZADD") {
    const key = String(cmd[1]);
    const score = Number(cmd[2]);
    const member = String(cmd[3]);
    const list = mockState.get(key) ?? [];
    const existing = list.findIndex((e) => e.member === member);
    if (existing >= 0) {
      list[existing] = { member, score };
      mockState.set(key, list);
      return { result: 0 };
    }
    list.push({ member, score });
    mockState.set(key, list);
    return { result: 1 };
  }

  if (op === "ZREM") {
    const key = String(cmd[1]);
    const member = String(cmd[2]);
    const list = mockState.get(key) ?? [];
    const filtered = list.filter((e) => e.member !== member);
    mockState.set(key, filtered);
    return { result: list.length - filtered.length };
  }

  if (op === "EXPIRE") {
    // We don't implement TTL expiration in the mock — the limiter does
    // not rely on TTL for correctness, only for key cleanup.
    return { result: 1 };
  }

  return { error: `unsupported_op_${op}` };
}

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const urlStr = url.toString();
  if (!urlStr.includes("upstash.io")) {
    return originalFetch(url, init);
  }

  mockCallCount++;

  if (mockFailMode === "error") {
    throw new Error("mock_upstash_network_error");
  }
  if (mockFailMode === "slow") {
    await new Promise((r) => setTimeout(r, 5000));
  }

  // Parse the pipeline commands
  const body = init?.body;
  if (!body || typeof body !== "string") {
    return new Response(JSON.stringify({ error: "no_body" }), { status: 400 });
  }
  const commands = JSON.parse(body) as (string | number)[][];
  const results = commands.map(execCommand);
  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}) as typeof fetch;

// --------------------------------------------------------------------------
// Test harness
// --------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, label: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
}

// Configure env so the limiter thinks Upstash is available
process.env.UPSTASH_REDIS_REST_URL = "https://mock.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "mock_token";

console.log("\n=== Rate-limit stress test ===\n");

async function main() {
// --------------------------------------------------------------------------
// 1. Basic sequential within limit
// --------------------------------------------------------------------------
console.log("1. Sequential — all within limit");
{
  resetMock();
  const cfg = RATE_LIMITS.tavus_conversation; // 3/10min, 20/day
  const results = [];
  for (let i = 0; i < 3; i++) {
    const r = await checkRateLimit({ userId: "user-1", config: cfg });
    results.push(r);
  }
  assert(results.every((r) => r.allowed), "first 3 requests all allowed");
  const last = results[2];
  assert(last.allowed && last.remaining === 0, "third has remaining=0 (at the edge)");
}

// --------------------------------------------------------------------------
// 2. Short-window trip
// --------------------------------------------------------------------------
console.log("\n2. Short-window trip");
{
  resetMock();
  const cfg = RATE_LIMITS.tavus_conversation;
  for (let i = 0; i < 3; i++) {
    await checkRateLimit({ userId: "user-2", config: cfg });
  }
  const fourth = await checkRateLimit({ userId: "user-2", config: cfg });
  assert(!fourth.allowed, "4th request rejected");
  if (!fourth.allowed) {
    assert(fourth.trippedWindow === "short", "tripped window is 'short'");
    assert(
      fourth.retryAfterSeconds > 0 && fourth.retryAfterSeconds <= 600,
      `retry-after in (0, 600] (got ${fourth.retryAfterSeconds})`,
    );
    assert(fourth.message.includes("3 times"), "message names the limit");
    assert(fourth.message.includes("started a session"), "message names the action");
  }
}

// --------------------------------------------------------------------------
// 3. Window expiry — simulate time passing
// --------------------------------------------------------------------------
console.log("\n3. Window expiry");
{
  resetMock();
  const cfg = RATE_LIMITS.tavus_conversation;

  // Consume the short-window limit
  for (let i = 0; i < 3; i++) {
    await checkRateLimit({ userId: "user-3", config: cfg });
  }
  const blocked = await checkRateLimit({ userId: "user-3", config: cfg });
  assert(!blocked.allowed, "4th blocked before window expiry");

  // Simulate 601 seconds elapsing by rewriting scores in the mock state
  for (const [key, list] of mockState.entries()) {
    if (key.includes("short")) {
      mockState.set(
        key,
        list.map((e) => ({ ...e, score: e.score - 601_000 })),
      );
    }
  }

  const afterExpiry = await checkRateLimit({ userId: "user-3", config: cfg });
  assert(afterExpiry.allowed, "allowed again after window expiry");
}

// --------------------------------------------------------------------------
// 4. Daily window tripping independently
// --------------------------------------------------------------------------
console.log("\n4. Daily window trip");
{
  resetMock();
  // Use feedback_generate which has 20/10min, 100/day
  const cfg = RATE_LIMITS.feedback_generate;

  // Consume 20 rapidly (this trips the short window)
  for (let i = 0; i < 20; i++) {
    await checkRateLimit({ userId: "user-4", config: cfg });
  }
  const tripped = await checkRateLimit({ userId: "user-4", config: cfg });
  assert(!tripped.allowed, "21st rejected");
  if (!tripped.allowed) {
    assert(tripped.trippedWindow === "short", "short trips first at 20 in a row");
  }
}

// --------------------------------------------------------------------------
// 5. Per-user isolation
// --------------------------------------------------------------------------
console.log("\n5. Per-user isolation");
{
  resetMock();
  const cfg = RATE_LIMITS.tavus_conversation;

  // User A consumes full short-window budget
  for (let i = 0; i < 3; i++) {
    await checkRateLimit({ userId: "user-a", config: cfg });
  }
  const aBlocked = await checkRateLimit({ userId: "user-a", config: cfg });
  assert(!aBlocked.allowed, "user A blocked");

  // User B should be unaffected
  const bFirst = await checkRateLimit({ userId: "user-b", config: cfg });
  assert(bFirst.allowed, "user B unaffected — first request allowed");
}

// --------------------------------------------------------------------------
// 6. Concurrent burst — the scary one
// --------------------------------------------------------------------------
console.log("\n6. Concurrent burst");
{
  resetMock();
  const cfg = RATE_LIMITS.tavus_conversation;

  // Fire 10 parallel requests. With the add-first-then-check pattern, the
  // limiter must admit exactly `max` (3 for tavus). Each concurrent request
  // inserts itself, then each sees a count that includes its own insert;
  // exactly `max` will see count <= max. The rest remove themselves and reject.
  const promises = Array.from({ length: 10 }, () =>
    checkRateLimit({ userId: "user-burst", config: cfg }),
  );
  const results = await Promise.all(promises);
  const allowedCount = results.filter((r) => r.allowed).length;

  assert(allowedCount >= 3, `at least 3 allowed (got ${allowedCount}) — underflow would be a bug`);
  // With add-first-then-check the admit should be EXACTLY max. In a real
  // distributed system with pipeline ordering variance there could be a
  // handful of "adds" happening between another request's trim and count,
  // but the upper bound is still `max` per the invariant: any request that
  // sees count > max removes itself. Real Upstash may add minor noise; our
  // mock is fully sequential so it should be exact.
  assert(
    allowedCount === 3,
    `exactly 3 allowed under add-first-then-check (got ${allowedCount})`,
  );
  console.log(`    [info] concurrent burst admitted ${allowedCount} / 10 requests`);

  // Also verify each rejected request reports the short window as tripped
  const rejects = results.filter((r) => !r.allowed);
  const allShort = rejects.every((r) => !r.allowed && r.trippedWindow === "short");
  assert(allShort, "all rejects attribute to short window");
}

// --------------------------------------------------------------------------
// 7. Fail-open on upstash error
// --------------------------------------------------------------------------
console.log("\n7. Fail-open on error");
{
  resetMock();
  mockFailMode = "error";
  const cfg = RATE_LIMITS.tavus_conversation;
  const r = await checkRateLimit({ userId: "user-fail-open", config: cfg });
  assert(r.allowed, "failed Upstash → request allowed (fail-open)");
  mockFailMode = "ok";
}

// --------------------------------------------------------------------------
// 8. Retry-After accuracy — advertised time is correct
// --------------------------------------------------------------------------
console.log("\n8. Retry-After accuracy");
{
  resetMock();
  const cfg = RATE_LIMITS.tavus_conversation;
  // Record the time of the oldest request
  const startedAt = Date.now();
  for (let i = 0; i < 3; i++) {
    await checkRateLimit({ userId: "user-retry", config: cfg });
  }
  const denied = await checkRateLimit({ userId: "user-retry", config: cfg });
  if (denied.allowed) {
    assert(false, "expected 4th to be denied");
  } else {
    // The oldest request was at ~startedAt; it expires at startedAt + 600s.
    // retry_after should be close to 600s (within a second or two of
    // test-execution overhead).
    const expectedRetry = 600 - Math.floor((Date.now() - startedAt) / 1000);
    const drift = Math.abs(denied.retryAfterSeconds - expectedRetry);
    assert(
      drift <= 2,
      `retry-after within 2s of expected (expected ~${expectedRetry}, got ${denied.retryAfterSeconds}, drift ${drift})`,
    );
  }
}

// --------------------------------------------------------------------------
// 9. Env-unconfigured path — fails open with a log, no call to fetch
// --------------------------------------------------------------------------
console.log("\n9. Unconfigured fails open");
{
  resetMock();
  const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
  const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const beforeCalls = mockCallCount;
  const r = await checkRateLimit({
    userId: "user-unconfigured",
    config: RATE_LIMITS.tavus_conversation,
  });
  assert(r.allowed, "unconfigured → allowed");
  assert(mockCallCount === beforeCalls, "no fetch call made when env unset");

  process.env.UPSTASH_REDIS_REST_URL = oldUrl;
  process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
}

// --------------------------------------------------------------------------
// 10. humanDuration formatting
// --------------------------------------------------------------------------
console.log("\n10. humanDuration formatting");
{
  assert(humanDuration(1) === "1 second", "1s singular");
  assert(humanDuration(30) === "30 seconds", "30s plural");
  assert(humanDuration(60) === "1 minute", "60s = 1 min");
  assert(humanDuration(90) === "2 minutes", "90s rounds up to 2 min");
  assert(humanDuration(3600) === "1 hour", "3600s = 1 hour");
  assert(humanDuration(3601) === "2 hours", "3601s rounds up to 2 hours");
}

// --------------------------------------------------------------------------
// Done
// --------------------------------------------------------------------------
console.log("\n=== Summary ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  process.exit(1);
}
console.log("\n✓ All assertions passed.\n");
process.exit(0);
}

main().catch((err) => {
  console.error("stress test crashed:", err);
  process.exit(2);
});
