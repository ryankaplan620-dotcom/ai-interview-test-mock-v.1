/**
 * Folio tier configuration — cycle-based pricing.
 *
 * Folio is not a monthly-subscription product. It's a seasonal prep product
 * that users return to around recruiting cycles. Tiers are:
 *
 *   - Cycle: 90-day student pass, SheerID-gated
 *   - Pro:   365-day access, non-student default
 *   - Max:   365-day access with panel/superday/hard-mode and priority feedback
 *
 * Each tier has:
 *   - A price (charged once per cycle, auto-renewing by default)
 *   - Included session count (full Tavus-backed interviews)
 *   - Unlimited drills (cheap, retention-anchoring)
 *   - Overage rate for sessions beyond quota
 *
 * Unit economics (at Tavus CVI $0.37/min, ~$11.50 per 30-min session):
 *   Cycle $49 / 8 sessions  → ~$92 cost at full use, priced as acquisition product
 *   Pro   $149 / 24 sessions → breakeven at 13 sessions, ~40% margin at median usage
 *   Max   $249 / 40 sessions → breakeven at 22 sessions, ~30% margin at median usage
 *
 * The `trial` and `general` tiers from prior versions are removed. Trial is now
 * a 15-day window on any paid plan, handled in Stripe checkout config, not as
 * a separate tier. General is collapsed into Pro.
 */

import type { SubscriptionTier } from "@/types/supabase";

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  tagline: string;

  /** Price in USD charged per cycle. */
  price: number;
  /** Cycle length. */
  cycleDays: number;
  /** Human-readable cycle label for pricing UI. */
  cycleLabel: string;

  /** Stripe price ID env var key. */
  stripeEnvKey: string;

  /** Included full sessions per cycle. */
  includedSessions: number;
  /** Charge per overage session in USD. */
  overagePerSession: number;
  /** Stripe price ID env var key for the overage purchase (one-off). */
  overageStripeEnvKey: string;

  features: TierFeatureMatrix;
  requiresVerification: boolean;
}

export interface TierFeatureMatrix {
  unlimitedDrills: boolean;
  allPersonas: boolean;
  quoteFeedback: boolean;

  // Pro+
  firmCalibration: boolean;
  sessionMemory: boolean;
  endOfInterviewQA: boolean;

  // Max-only
  panelSimulation: boolean;
  superdayMode: boolean;
  hardMode: boolean;
  priorityFeedback: boolean;
  nonVerbalFeedback: boolean;
  questionIntelligenceEngine: boolean;
  callback: boolean;
}

// ==========================================================================
// THE TIERS
// ==========================================================================

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  /**
   * Cycle — SheerID-gated student tier.
   * 90 days, $49, 8 sessions. Near-breakeven by design; acquisition-priced.
   */
  cycle: {
    id: "cycle",
    name: "Cycle",
    tagline: "One recruiting cycle. The real thing, at student pricing.",
    price: 49,
    cycleDays: 90,
    cycleLabel: "90 days",
    stripeEnvKey: "STRIPE_PRICE_CYCLE",
    includedSessions: 8,
    overagePerSession: 8,
    overageStripeEnvKey: "STRIPE_PRICE_OVERAGE_STANDARD",
    features: {
      unlimitedDrills: true,
      allPersonas: true,
      quoteFeedback: true,
      firmCalibration: false,
      sessionMemory: false,
      endOfInterviewQA: false,
      panelSimulation: false,
      superdayMode: false,
      hardMode: false,
      priorityFeedback: false,
      nonVerbalFeedback: false,
      questionIntelligenceEngine: false,
      callback: false,
    },
    requiresVerification: true,
  },

  /**
   * Pro — the default paid tier.
   * 365 days, $149, 24 sessions. Covers two recruiting cycles.
   */
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "A full year of prep. Two recruiting cycles, all the drills you want.",
    price: 149,
    cycleDays: 365,
    cycleLabel: "Full year",
    stripeEnvKey: "STRIPE_PRICE_PRO",
    includedSessions: 24,
    overagePerSession: 8,
    overageStripeEnvKey: "STRIPE_PRICE_OVERAGE_STANDARD",
    features: {
      unlimitedDrills: true,
      allPersonas: true,
      quoteFeedback: true,
      firmCalibration: true,
      sessionMemory: true,
      endOfInterviewQA: true,
      panelSimulation: false,
      superdayMode: false,
      hardMode: false,
      priorityFeedback: false,
      nonVerbalFeedback: false,
      questionIntelligenceEngine: false,
      callback: false,
    },
    requiresVerification: false,
  },

  /**
   * Max — full-surface tier.
   * 365 days, $249, 40 sessions + panel/superday/hard-mode/priority-feedback.
   */
  max: {
    id: "max",
    name: "Max",
    tagline: "Panels, superdays, hard mode, and priority feedback — when every interview counts.",
    price: 249,
    cycleDays: 365,
    cycleLabel: "Full year",
    stripeEnvKey: "STRIPE_PRICE_MAX",
    includedSessions: 40,
    overagePerSession: 6,
    overageStripeEnvKey: "STRIPE_PRICE_OVERAGE_MAX",
    features: {
      unlimitedDrills: true,
      allPersonas: true,
      quoteFeedback: true,
      firmCalibration: true,
      sessionMemory: true,
      endOfInterviewQA: true,
      panelSimulation: true,
      superdayMode: true,
      hardMode: true,
      priorityFeedback: true,
      nonVerbalFeedback: true,
      questionIntelligenceEngine: true,
      callback: true,
    },
    requiresVerification: false,
  },
};

// ==========================================================================
// TRIAL WINDOW CONFIG
// ==========================================================================
// Trial is a 15-day window on any paid plan, not a separate tier.
// Stripe subscriptions are created with trial_period_days=15 on the first
// purchase per user. After 15 days, the card is charged.

export const TRIAL_DAYS = 15;

// ==========================================================================
// HELPERS
// ==========================================================================

export function tierHasFeature(
  tier: SubscriptionTier,
  feature: keyof TierFeatureMatrix,
): boolean {
  return TIERS[tier].features[feature];
}

export function formatPrice(amount: number): string {
  if (amount === 0) return "Free";
  return `$${Math.round(amount)}`;
}

export function getStripePriceId(tier: SubscriptionTier): string | null {
  const envKey = TIERS[tier].stripeEnvKey;
  return process.env[envKey] ?? null;
}

export function getOverageStripePriceId(tier: SubscriptionTier): string | null {
  const envKey = TIERS[tier].overageStripeEnvKey;
  return process.env[envKey] ?? null;
}

/**
 * Amortized per-session cost if the user uses every included session.
 * Used for pricing-page display ("just $6.21 per session at full use").
 */
export function pricePerSessionAtFullUse(tier: SubscriptionTier): number {
  const t = TIERS[tier];
  return t.price / t.includedSessions;
}
