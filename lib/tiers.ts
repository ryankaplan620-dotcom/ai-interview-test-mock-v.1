/**
 * Folio tier configuration.
 *
 * Single source of truth for:
 *  - Tier feature matrix (what each tier can do)
 *  - Pricing display (monthly, yearly amounts)
 *  - Usage limits (session retention, outreach quotas)
 *
 * Pricing values are display-only. Actual billing goes through Stripe price IDs
 * configured in environment variables.
 */

import type { SubscriptionTier } from "@/types/supabase";

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: number; // USD
  yearlyPrice: number; // USD (already discounted)
  yearlyMonthlyEquivalent: number; // USD per month on yearly plan
  stripeEnvKey: {
    monthly: string;
    yearly: string;
  };
  features: TierFeatureMatrix;
  limits: TierLimits;
  requiresVerification: boolean;
}

export interface TierFeatureMatrix {
  // Core
  unlimitedSessions: boolean;
  allPersonas: boolean;
  quoteFeedback: boolean;

  // Calibration (Pro+)
  firmCalibration: boolean;
  panelSimulation: boolean;
  endOfInterviewQA: boolean;
  pauseCoaching: boolean;
  voiceAcousticAnalysis: boolean;
  sessionMemory: boolean;

  // Max-only
  superdayMode: boolean;
  hardMode: boolean;
  nonVerbalFeedback: boolean;
  questionIntelligenceEngine: boolean;
  callback: boolean;
}

export interface TierLimits {
  sessionRetentionCount: number | "unlimited";
  outreachContactsPerMonth: number; // 0 = none, Infinity = unlimited
  storageRetentionDays: number; // how long recordings persist
}

