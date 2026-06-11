/**
 * Formats a second count as "m:ss" (e.g. 95 → "1:35").
 * Used for transcript timestamps and elapsed-time displays.
 */
export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
