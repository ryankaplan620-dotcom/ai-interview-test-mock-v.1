/**
 * lib/paywall.ts
 *
 * Paywall enforcement for feature access and free tier abuse prevention.
 *
 * Called from route handlers before any paid feature is invoked:
 *   - /api/interview/start   → checkFeatureAccess(userId, 'interview')
 *   - /api/comms/start       → checkFeatureAccess(userId, 'comms')
 *   - /api/outreach/send     → checkFeatureAccess(userId, 'outreach')
 *
 * Returns a verdict the handler uses to either proceed or 402 the request.
 */

import { TIERS, TierKey, getAllotment, isFeatureAvailable } from './tiers';

export type FeatureKey = 'interview' | 'comms' | 'outreach';

export type PaywallVerdict =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: PaywallDenialReason; upgradeTo: TierKey | null };

export type PaywallDenialReason =
  | 'feature_locked_on_tier'
  | 'allotment_exhausted'
  | 'subscription_inactive'
  | 'free_tier_used'
  | 'abuse_flagged';

export type UserSubscriptionState = {
  userId: string;
  tier: TierKey;
  subscriptionActive: boolean;
  // Usage counters, scoped to the current billing period for paid tiers
  // and lifetime for free tier.
  interviewSessionsUsed: number;
  commsSessionsUsed: number;
  outreachSendsUsedThisMonth: number;
  // Free tier abuse signals
  freeInterviewUsed: boolean;
  flaggedForAbuse: boolean;
};

/**
 * Primary paywall check. Call before invoking any paid feature.
 */
export function checkFeatureAccess(
  state: UserSubscriptionState,
  feature: FeatureKey,
): PaywallVerdict {
  // Subscription gating (paid tiers only)
  if (state.tier !== 'free' && !state.subscriptionActive) {
    return {
      allowed: false,
      reason: 'subscription_inactive',
      upgradeTo: state.tier,
    };
  }

  // Abuse flag blocks all feature access on free tier
  if (state.tier === 'free' && state.flaggedForAbuse) {
    return {
      allowed: false,
      reason: 'abuse_flagged',
      upgradeTo: 'basic',
    };
  }

  // Feature-tier compatibility
  if (!isFeatureAvailable(state.tier, feature)) {
    return {
      allowed: false,
      reason: 'feature_locked_on_tier',
      upgradeTo: suggestUpgradeTier(state.tier, feature),
    };
  }

  // Free tier lifetime interview limit
  if (state.tier === 'free' && feature === 'interview' && state.freeInterviewUsed) {
    return {
      allowed: false,
      reason: 'free_tier_used',
      upgradeTo: 'basic',
    };
  }

  // Allotment check
  const allotment = getAllotment(state.tier, feature);
  const used = usageForFeature(state, feature);
  const remaining = allotment - used;

  if (remaining <= 0) {
    // Paid tiers can trigger overage on interviews. Comms and outreach are
    // hard caps with no overage.
    if (feature === 'interview' && state.tier !== 'free') {
      // Handler will route to overage checkout flow instead of denying
      return { allowed: true, remaining: 0 };
    }
    return {
      allowed: false,
      reason: 'allotment_exhausted',
      upgradeTo: suggestUpgradeTier(state.tier, feature),
    };
  }

  return { allowed: true, remaining };
}

function usageForFeature(state: UserSubscriptionState, feature: FeatureKey): number {
  if (feature === 'interview') return state.interviewSessionsUsed;
  if (feature === 'comms') return state.commsSessionsUsed;
  if (feature === 'outreach') return state.outreachSendsUsedThisMonth;
  return 0;
}

function suggestUpgradeTier(current: TierKey, feature: FeatureKey): TierKey {
  if (current === 'free') return 'basic';
  if (current === 'basic') return 'pro';
  if (current === 'pro') return 'max';
  return current;
}

// ──────────────────────────────────────────────────────────
// Free tier abuse prevention
// ──────────────────────────────────────────────────────────

/**
 * Known disposable email domains. Block these at signup for free tier.
 * List is representative, not exhaustive. Supplement with a maintained
 * blocklist (e.g., disposable-email-domains on npm) for production.
 */
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'getairmail.com',
  'fakeinbox.com',
  'sharklasers.com',
  'maildrop.cc',
  'temp-mail.org',
  'tempail.com',
  'tempr.email',
  'mohmal.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true; // malformed email
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Rate limit for free signups by IP. Returns true if the IP has exceeded
 * the threshold in the window. Back this with Redis in production; for
 * MVP launch without Redis, a Supabase table with (ip, created_at) rows
 * and a periodic cleanup job is sufficient.
 */
export type SignupRateLimitCheck = {
  ip: string;
  signupsInLast24h: number;
  deviceFingerprint?: string;
  fingerprintMatchesExistingUser: boolean;
};

export function shouldBlockFreeSignup(check: SignupRateLimitCheck): {
  block: boolean;
  reason?: string;
} {
  if (check.signupsInLast24h >= 3) {
    return { block: true, reason: 'ip_rate_limit' };
  }
  if (check.fingerprintMatchesExistingUser) {
    return { block: true, reason: 'fingerprint_duplicate' };
  }
  return { block: false };
}
