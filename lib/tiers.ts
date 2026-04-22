/**
 * Folio tier configuration.
 *
 * Defines subscription tiers, included allotments, and Stripe price references.
 * Stripe price IDs are loaded from env vars at runtime so the same code runs
 * across staging and production.
 *
 * Tier keys are persisted in the DB (subscription.tier column) and used as
 * metadata on Stripe subscriptions. Renaming a tier key requires coordinated
 * migration. Current structure is pre-launch locked in April 2026.
 */

export type TierKey = 'free' | 'basic' | 'pro' | 'max';

export type BillingPeriod = {
  days: number;
  label: string;
};

export type TierAllotments = {
  interviewSessions: number;
  interviewSessionMaxMinutes: number;
  commsSessions: number | 'locked';
  commsSessionMaxMinutes: number;
  outreachSendsPerMonth: number | 'locked';
};

export type TierOverage = {
  sessionPriceUsd: number;
  stripeEnvKey: string | null;
};

export type Tier = {
  key: TierKey;
  label: string;
  priceUsd: number;
  billing: BillingPeriod;
  requiresStudentVerification: boolean;
  stripeEnvKey: string | null;
  allotments: TierAllotments;
  overage: TierOverage;
  features: string[];
};

export const TIERS: Record<TierKey, Tier> = {
  free: {
    key: 'free',
    label: 'Free',
    priceUsd: 0,
    billing: { days: 0, label: 'Free forever' },
    requiresStudentVerification: false,
    stripeEnvKey: null,
    allotments: {
      interviewSessions: 1,
      interviewSessionMaxMinutes: 10,
      commsSessions: 'locked',
      commsSessionMaxMinutes: 0,
      outreachSendsPerMonth: 'locked',
    },
    overage: {
      sessionPriceUsd: 0,
      stripeEnvKey: null,
    },
    features: [
      'One interview session, 10 minute cap',
      'Full access to interviewer personas',
      'AI feedback after your session',
      'Communication training locked',
      'Outreach locked',
    ],
  },

  basic: {
    key: 'basic',
    label: 'Basic',
    priceUsd: 49,
    billing: { days: 90, label: '90 days' },
    requiresStudentVerification: true,
    stripeEnvKey: 'STRIPE_PRICE_BASIC',
    allotments: {
      interviewSessions: 3,
      interviewSessionMaxMinutes: 30,
      commsSessions: 4,
      commsSessionMaxMinutes: 10,
      outreachSendsPerMonth: 10,
    },
    overage: {
      sessionPriceUsd: 20,
      stripeEnvKey: 'STRIPE_PRICE_OVERAGE_STANDARD',
    },
    features: [
      '3 interview sessions, 30 minutes each',
      '4 communication training sessions',
      '10 outreach sends per month',
      'Student pricing via SheerID',
      'Basic personas and modes',
    ],
  },

  pro: {
    key: 'pro',
    label: 'Pro',
    priceUsd: 149,
    billing: { days: 365, label: '1 year' },
    requiresStudentVerification: false,
    stripeEnvKey: 'STRIPE_PRICE_PRO',
    allotments: {
      interviewSessions: 8,
      interviewSessionMaxMinutes: 30,
      commsSessions: 10,
      commsSessionMaxMinutes: 10,
      outreachSendsPerMonth: 30,
    },
    overage: {
      sessionPriceUsd: 20,
      stripeEnvKey: 'STRIPE_PRICE_OVERAGE_STANDARD',
    },
    features: [
      '8 interview sessions, 30 minutes each',
      '10 communication training sessions',
      '30 outreach sends per month',
      'Full persona set',
      'All interview modes',
      'Firm calibration',
    ],
  },

  max: {
    key: 'max',
    label: 'Max',
    priceUsd: 249,
    billing: { days: 365, label: '1 year' },
    requiresStudentVerification: false,
    stripeEnvKey: 'STRIPE_PRICE_MAX',
    allotments: {
      interviewSessions: 16,
      interviewSessionMaxMinutes: 30,
      commsSessions: 20,
      commsSessionMaxMinutes: 10,
      outreachSendsPerMonth: 100,
    },
    overage: {
      sessionPriceUsd: 15,
      stripeEnvKey: 'STRIPE_PRICE_OVERAGE_MAX',
    },
    features: [
      '16 interview sessions, 30 minutes each',
      '20 communication training sessions',
      '100 outreach sends per month',
      'Panel interviews',
      'Superday simulations',
      'Priority feedback queue',
      'Everything in Pro',
    ],
  },
};

/**
 * Default trial period in days for first-time subscription purchases.
 */
