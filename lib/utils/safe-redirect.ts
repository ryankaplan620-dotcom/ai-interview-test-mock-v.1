/**
 * Path-only allowlist for post-auth redirect targets.
 *
 * Rejects protocol-relative ("//host") and backslash-based ("/\host")
 * payloads — the WHATWG URL parser treats "\" as "/" for special schemes,
 * so `new URL("/\\evil.com", origin)` resolves to `http://evil.com/`. Also
 * strips ASCII tab/newline before checking, since the URL parser strips
 * them first too (e.g. "/\t/evil.com" would otherwise slip through as
 * protocol-relative once stripped).
 */
export function isSafeRedirectPath(rawPath: string): boolean {
  const stripped = rawPath.replace(/[\t\n\r]/g, "");
  return /^\/(?!\/|\\)/.test(stripped);
}
