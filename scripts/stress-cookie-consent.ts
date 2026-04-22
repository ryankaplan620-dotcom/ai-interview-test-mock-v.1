/**
 * Stress test for the cookie-consent library.
 *
 * Exercises readConsent / writeConsent against a minimal document.cookie
 * mock. Verifies:
 *   - Fresh document returns "unset"
 *   - Round-trip write/read for accepted and dismissed
 *   - writeConsent("unset") clears the cookie
 *   - Malformed / unrecognised cookie values are treated as "unset"
 *   - Coexistence with other site cookies doesn't confuse the parser
 *   - Secure flag attached only when location.protocol === https:
 *
 * The simple `document.cookie` getter/setter mock mimics the real browser
 * behavior: setting a cookie string appends or replaces; reading returns
 * the joined list.
 *
 * Run: npx tsx scripts/stress-cookie-consent.ts
 */

// --------------------------------------------------------------------------
// Mock document + location
// --------------------------------------------------------------------------

interface CookieEntry {
  name: string;
  value: string;
  maxAge?: number;
}

const state = {
  cookies: new Map<string, CookieEntry>(),
  location: { protocol: "https:" } as { protocol: string },
};

function parseSetCookie(cookieStr: string): void {
  // Simplified parse — handle only what writeConsent emits
  const parts = cookieStr.split(";").map((p) => p.trim());
  const first = parts[0];
  const eq = first.indexOf("=");
  if (eq === -1) return;
  const name = first.slice(0, eq);
  const value = first.slice(eq + 1);

  let maxAge: number | undefined;
  for (const p of parts.slice(1)) {
    const [k, v] = p.split("=");
    if (k.toLowerCase() === "max-age") {
      maxAge = Number(v);
    }
  }
  if (maxAge === 0) {
    state.cookies.delete(name);
    return;
  }
  state.cookies.set(name, { name, value, maxAge });
}

function getCookieString(): string {
  return Array.from(state.cookies.values())
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

// Install the mock onto globalThis.document BEFORE importing the module
// that depends on document.cookie
(globalThis as unknown as { document: unknown }).document = {
  get cookie() {
    return getCookieString();
  },
  set cookie(val: string) {
    parseSetCookie(val);
  },
};

(globalThis as unknown as { location: unknown }).location = state.location;

// Now we can import
import { readConsent, writeConsent } from "../lib/legal/cookie-consent";

// --------------------------------------------------------------------------
// Harness
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

function resetCookies() {
  state.cookies.clear();
}

console.log("\n=== Cookie-consent stress test ===\n");

// 1. Fresh document
console.log("1. Fresh document");
{
  resetCookies();
  assert(readConsent() === "unset", "fresh doc reads as 'unset'");
}

// 2. Round-trip accepted
console.log("\n2. Round-trip: accepted");
{
  resetCookies();
  writeConsent("accepted");
  assert(readConsent() === "accepted", "write/read 'accepted' round-trip");
  assert(state.cookies.size === 1, "exactly one cookie written");
  assert(state.cookies.get("folio-cookie-consent")?.maxAge === 31_536_000, "Max-Age is 1 year");
}

// 3. Round-trip dismissed
console.log("\n3. Round-trip: dismissed");
{
  resetCookies();
  writeConsent("dismissed");
  assert(readConsent() === "dismissed", "write/read 'dismissed' round-trip");
}

// 4. Overwrite
console.log("\n4. Overwrite");
{
  resetCookies();
  writeConsent("accepted");
  writeConsent("dismissed");
  assert(readConsent() === "dismissed", "second write overwrites first");
  assert(state.cookies.size === 1, "still exactly one cookie");
}

// 5. Clear with "unset"
console.log("\n5. Clear with 'unset'");
{
  resetCookies();
  writeConsent("accepted");
  writeConsent("unset");
  assert(readConsent() === "unset", "writing 'unset' clears");
  assert(state.cookies.size === 0, "cookie fully removed");
}

// 6. Malformed value treated as unset
console.log("\n6. Malformed value");
{
  resetCookies();
  // Manually inject a garbage value
  state.cookies.set("folio-cookie-consent", {
    name: "folio-cookie-consent",
    value: "maybe",
  });
  assert(readConsent() === "unset", "unrecognised value treated as 'unset'");
}

// 7. Coexistence with other cookies
console.log("\n7. Coexistence with other cookies");
{
  resetCookies();
  state.cookies.set("sb-access-token", { name: "sb-access-token", value: "xyz.abc.def" });
  state.cookies.set("random", { name: "random", value: "noise" });
  writeConsent("accepted");
  assert(readConsent() === "accepted", "reads correctly alongside other cookies");
  state.cookies.set("another", { name: "another", value: "more=chaos=here" });
  assert(readConsent() === "accepted", "tolerates cookies with '=' in values");
}

// 8. Secure flag present on https
console.log("\n8. Secure flag");
{
  resetCookies();
  state.location.protocol = "https:";
  // Capture what writeConsent sends to document.cookie
  let lastWrite = "";
  const originalDesc = Object.getOwnPropertyDescriptor(globalThis.document, "cookie");
  Object.defineProperty(globalThis.document, "cookie", {
    configurable: true,
    get() {
      return getCookieString();
    },
    set(val: string) {
      lastWrite = val;
      parseSetCookie(val);
    },
  });
  writeConsent("accepted");
  assert(lastWrite.includes("Secure"), "Secure flag present on https");
  assert(lastWrite.includes("SameSite=Lax"), "SameSite=Lax always present");
  // restore
  if (originalDesc) {
    Object.defineProperty(globalThis.document, "cookie", originalDesc);
  }
}

// 9. No Secure flag on http (localhost)
console.log("\n9. No Secure on http");
{
  resetCookies();
  state.location.protocol = "http:";
  let lastWrite = "";
  const originalDesc = Object.getOwnPropertyDescriptor(globalThis.document, "cookie");
  Object.defineProperty(globalThis.document, "cookie", {
    configurable: true,
    get() {
      return getCookieString();
    },
    set(val: string) {
      lastWrite = val;
      parseSetCookie(val);
    },
  });
  writeConsent("accepted");
  assert(!lastWrite.includes("Secure"), "Secure absent on http (localhost dev)");
  if (originalDesc) {
    Object.defineProperty(globalThis.document, "cookie", originalDesc);
  }
  state.location.protocol = "https:";
}

// 10. Idempotent reads
console.log("\n10. Idempotent reads");
{
  resetCookies();
  writeConsent("accepted");
  const first = readConsent();
  const second = readConsent();
  const third = readConsent();
  assert(first === "accepted" && second === "accepted" && third === "accepted", "repeat reads stable");
}

// --------------------------------------------------------------------------
console.log(`\n=== Summary ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  process.exit(1);
}
console.log("\n✓ All assertions passed.\n");
process.exit(0);