export const TRIAL_DAYS = 15;

/**
 * Ordered list of tiers for rendering the pricing page.
 * Free first, paid tiers ascending.
 */
export const TIER_ORDER: TierKey[] = ['free', 'basic', 'pro', 'max'];

/**
 * Paid tier keys. Useful for iterating tiers that have Stripe products.
 */
export const PAID_TIER_KEYS: TierKey[] = ['basic', 'pro', 'max'];

/**
 * Resolve the Stripe price ID for a given tier from env vars.
 * Returns null for free tier or if env var is unset.
 */
export function getStripePriceId(tierKey: TierKey): string | null {
  const tier = TIERS[tierKey];
  if (!tier.stripeEnvKey) return null;
  return process.env[tier.stripeEnvKey] ?? null;
}

/**
 * Resolve the Stripe overage price ID for a given tier from env vars.
 */
export function getOverageStripePriceId(tierKey: TierKey): string | null {
  const tier = TIERS[tierKey];
  if (!tier.overage.stripeEnvKey) return null;
  return process.env[tier.overage.stripeEnvKey] ?? null;
}

/**
 * Returns true if the given feature is available on the given tier.
 * Use this for paywall gating in route handlers.
 */
export function isFeatureAvailable(
  tierKey: TierKey,
  feature: 'interview' | 'comms' | 'outreach',
): boolean {
  const tier = TIERS[tierKey];
  if (feature === 'interview') {
    return tier.allotments.interviewSessions > 0;
  }
  if (feature === 'comms') {
    return tier.allotments.commsSessions !== 'locked';
  }
  if (feature === 'outreach') {
    return tier.allotments.outreachSendsPerMonth !== 'locked';
  }
  return false;
}

/**
 * Returns the included allotment for a given feature on a tier.
 * Returns 0 for locked features.
 */
export function getAllotment(
  tierKey: TierKey,
  feature: 'interview' | 'comms' | 'outreach',
): number {
  const tier = TIERS[tierKey];
  if (feature === 'interview') return tier.allotments.interviewSessions;
  if (feature === 'comms') {
    return tier.allotments.commsSessions === 'locked'
      ? 0
      : tier.allotments.commsSessions;
  }
  if (feature === 'outreach') {
    return tier.allotments.outreachSendsPerMonth === 'locked'
      ? 0
      : tier.allotments.outreachSendsPerMonth;
  }
  return 0;
}

/**
 * Format a USD price as a display string. E.g. 49 → "$49", 0 → "$0".
 */
export function formatPrice(amountUsd: number): string {
  if (amountUsd === 0) return '$0';
  return `$${amountUsd}`;
}

/**
 * Effective price per interview session if the user exhausts all included sessions.
 * Useful for "as low as $X / session" display on the pricing page.
 */
export function pricePerSessionAtFullUse(tierKey: TierKey): number {
  const tier = TIERS[tierKey];
  if (tier.allotments.interviewSessions === 0) return 0;
  return tier.priceUsd / tier.allotments.interviewSessions;
}

/**
 * Legacy feature-gate helper. Maps old feature matrix keys to checks against
 * the new tier structure. Used by session gates and the session picker.
 */
export type LegacyFeatureKey =
  | 'allPersonas'
  | 'unlimitedDrills'
  | 'quoteFeedback'
  | 'firmCalibration'
  | 'sessionMemory'
  | 'endOfInterviewQA'
  | 'panelSimulation'
  | 'superdayMode'
  | 'hardMode'
  | 'priorityFeedback'
  | 'nonVerbalFeedback'
  | 'questionIntelligenceEngine';

const FEATURE_TIER_THRESHOLDS: Record<LegacyFeatureKey, TierKey> = {
  allPersonas: 'basic',
  unlimitedDrills: 'basic',
  quoteFeedback: 'basic',
  firmCalibration: 'pro',
  sessionMemory: 'pro',
  endOfInterviewQA: 'pro',
  panelSimulation: 'max',
  superdayMode: 'max',
  hardMode: 'max',
  priorityFeedback: 'max',
  nonVerbalFeedback: 'max',
  questionIntelligenceEngine: 'max',
};

/**
 * Returns true if the given tier includes the specified legacy feature.
 * Tiers are ordered: free < basic < pro < max.
 */
export function tierHasFeature(tierKey: TierKey, feature: LegacyFeatureKey): boolean {
  const tierRank: Record<TierKey, number> = { free: 0, basic: 1, pro: 2, max: 3 };
  const requiredTier = FEATURE_TIER_THRESHOLDS[feature];
  return tierRank[tierKey] >= tierRank[requiredTier];
}
