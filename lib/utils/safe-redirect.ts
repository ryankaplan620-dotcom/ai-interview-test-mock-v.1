/**
 * Validates a user-supplied redirect target, allowing only same-origin paths.
 *
 * Rejects anything that isn't a single leading slash followed by a
 * non-slash, non-backslash character. This blocks the obvious `//evil.com`
 * (protocol-relative) case as well as `/\evil.com`, which both Node's and
 * browsers' URL parsers normalize to a protocol-relative URL and will
 * happily redirect off-origin.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !/^\/(?!\/|\\)/.test(raw)) {
    return fallback;
  }
  return raw;
}
