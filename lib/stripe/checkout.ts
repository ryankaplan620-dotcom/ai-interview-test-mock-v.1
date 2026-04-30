import { requireStripe } from "./client";
import { getStripePriceId, getOverageStripePriceId, TIERS, TRIAL_DAYS } from "@/lib/tiers";
import { createServiceRoleClient } from "@/lib/db/server";
import type { SubscriptionTier } from "@/types/supabase";
import type Stripe from "stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Create a Stripe Checkout session for a cycle subscription purchase.
 *
 * Behavior:
 *   - First purchase on the account: 15-day trial (Stripe handles via
 *     `subscription_data.trial_period_days`).
 *   - Subsequent purchases (renewal after cycle expiry): no trial.
 *
 * The Cycle tier requires SheerID-verified student status. This check
 * happens here rather than at the pricing page to prevent URL spoofing.
 */
export async function createSubscriptionCheckout({
  userId,
  email,
  tier,
}: {
  userId: string;
  email: string;
  tier: SubscriptionTier;
}): Promise<{ url: string }> {
  const stripe = requireStripe();
  const tierConfig = TIERS[tier];

  // Cycle tier requires verified-student status
  if (tierConfig.requiresStudentVerification) {
    const supabase = createServiceRoleClient();
    const { data: tierView } = await supabase
      .from("user_tiers")
      .select("is_verified_student")
      .eq("user_id", userId)
      .maybeSingle();

    if (!tierView?.is_verified_student) {
      throw new Error(
        `${tierConfig.label} plan requires verified enrollment. Complete student verification first.`,
      );
    }
  }

  const priceId = getStripePriceId(tier);
  if (!priceId) {
    throw new Error(`Stripe price ID not configured for ${tier}.`);
  }

  // Find or create Stripe customer
  const { customerId, hasPreviousPurchase } = await getOrCreateStripeCustomer({
    userId,
    email,
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      // First purchase gets the trial; renewals skip it
      ...(hasPreviousPurchase ? {} : { trial_period_days: TRIAL_DAYS }),
      metadata: {
        user_id: userId,
        tier,
      },
    },
    success_url: `${APP_URL}/dashboard?checkout=success&tier=${tier}`,
    cancel_url: `${APP_URL}/pricing?checkout=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    tax_id_collection: { enabled: false },
    automatic_tax: { enabled: false },
    metadata: {
      user_id: userId,
      tier,
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { url: checkoutSession.url };
}

/**
 * Create a one-off overage-session checkout. Used when a user has exhausted
 * their cycle quota and agreed to purchase additional sessions.
 *
 * Unlike the subscription checkout, this is payment-mode (single charge).
 * The session row has already been inserted server-side with is_overage=true;
 * this adds the payment record and, on webhook success, marks the
 * overage_purchases row as succeeded.
 */
export async function createOverageCheckout({
  userId,
  email,
  sessionId,
  tier,
}: {
  userId: string;
  email: string;
  sessionId: string;
  tier: SubscriptionTier;
}): Promise<{ url: string }> {
  const stripe = requireStripe();
  const priceId = getOverageStripePriceId(tier);
  if (!priceId) {
    throw new Error(`Overage Stripe price ID not configured for ${tier}.`);
  }

  const { customerId } = await getOrCreateStripeCustomer({ userId, email });

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/session/${sessionId}?overage=paid`,
    cancel_url: `${APP_URL}/session/new?overage=canceled`,
    automatic_tax: { enabled: false },
    metadata: {
      user_id: userId,
      session_id: sessionId,
      product_type: "overage_session",
      tier,
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { url: checkoutSession.url };
}

/**
 * Create a Customer Portal session so the user can manage their subscription.
 */
export async function createPortalSession({ userId }: { userId: string }): Promise<{ url: string }> {
  const stripe = requireStripe();
  const supabase = createServiceRoleClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    throw new Error("No Stripe customer found for this user.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${APP_URL}/settings`,
  });

  return { url: session.url };
}

/**
 * Find or create a Stripe customer for a user.
 * Returns customer_id + whether the user has made a previous purchase
 * (determines trial eligibility).
 */
async function getOrCreateStripeCustomer({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<{ customerId: string; hasPreviousPurchase: boolean }> {
  const stripe = requireStripe();
  const supabase = createServiceRoleClient();

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, cycle_start")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingSub?.stripe_customer_id) {
    return {
      customerId: existingSub.stripe_customer_id,
      hasPreviousPurchase: existingSub.cycle_start !== null,
    };
  }

  const customer: Stripe.Customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  // Stub subscription row — will be populated with real values by the
  // Stripe webhook when the checkout completes. cycle_start is null
  // so the trial-period-days logic knows this is a first-time purchase.
  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customer.id,
      tier: "basic",
      status: "incomplete",
    },
    { onConflict: "user_id" },
  );

  return { customerId: customer.id, hasPreviousPurchase: false };
}
