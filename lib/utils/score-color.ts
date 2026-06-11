/**
 * Returns a Tailwind text color class for a 0–100 interview score.
 * Used consistently across feedback, session rows, and practice views.
 */
export function scoreColorClass(score: number): string {
  if (score >= 85) return "text-accent";
  if (score >= 70) return "text-text-primary";
  if (score >= 55) return "text-amber-300/90";
  return "text-rose-300/90";
}

/**
 * Background variant for meter/bar fills — same thresholds, softer opacities.
 */
export function scoreColorBarClass(score: number): string {
  if (score >= 85) return "bg-accent";
  if (score >= 70) return "bg-text-primary/50";
  if (score >= 55) return "bg-amber-300/70";
  return "bg-rose-300/70";
}
