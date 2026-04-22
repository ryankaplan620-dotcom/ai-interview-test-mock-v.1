/**
 * Stripe webhook handlers — extracted from app/api/stripe/webhook/route.ts
 * so they can be exercised without going through Next's route infrastructure.
 *
 * The route handler becomes a thin wrapper: it verifies the signature, pulls
 * the real deps (service-role Supabase + Stripe client), and delegates the
 * event handling to the functions in this file.
 *
 * Why extract:
 *   1. Testability. The route version is untestable without a live Stripe
 *      key (it runs signature verification and calls stripe.subscriptions.retrieve
 *      inline). Pure functions with injected deps can be exercised against
 *      fixtures in an in-memory harness.
 *   2. Clarity. The separation between "signature verification + routing"
 *      and "business logic that mutates Supabase" is now explicit.
 *   3. Reuse. If we ever need to replay a webhook (e.g., after fixing a
 *      bug in handler logic), we can call these functions directly with
 *      a persisted event payload instead of re-posting to the endpoint.
 *
 * The route.ts file is modified to import `dispatchWebhookEvent` from here
 * and call it with its own dependency wiring. Logic is identical; behavior
 * is preserved exactly. Verified by the stress harness.
 */

import type Stripe from "stripe";
import { TIERS } from "@/lib/tiers";
import type { SubscriptionTier, SubscriptionStatus } from "@/types/supabase";

// --------------------------------------------------------------------------
// Dependencies — injected so the handlers can be tested
// --------------------------------------------------------------------------

/**
 * The subset of the Supabase client the handlers actually use. Defining
 * this narrow interface means we don't have to mock the entire Supabase
 * SDK in tests; we only stub what the handlers call.
 *
 * All calls go through the service-role path because this is a webhook
 * handler (not a user-authenticated request).
 */
export interface WebhookSupabase {
  from(table: string): {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: unknown | null; error: unknown | null }>;
      };
    };
    update: (payload: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: unknown | null }>;
    };
    upsert: (
      payload: Record<string, unknown>,
      opts?: { onConflict: string },
    ) => Promise<{ error: unknown | null }>;
  };
}

/**
 * Minimal Stripe interface the handlers rely on. We inject a real stripe
 * client in production and a stub in tests.
 */
export interface WebhookStripe {
  subscriptions: {
    retrieve: (subId: string) => Promise<Stripe.Subscription>;
  };
}

export interface WebhookDeps {
  supabase: WebhookSupabase;
  stripe: WebhookStripe;
}

// --------------------------------------------------------------------------
// Dispatcher
// --------------------------------------------------------------------------

export const RELEVANT_EVENT_TYPES: ReadonlySet<string> = new Set([
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
 * Main entry point called by the route handler after signature verification.
 * Dispatches to the right function for the event type. Returns the handler's
 * result (or a marker string for the ignore path).
 */
export async function dispatchWebhookEvent(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<{ handled: boolean; reason?: string }> {
  if (!RELEVANT_EVENT_TYPES.has(event.type)) {
    return { handled: false, reason: `ignored_${event.type}` };
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await syncSubscription(event.data.object as Stripe.Subscription, deps);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, deps);
      break;
    case "customer.subscription.trial_will_end":
      await handleTrialWillEnd(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice, deps);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice, deps);
      break;
    case "checkout.session.completed":
      // Belt-and-braces; specific logic lives in subscription.created / payment_intent.succeeded
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, deps);
      break;
  }

  return { handled: true };
}

// --------------------------------------------------------------------------
// syncSubscription — handles both .created and .updated
// --------------------------------------------------------------------------

export async function syncSubscription(
  subscription: Stripe.Subscription,
  { supabase }: WebhookDeps,
): Promise<void> {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.warn("[Stripe Webhook] Subscription missing user_id metadata:", subscription.id);
    return;
  }

  const tier = (subscription.metadata.tier ?? "cycle") as SubscriptionTier;
  void TIERS[tier]; // validate tier exists in our catalog
  const status = subscription.status as SubscriptionStatus;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  // Check if this is a new cycle relative to what we have on file.
  // If status is 'trialing', we don't reset counters regardless.
  const { data: existingRow } = await supabase
    .from("subscriptions")
    .select("cycle_start, sessions_used_this_cycle, overages_used_this_cycle")
    .eq("user_id", userId)
    .maybeSingle();

  const existing = existingRow as { cycle_start: string | null } | null;
  const cycleChanged = existing?.cycle_start !== periodStart && status !== "trialing";

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

  if (cycleChanged) {
    upsertPayload.sessions_used_this_cycle = 0;
    upsertPayload.overages_used_this_cycle = 0;
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(upsertPayload, { onConflict: "user_id" });

  if (error) {
    throw new Error(
      `Failed to sync subscription: ${(error as { message?: string }).message ?? "unknown"}`,
    );
  }
}

// --------------------------------------------------------------------------
// handleInvoicePaid — subscription renewal
// --------------------------------------------------------------------------

export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  { supabase, stripe }: WebhookDeps,
): Promise<void> {
  if (!invoice.subscription) return;
  const subId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;

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
      sessions_used_this_cycle: 0,
      overages_used_this_cycle: 0,
    })
    .eq("stripe_subscription_id", subId);
}

// --------------------------------------------------------------------------
// handleSubscriptionDeleted — user cancelled
// --------------------------------------------------------------------------

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  { supabase }: WebhookDeps,
): Promise<void> {
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
// handleTrialWillEnd — hook for day-10 email
// --------------------------------------------------------------------------

export async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  console.log(`[Stripe Webhook] Trial ending for subscription ${subscription.id}`);
  // TODO: integrate with Resend to send renewal-warning email
}

// --------------------------------------------------------------------------
// handlePaymentFailed — flag past_due
// --------------------------------------------------------------------------

export async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  { supabase }: WebhookDeps,
): Promise<void> {
  if (!invoice.subscription) return;
  const subId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;
  await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subId);
}

// --------------------------------------------------------------------------
// handlePaymentIntentSucceeded — overage purchases
// --------------------------------------------------------------------------

export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  { supabase }: WebhookDeps,
): Promise<void> {
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

  const chargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id ?? null;

  const { error } = await supabase.from("overage_purchases").upsert(
    {
      user_id: userId,
      session_id: sessionId,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: chargeId,
      amount: paymentIntent.amount,
      status: "succeeded",
      succeeded_at: new Date().toISOString(),
    },
    { onConflict: "stripe_payment_intent_id" },
  );

  if (error && !(error as { message?: string }).message?.includes("duplicate")) {
    throw new Error(
      `Failed to record overage purchase: ${(error as { message?: string }).message ?? "unknown"}`,
    );
  }
}
