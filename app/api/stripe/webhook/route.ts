import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireStripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/db/server";
import type { SubscriptionTier, SubscriptionStatus, BillingCycle } from "@/types/supabase";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Events we care about
const RELEVANT_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.payment_failed",
  "checkout.session.completed",
  "payment_intent.succeeded",
]);

/**
 * POST /api/stripe/webhook
 *
 * Verifies the Stripe signature and dispatches to the appropriate handler.
 * MUST NOT use the middleware session-refresh logic — excluded via middleware matcher.
 */
export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = requireStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    // Event type we don't handle — respond 200 so Stripe doesn't retry
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.trial_will_end":
      // Subscription trial ending in 3 days — trigger reminder email
      await handleTrialWillEnd(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "payment_intent.succeeded":
      // Handles one-off coach review purchases
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
  }
}

/**
 * Sync a Stripe subscription to the database subscriptions table.
 * Called on subscription.created and subscription.updated.
 */
async function syncSubscription(subscription: Stripe.Subscription) {
  const supabase = createServiceRoleClient();

  const userId = subscription.metadata.user_id;
  if (!userId) {
    console.warn("[Stripe Webhook] Subscription missing user_id metadata:", subscription.id);
    return;
  }

  const tier = (subscription.metadata.tier ?? "trial") as SubscriptionTier;
  const billingCycle = (subscription.metadata.billing_cycle ?? "monthly") as BillingCycle;
  const status = subscription.status as SubscriptionStatus;

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      tier,
      status,
      billing_cycle: billingCycle,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Failed to sync subscription: ${error.message}`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createServiceRoleClient();

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      tier: "trial", // Revert to trial/free access
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  // Would send a trial-ending email via Resend here.
  // Left as a hook point — integrate with lib/email once templates are built.
  console.log(`[Stripe Webhook] Trial ending for subscription ${subscription.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = createServiceRoleClient();

  if (invoice.subscription) {
    const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;
    await supabase.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // For subscription checkouts, the subscription.created event handles sync.
  // For one-off payments (coach review), we handle via payment_intent.succeeded.
  // Nothing to do here for subscriptions — leave the hook for future use.
  console.log(`[Stripe Webhook] Checkout completed: ${session.id}`);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Only handle coach review payments
  if (paymentIntent.metadata.product_type !== "coach_review_one_off") return;

  const userId = paymentIntent.metadata.user_id;
  const sessionId = paymentIntent.metadata.session_id || null;

  if (!userId) {
    console.warn("[Stripe Webhook] Coach review payment missing user_id:", paymentIntent.id);
    return;
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("coach_reviews").insert({
    user_id: userId,
    session_id: sessionId,
    stripe_payment_intent_id: paymentIntent.id,
    amount_cents: paymentIntent.amount,
    paid_at: new Date(paymentIntent.created * 1000).toISOString(),
    status: "pending",
  });

  if (error && !error.message.includes("duplicate")) {
    throw new Error(`Failed to record coach review: ${error.message}`);
  }
}
