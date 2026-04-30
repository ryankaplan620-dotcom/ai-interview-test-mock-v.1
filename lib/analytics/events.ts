"use client";

/**
 * Typed PostHog event helpers.
 * Import and call these from client components to track key user actions.
 * PostHog must be initialized in the app (already done via PostHogProvider if it exists,
 * or via the posthog-js script).
 */

type PostHogInstance = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (id: string, properties?: Record<string, unknown>) => void;
};

function getPostHog(): PostHogInstance | null {
  if (typeof window === "undefined") return null;
  // posthog-js attaches to window.posthog
  const ph = (window as unknown as Record<string, unknown>).posthog as PostHogInstance | undefined;
  return ph ?? null;
}

// ---- Session events ----

export function trackSessionStarted(props: {
  sessionId: string;
  personaId: string;
  interviewType: string;
  mode: string;
  targetFirm?: string;
}) {
  getPostHog()?.capture("session_started", props);
}

export function trackSessionEnded(props: {
  sessionId: string;
  personaId: string;
  durationSeconds: number;
  status: "completed" | "abandoned" | "failed";
}) {
  getPostHog()?.capture("session_ended", props);
}

// ---- Feedback events ----

export function trackFeedbackViewed(props: {
  sessionId: string;
  overallScore: number | null;
}) {
  getPostHog()?.capture("feedback_viewed", props);
}

// ---- Practice events ----

export function trackDrillStarted(props: {
  drillId: string;
  drillType: string;
  promptId: string;
}) {
  getPostHog()?.capture("drill_started", props);
}

export function trackDrillCompleted(props: {
  drillId: string;
  drillType: string;
  attemptCount: number;
  finalScore: number | null;
}) {
  getPostHog()?.capture("drill_completed", props);
}

// ---- Signup / conversion events ----

export function trackSignupCompleted(props: {
  method: "email" | "oauth";
}) {
  getPostHog()?.capture("signup_completed", props);
}

export function trackPricingViewed() {
  getPostHog()?.capture("pricing_viewed");
}

export function trackCheckoutStarted(props: {
  tier: string;
  priceUsd: number;
}) {
  getPostHog()?.capture("checkout_started", props);
}

// ---- Page views (auto-tracked by PostHog, but explicit for key pages) ----

export function trackLandingPageViewed() {
  getPostHog()?.capture("landing_page_viewed");
}

// ---- Identity ----

export function identifyUser(userId: string, email: string) {
  getPostHog()?.identify(userId, { email });
}
