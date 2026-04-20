import { requireStripe } from "./client";
import { getStripePriceId, COACH_REVIEW, TIERS } from "@/lib/tiers";
import { createServiceRoleClient } from "@/lib/db/server";
import type { SubscriptionTier, BillingCycle } from "@/types/supabase";
import type Stripe from "stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Create a Stripe Checkout session for a subscription upgrade.
 * Handles the case where the user already has a Stripe customer ID (returning user)
 * or needs one created (first upgrade).
 */
export async function createSubscriptionCheckout({
  userId,
  email,
  tier,
  billingCycle,
}: {
  userId: string;
  email: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
}): Promise<{ url: string }> {
  const stripe = requireStripe();

  if (tier === "trial") {
    throw new Error("Cannot checkout the trial tier.");
  }

  // Student tier requires verified-student status
  if (tier === "student") {
    const supabase = createServiceRoleClient();
    const { data: tierView } = await supabase
      .from("user_tiers")
      .select("is_verified_student")
      .eq("user_id", userId)
      .single();

    if (!tierView?.is_verified_student) {
      throw new Error("Student tier requires verified enrollment. Please complete verification first.");
    }
  }

  const priceId = getStripePriceId(tier, billingCycle);
  if (!priceId) {
    throw new Error(`Stripe price ID not configured for ${tier} ${billingCycle}.`);
  }

  // Find or create Stripe customer
  const customerId = await getOrCreateStripeCustomer({ userId, email });

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 15,
      metadata: {
        user_id: userId,
        tier,
        billing_cycle: billingCycle,
      },
    },
    success_url: `${APP_URL}/dashboard?checkout=success&tier=${tier}`,
    cancel_url: `${APP_URL}/pricing?checkout=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    tax_id_collection: { enabled: true },
    automatic_tax: { enabled: true },
    metadata: {
      user_id: userId,
      tier,
      billing_cycle: billingCycle,
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { url: session.url };
}

/**
 * Create a checkout session for a one-off $49 coach review purchase.
 * Unlike subscription checkouts, this is payment mode (not subscription).
 */
export async function createCoachReviewCheckout({
  userId,
  email,
  sessionId,
}: {
  userId: string;
  email: string;
  sessionId?: string;
}): Promise<{ url: string }> {
  const stripe = requireStripe();
  const priceId = process.env[COACH_REVIEW.stripeEnvKey];
  if (!priceId) {
    throw new Error("Stripe price ID not configured for coach review.");
  }

  const customerId = await getOrCreateStripeCustomer({ userId, email });

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/dashboard?coach_review=success${sessionId ? `&session=${sessionId}` : ""}`,
    cancel_url: `${APP_URL}/dashboard?coach_review=canceled`,
    automatic_tax: { enabled: true },
    metadata: {
      user_id: userId,
      product_type: "coach_review_one_off",
      session_id: sessionId ?? "",
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { url: session.url };
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
    .single();

  if (!subscription?.stripe_customer_id) {
    throw new Error("No Stripe customer found for this user.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${APP_URL}/settings/billing`,
  });

  return { url: session.url };
}

/**
 * Get or create a Stripe customer for a user.
 * Stores customer ID in the subscriptions table on first creation.
 */
async function getOrCreateStripeCustomer({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<string> {
  const stripe = requireStripe();
  const supabase = createServiceRoleClient();

  // Check for existing customer ID
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingSub?.stripe_customer_id) {
    return existingSub.stripe_customer_id;
  }

  // Create new customer in Stripe
  const customer: Stripe.Customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  // Upsert subscription row with the new customer ID
  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customer.id,
      tier: "trial",
      status: "trialing",
    },
    { onConflict: "user_id" },
  );

  return customer.id;
}
