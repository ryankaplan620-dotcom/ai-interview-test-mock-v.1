/**
 * Cookie-consent helpers. Reads and writes the `folio-cookie-consent`
 * first-party cookie that records the user's decision.
 *
 * Three possible decision states:
 *   - "unset"     — user hasn't made a choice yet; banner should show
 *   - "accepted"  — user accepted optional analytics cookies
 *   - "dismissed" — user clicked "only necessary" / closed the banner
 *
 * Analytics code (PostHog init) must gate on state === "accepted".
 */

export type CookieConsentState = "unset" | "accepted" | "dismissed";

const COOKIE_NAME = "folio-cookie-consent";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * Read the current consent state from document.cookie (client-side).
 * Returns "unset" when the cookie is not present or has an unrecognised value.
 */
export function readConsent(): CookieConsentState {
  if (typeof document === "undefined") return "unset";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
  );
  if (!match) return "unset";
  const value = decodeURIComponent(match[1]);
  if (value === "accepted" || value === "dismissed") return value;
  return "unset";
}

/**
 * Write the consent state. Secure + SameSite=Lax so it follows the site
 * across normal navigation but is not exposed to third-party iframes.
 */
export function writeConsent(state: CookieConsentState): void {
  if (typeof document === "undefined") return;
  if (state === "unset") {
    // Effectively clear it — set with Max-Age=0
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(state)}`,
    `Max-Age=${ONE_YEAR_SECONDS}`,
    `Path=/`,
    `SameSite=Lax`,
  ];
  // Only set Secure in production (breaks localhost http)
  if (typeof location !== "undefined" && location.protocol === "https:") {
    parts.push("Secure");
  }
  document.cookie = parts.join("; ");
}
