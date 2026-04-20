import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireStripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/db/server";
import { TIERS } from "@/lib/tiers";
import type { SubscriptionTier, SubscriptionStatus } from "@/types/supabase";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Events we care about. Phase H reshuffles lifecycle handling:
//   - subscription.created/updated: sync cycle_start/end + status
//   - subscription.deleted: mark canceled, keep tier for historical lookup
//   - invoice.paid (new): subscription renewal — reset cycle counters
//   - invoice.payment_failed: mark past_due
//   - payment_intent.succeeded: overage purchases (replacing coach_review)
const RELEVANT_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.paid",
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
      await handleTrialWillEnd(event.data.object as Stripe.Subscription);
      break;

    case "invoice.paid":
      // Subscription renewal — reset cycle counters + stamp new cycle window
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case "checkout.session.completed":
      // Subscription checkouts are handled by subscription.created.
      // Overage checkouts are handled by payment_intent.succeeded.
      // This is a belt-and-braces hook; most logic lives in the specific events.
      break;

    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
  }
}

// --------------------------------------------------------------------------
// Subscription sync — first purchase or update
// --------------------------------------------------------------------------

async function syncSubscription(subscription: Stripe.Subscription) {
  const supabase = createServiceRoleClient();

  const userId = subscription.metadata.user_id;
  if (!userId) {
    console.warn("[Stripe Webhook] Subscription missing user_id metadata:", subscription.id);
    return;
  }

  const tier = (subscription.metadata.tier ?? "cycle") as SubscriptionTier;
  const tierConfig = TIERS[tier];
  const status = subscription.status as SubscriptionStatus;

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  // Cycle window derivation:
  //   - For active subscriptions, Stripe's current_period_start/end already
  //     represents the billing window. We use that directly as the cycle window.
  //   - For trialing subscriptions, Stripe sets trial_end. We set cycle_end
  //     to the trial end so quota counting works during the free trial window.
  //     When the trial ends and they convert, invoice.paid fires and the
  //     handler resets counters for the paid cycle.
  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  // Check if this is a new cycle start (different from what's on the row).
  // If so, reset session counters. If status is 'trialing', counters stay
  // at whatever they are (in practice, 0 for first trial).
  const { data: existingRow } = await supabase
    .from("subscriptions")
    .select("cycle_start, sessions_used_this_cycle, overages_used_this_cycle")
    .eq("user_id", userId)
    .maybeSingle();

  const cycleChanged =
    existingRow?.cycle_start !== periodStart && status !== "trialing";

  const upsertPayload: Record<string, unknown> = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    tier,
    status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cycle_start: periodStart,
    cycle_end: periodEnd,
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    auto_renew: !subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  };

  // On a new cycle (renewal), zero the counters
  if (cycleChanged) {
    upsertPayload.sessions_used_this_cycle = 0;
    upsertPayload.overages_used_this_cycle = 0;
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(upsertPayload, { onConflict: "user_id" });

  if (error) {
    throw new Error(`Failed to sync subscription: ${error.message}`);
  }

  // Touch tierConfig to silence unused-var lint in case code above doesn't use it
  void tierConfig;
}

// --------------------------------------------------------------------------
// Renewal — invoice.paid fires when a new cycle bills successfully
// --------------------------------------------------------------------------

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = createServiceRoleClient();

  // Only act on subscription invoices (not one-off charges)
  if (!invoice.subscription) return;

  const subId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;

  // Fetch the subscription to get the new period window
  const stripe = requireStripe();
  const sub = await stripe.subscriptions.retrieve(subId);

  const periodStart = new Date(sub.current_period_start * 1000).toISOString();
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      cycle_start: periodStart,
      cycle_end: periodEnd,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      // Reset counters for the new cycle
      sessions_used_this_cycle: 0,
      overages_used_this_cycle: 0,
    })
    .eq("stripe_subscription_id", subId);
}

// --------------------------------------------------------------------------
// Cancellation — mark canceled but keep tier for historical queries
// --------------------------------------------------------------------------

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createServiceRoleClient();

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      auto_renew: false,
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

// --------------------------------------------------------------------------
// Trial ending — hook for day-10-of-trial email (integrate with Resend)
// --------------------------------------------------------------------------

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log(`[Stripe Webhook] Trial ending for subscription ${subscription.id}`);
  // TODO Phase I: send email via Resend with renewal warning + cancel link
}

// --------------------------------------------------------------------------
// Payment failure — flag but don't revoke yet (Stripe retries for 7 days)
// --------------------------------------------------------------------------

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = createServiceRoleClient();
  if (!invoice.subscription) return;
  const subId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;
  await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subId);
}

// --------------------------------------------------------------------------
// Overage payment completion
// --------------------------------------------------------------------------

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Only handle overage payments — ignore everything else
  if (paymentIntent.metadata.product_type !== "overage_session") return;

  const userId = paymentIntent.metadata.user_id;
  const sessionId = paymentIntent.metadata.session_id || null;

  if (!userId || !sessionId) {
    console.warn(
      "[Stripe Webhook] Overage payment missing user_id or session_id:",
      paymentIntent.id,
    );
    return;
  }

  const supabase = createServiceRoleClient();

  // Record the overage purchase. Idempotent on stripe_payment_intent_id so
  // webhook replays don't double-insert.
  const { error } = await supabase.from("overage_purchases").upsert(
    {
      user_id: userId,
      session_id: sessionId,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id:
        typeof paymentIntent.latest_charge === "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id ?? null,
      amount: paymentIntent.amount,
      status: "succeeded",
      succeeded_at: new Date().toISOString(),
    },
    { onConflict: "stripe_payment_intent_id" },
  );

  if (error && !error.message.includes("duplicate")) {
    throw new Error(`Failed to record overage purchase: ${error.message}`);
  }
}
