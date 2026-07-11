/**
 * Validates a user-supplied redirect target against open-redirect attacks.
 *
 * A plain `startsWith("/") && !startsWith("//")` check is not sufficient:
 * browsers (and the WHATWG URL parser used by `new URL()` / Next's router)
 * normalize a leading backslash into a forward slash for special schemes,
 * so `/\evil.com` becomes equivalent to `//evil.com` — a scheme-relative
 * URL pointing at an attacker-controlled host. Reject any leading slash
 * that is immediately followed by another `/` or `\`.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  if (!/^\/(?!\/|\\)/.test(raw)) return fallback;
  return raw;
}