// ==========================================================================
// THE TIERS
// ==========================================================================

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  trial: {
    id: "trial",
    name: "Free trial",
    tagline: "15 days of General, no card required.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyMonthlyEquivalent: 0,
    stripeEnvKey: { monthly: "", yearly: "" },
    features: {
      unlimitedSessions: true,
      allPersonas: true,
      quoteFeedback: true,
      firmCalibration: false,
      panelSimulation: false,
      endOfInterviewQA: false,
      pauseCoaching: false,
      voiceAcousticAnalysis: false,
      sessionMemory: false,
      superdayMode: false,
      hardMode: false,
      nonVerbalFeedback: false,
      questionIntelligenceEngine: false,
      callback: false,
    },
    limits: {
      sessionRetentionCount: 10,
      outreachContactsPerMonth: 0,
      storageRetentionDays: 15,
    },
    requiresVerification: false,
  },

  student: {
    id: "student",
    name: "Student",
    tagline: "Everything in General, at half price.",
    monthlyPrice: 5.99,
    yearlyPrice: 57.48,
    yearlyMonthlyEquivalent: 4.79,
    stripeEnvKey: {
      monthly: "STRIPE_PRICE_STUDENT_MONTHLY",
      yearly: "STRIPE_PRICE_STUDENT_YEARLY",
    },
    features: {
      unlimitedSessions: true,
      allPersonas: true,
      quoteFeedback: true,
      firmCalibration: false,
      panelSimulation: false,
      endOfInterviewQA: false,
      pauseCoaching: false,
      voiceAcousticAnalysis: false,
      sessionMemory: false,
      superdayMode: false,
      hardMode: false,
      nonVerbalFeedback: false,
      questionIntelligenceEngine: false,
      callback: false,
    },
    limits: {
      sessionRetentionCount: 10,
      outreachContactsPerMonth: 0,
      storageRetentionDays: 30,
    },
    requiresVerification: true,
  },

  general: {
    id: "general",
    name: "General",
    tagline: "The default tier. Everything you need to start.",
    monthlyPrice: 9.99,
    yearlyPrice: 95.88,
    yearlyMonthlyEquivalent: 7.99,
    stripeEnvKey: {
      monthly: "STRIPE_PRICE_GENERAL_MONTHLY",
      yearly: "STRIPE_PRICE_GENERAL_YEARLY",
    },
    features: {
      unlimitedSessions: true,
      allPersonas: true,
      quoteFeedback: true,
      firmCalibration: false,
      panelSimulation: false,
      endOfInterviewQA: false,
      pauseCoaching: false,
      voiceAcousticAnalysis: false,
      sessionMemory: false,
      superdayMode: false,
      hardMode: false,
      nonVerbalFeedback: false,
      questionIntelligenceEngine: false,
      callback: false,
    },
    limits: {
      sessionRetentionCount: 10,
      outreachContactsPerMonth: 0,
      storageRetentionDays: 30,
    },
    requiresVerification: false,
  },

  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Firm-specific calibration and panel simulation.",
    monthlyPrice: 19.99,
    yearlyPrice: 191.88,
    yearlyMonthlyEquivalent: 15.99,
    stripeEnvKey: {
      monthly: "STRIPE_PRICE_PRO_MONTHLY",
      yearly: "STRIPE_PRICE_PRO_YEARLY",
    },
    features: {
      unlimitedSessions: true,
      allPersonas: true,
      quoteFeedback: true,
      firmCalibration: true,
      panelSimulation: true,
      endOfInterviewQA: true,
      pauseCoaching: true,
      voiceAcousticAnalysis: true,
      sessionMemory: true,
      superdayMode: false,
      hardMode: false,
      nonVerbalFeedback: false,
      questionIntelligenceEngine: false,
      callback: false,
    },
    limits: {
      sessionRetentionCount: 30,
      outreachContactsPerMonth: 10,
      storageRetentionDays: 90,
    },
    requiresVerification: false,
  },

  max: {
    id: "max",
    name: "Max",
    tagline: "Superday, Hard Mode, and everything else.",
    monthlyPrice: 30.0,
    yearlyPrice: 287.88,
    yearlyMonthlyEquivalent: 23.99,
    stripeEnvKey: {
      monthly: "STRIPE_PRICE_MAX_MONTHLY",
      yearly: "STRIPE_PRICE_MAX_YEARLY",
    },
    features: {
      unlimitedSessions: true,
      allPersonas: true,
      quoteFeedback: true,
      firmCalibration: true,
      panelSimulation: true,
      endOfInterviewQA: true,
      pauseCoaching: true,
      voiceAcousticAnalysis: true,
      sessionMemory: true,
      superdayMode: true,
      hardMode: true,
      nonVerbalFeedback: true,
      questionIntelligenceEngine: true,
      callback: true,
    },
    limits: {
      sessionRetentionCount: "unlimited",
      outreachContactsPerMonth: Infinity,
      storageRetentionDays: 365 * 5,
    },
    requiresVerification: false,
  },
};

// ==========================================================================
// COACH REVIEW ADD-ON
// ==========================================================================

export const COACH_REVIEW = {
  price: 49.0,
  stripeEnvKey: "STRIPE_PRICE_COACH_REVIEW",
  description: "One-off review of a completed session by a human coach.",
};

// ==========================================================================
// HELPERS
// ==========================================================================

/**
 * Compare two tiers — returns true if tier A has at least the features of tier B.
 * Used for feature gating.
 */
export function tierHasFeature(tier: SubscriptionTier, feature: keyof TierFeatureMatrix): boolean {
  return TIERS[tier].features[feature];
}

/** Is the user on any paid tier? */
export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier !== "trial";
}

/** Annual savings percentage — calculated from monthly vs yearly price */
export function annualSavingsPercent(tier: SubscriptionTier): number {
  const t = TIERS[tier];
  if (t.monthlyPrice === 0) return 0;
  const annualAtMonthlyRate = t.monthlyPrice * 12;
  const savings = annualAtMonthlyRate - t.yearlyPrice;
  return Math.round((savings / annualAtMonthlyRate) * 100);
}

/** Format a dollar amount for display: 9.99 → "$9.99" */
export function formatPrice(amount: number): string {
  if (amount === 0) return "Free";
  return `$${amount.toFixed(2)}`;
}

/** Resolve the Stripe price ID at runtime from env */
export function getStripePriceId(tier: SubscriptionTier, cycle: "monthly" | "yearly"): string | null {
  const envKey = TIERS[tier].stripeEnvKey[cycle];
  if (!envKey) return null;
  return process.env[envKey] ?? null;
}
