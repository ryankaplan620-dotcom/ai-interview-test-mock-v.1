/**
 * Legal-document constants. Single source of truth for anything that appears
 * across ToS, Privacy, and Cookie pages. When you update ANY of these,
 * the effective date bumps automatically across all three documents.
 */

/**
 * The effective date that appears on the legal documents. Update when any
 * of the legal text materially changes. ISO 8601 so it renders deterministically.
 */
export const LEGAL_EFFECTIVE_DATE = "2026-04-21";

/**
 * Version string for each document. Incremented only when the content
 * materially changes (not on every typo fix). A version bump triggers a
 * user-notification requirement under the ToS's change-notice clause.
 */
export const LEGAL_VERSIONS = {
  terms: "1.0",
  privacy: "1.0",
  cookies: "1.0",
} as const;

/**
 * Company details. These are placeholders — update with your actual
 * registered business entity before publishing.
 *
 * Note on the entity question: PrepSpace is currently a sole-proprietor product
 * under your name. Before taking paid users, you should register an LLC
 * (Delaware or Florida, depending on where you plan to domicile). The ToS
 * lists the registered entity as the contracting party — running it under
 * "Ryan Holland" personally is legally valid but exposes you to personal
 * liability for anything that goes wrong (data breach, contract dispute,
 * user harm). An LLC separates personal and business liability and costs
 * ~$125 to register.
 *
 * TODO BEFORE PUBLISHING: replace these with real entity name, address, and
 * a contact email on the prepspace.example domain.
 */
export const COMPANY = {
  legal_name: "PrepSpace (operating as a sole proprietorship pending LLC registration)",
  short_name: "PrepSpace",
  product_domain: "prepspace.example",
  support_email: "support@prepspace.example",
  privacy_email: "privacy@prepspace.example",
  legal_email: "legal@prepspace.example",
  dpo_email: "privacy@prepspace.example",
  address_line_1: "[To be added upon entity registration]",
  address_line_2: "[City, State, ZIP]",
  governing_law: "State of Florida, United States of America",
  dispute_venue: "Miami-Dade County, Florida",
} as const;

/**
 * Canonical list of third-party processors. Privacy Policy lists each
 * with role and data categories. When you add a new processor (e.g.
 * Sentry in Phase I.4, Reddit API in Phase J), add it here FIRST and then
 * reference it in the privacy page.
 */
export interface Processor {
  name: string;
  role: string;
  data_categories: string[];
  jurisdiction: string;
  privacy_policy_url: string;
  /** True if the processor handles content the user directly creates (speech, video). */
  handles_user_content: boolean;
  /** Brief note on retention specific to this processor. */
  retention_note: string;
}

export const PROCESSORS: Processor[] = [
  {
    name: "Supabase",
    role: "Database, authentication, file storage for transcripts and feedback records",
    data_categories: ["account email", "profile fields", "session metadata", "feedback content", "memory notes", "transcript turns"],
    jurisdiction: "United States",
    privacy_policy_url: "https://supabase.com/privacy",
    handles_user_content: true,
    retention_note: "Retained for the life of your account plus 30 days after deletion. Hard-deleted on request.",
  },
  {
    name: "Tavus",
    role: "AI video interviewer (conversation rendering, avatar synthesis, speech-to-text and TTS during sessions)",
    data_categories: ["real-time audio and video of your practice sessions", "full session transcripts", "camera input"],
    jurisdiction: "United States",
    privacy_policy_url: "https://www.tavus.io/legal/privacy-policy",
    handles_user_content: true,
    retention_note: "Tavus records your sessions on their servers per their own retention policy. We delete Tavus conversation IDs on account deletion; recordings held by Tavus are subject to their policy. You can request Tavus deletion directly from us.",
  },
  {
    name: "Anthropic (Claude API)",
    role: "Feedback generation, memory extraction, Q&A scoring, boundary detection",
    data_categories: ["transcript text", "feedback summaries", "memory notes (interviewer voice)"],
    jurisdiction: "United States",
    privacy_policy_url: "https://www.anthropic.com/legal/privacy",
    handles_user_content: true,
    retention_note: "Anthropic does not use your transcripts to train their models (this is an API-only guarantee under their commercial terms). Data is retained per Anthropic's policy and is not stored at rest by PrepSpace beyond the feedback results we persist to our database.",
  },
  {
    name: "SheerID",
    role: "Student status verification for the discounted Basic tier",
    data_categories: ["full name", "school name", "enrollment status"],
    jurisdiction: "United States",
    privacy_policy_url: "https://www.sheerid.com/privacy-policy/",
    handles_user_content: false,
    retention_note: "SheerID stores verification outcomes per their policy. PrepSpace stores only the verification status (verified/rejected) and does not retain the underlying documentation.",
  },
  {
    name: "Stripe",
    role: "Payment processing, subscription billing, trial management",
    data_categories: ["payment method details", "billing address", "email", "subscription history"],
    jurisdiction: "United States",
    privacy_policy_url: "https://stripe.com/privacy",
    handles_user_content: false,
    retention_note: "Stripe retains transaction records per financial-regulation requirements (typically 7 years). PrepSpace stores only your Stripe customer ID and subscription status.",
  },
  {
    name: "Cloudflare R2",
    role: "Object storage for session transcripts and any other uploaded files",
    data_categories: ["transcript files (JSON)", "uploaded content"],
    jurisdiction: "United States",
    privacy_policy_url: "https://www.cloudflare.com/privacypolicy/",
    handles_user_content: true,
    retention_note: "Deleted when the parent session is deleted.",
  },
  {
    name: "Resend",
    role: "Transactional email (account verification, trial reminders, billing notifications)",
    data_categories: ["email address", "delivery metadata"],
    jurisdiction: "United States",
    privacy_policy_url: "https://resend.com/legal/privacy-policy",
    handles_user_content: false,
    retention_note: "Delivery logs per Resend's policy. We do not store email content beyond the templates.",
  },
  {
    name: "PostHog (conditional)",
    role: "Product analytics — only active if you accept analytics cookies",
    data_categories: ["page views", "event properties (clicks, feature usage)", "anonymous device fingerprint"],
    jurisdiction: "United States",
    privacy_policy_url: "https://posthog.com/privacy",
    handles_user_content: false,
    retention_note: "Retained per PostHog's retention settings (default 7 years but configurable). We anonymize IP addresses at ingest.",
  },
  {
    name: "Upstash Redis",
    role: "Per-user rate limiting for the session-create and feedback-generation endpoints",
    data_categories: ["user ID (UUID), request timestamps"],
    jurisdiction: "United States",
    privacy_policy_url: "https://upstash.com/trust/privacy.pdf",
    handles_user_content: false,
    retention_note: "Rate-limit counters auto-expire within 48 hours of the last request.",
  },
];

/**
 * Pretty-format the effective date for display.
 */
export function formatEffectiveDate(date = LEGAL_EFFECTIVE_DATE): string {
  const [y, m, d] = date.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}
