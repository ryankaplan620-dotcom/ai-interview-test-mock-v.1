/**
 * Feedback types — shape of what Claude returns via tool_use and what
 * gets persisted to session_feedback.
 */

export interface FeedbackQuote {
  /** The candidate's actual words (verbatim from transcript). */
  user_quote: string;
  /** How it could have been said better. */
  stronger_version: string;
  /** Why the stronger version lands harder. */
  reasoning: string;
  /** Optional: seconds into the session when this was said. */
  timestamp_seconds?: number;
}

export interface FeedbackPayload {
  /** Holistic 0-100 judgment. Not a mechanical average of sub-scores. */
  overall_score: number;
  /** Structure: did they organise answers with clear logic. */
  structure_score: number;
  /** Specificity: did they use concrete examples, not generic claims. */
  specificity_score: number;
  /** Delivery: pacing, filler, confidence, directness. */
  delivery_score: number;
  /** One-paragraph prose summary (2-3 sentences). */
  summary: string;
  /** 3-5 things the candidate did well. Specific, not generic. */
  strengths: string[];
  /** 3-5 things the candidate should work on. Specific, actionable. */
  improvements: string[];
  /** 3-5 quote-based coaching moments. */
  feedback_quotes: FeedbackQuote[];
}
