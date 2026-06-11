import type { InterviewType, SessionMode } from "@/types/supabase";

/**
 * Display label for an interview type.
 * Used consistently across session views, rows, feedback, and pipeline prose.
 */
export function formatInterviewType(t: InterviewType): string {
  const map: Record<InterviewType, string> = {
    behavioral: "Behavioral",
    case: "Case",
    technical: "Technical",
    product_sense: "Product sense",
    superday: "Superday",
    hard_mode: "Hard mode",
  };
  return map[t];
}

/** Display label for a session difficulty mode. */
export function formatSessionMode(m: SessionMode): string {
  const map: Record<SessionMode, string> = {
    easy: "Easy",
    standard: "Standard",
    hard: "Hard",
  };
  return map[m];
}
