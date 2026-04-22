/**
 * Stripe webhook event fixtures — realistic payloads that match Stripe's
 * actual shape for every event type our webhook handler listens on.
 *
 * These are DEV-ONLY utilities. Not imported by production code. Used
 * exclusively by scripts/stress-stripe-webhook.ts to exercise the handler
 * against every code path without requiring live Stripe keys or a real
 * Stripe webhook endpoint registered.
 *
 * Shape fidelity: the payloads here match what Stripe actually sends as of
 * their 2024-2025 API versions. When the handler extracts a field (e.g.
 * subscription.items.data[0].price.id), the fixture provides that exact
 * path. Partial mocks hide bugs; full-shape fixtures find them.
 *
 * Where we diverge from Stripe:
 *   - Timestamps are deterministic (provided by caller) for reproducibility.
 *   - IDs are short strings ("sub_test_1", not "sub_LZ..."), fine because
 *     the handler treats them as opaque.
 *   - We set only the fields the handler reads. Stripe's real payloads have
 *     dozens more fields; we don't need them and including them all would
 *     bloat the tests without value.
 */

import type Stripe from "stripe";

// --------------------------------------------------------------------------
// Subscription fixture
// --------------------------------------------------------------------------

export interface SubscriptionFixtureOpts {
  subId?: string;
  customerId?: string;
  userId: string;
  tier: "cycle" | "pro" | "max";
  status: Stripe.Subscription.Status;
  priceId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date | null;
  trialEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
}

export function makeSubscription(opts: SubscriptionFixtureOpts): Stripe.Subscription {
  const sub: Partial<Stripe.Subscription> = {
    id: opts.subId ?? "sub_test_1",
    object: "subscription",
    customer: opts.customerId ?? "cus_test_1",
    status: opts.status,
    metadata: {
      user_id: opts.userId,
      tier: opts.tier,
    },
    items: {
      object: "list",
      data: [
        {
          id: "si_test_1",
          object: "subscription_item",
          price: {
            id: opts.priceId ?? `price_test_${opts.tier}`,
            object: "price",
          } as Stripe.Price,
        } as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: "",
    } as Stripe.ApiList<Stripe.SubscriptionItem>,
    current_period_start: Math.floor(opts.currentPeriodStart.getTime() / 1000),
    current_period_end: Math.floor(opts.currentPeriodEnd.getTime() / 1000),
    trial_start: opts.trialStart ? Math.floor(opts.trialStart.getTime() / 1000) : null,
    trial_end: opts.trialEnd ? Math.floor(opts.trialEnd.getTime() / 1000) : null,
    cancel_at_period_end: opts.cancelAtPeriodEnd ?? false,
    canceled_at: opts.canceledAt ? Math.floor(opts.canceledAt.getTime() / 1000) : null,
  };
  return sub as Stripe.Subscription;
}

// --------------------------------------------------------------------------
// Invoice fixture — for invoice.paid and invoice.payment_failed
// --------------------------------------------------------------------------

export function makeInvoice(opts: {
  invoiceId?: string;
  subscriptionId: string;
  customerId?: string;
  amountPaid?: number;
  status?: Stripe.Invoice.Status;
}): Stripe.Invoice {
  return {
    id: opts.invoiceId ?? "in_test_1",
    object: "invoice",
    subscription: opts.subscriptionId,
    customer: opts.customerId ?? "cus_test_1",
    amount_paid: opts.amountPaid ?? 4900,
    status: opts.status ?? "paid",
  } as unknown as Stripe.Invoice;
}

// --------------------------------------------------------------------------
// PaymentIntent fixture — for overage purchases
// --------------------------------------------------------------------------

export interface PaymentIntentFixtureOpts {
  piId?: string;
  userId: string;
  sessionId: string;
  amount?: number;
  chargeId?: string;
  productType?: string;
}

export function makePaymentIntent(opts: PaymentIntentFixtureOpts): Stripe.PaymentIntent {
  return {
    id: opts.piId ?? "pi_test_1",
    object: "payment_intent",
    amount: opts.amount ?? 800,
    currency: "usd",
    status: "succeeded",
    latest_charge: opts.chargeId ?? "ch_test_1",
    metadata: {
      product_type: opts.productType ?? "overage_session",
      user_id: opts.userId,
      session_id: opts.sessionId,
    },
  } as unknown as Stripe.PaymentIntent;
}

// --------------------------------------------------------------------------
// Event envelope — wraps a payload into a Stripe.Event
// --------------------------------------------------------------------------

export function makeEvent<T>(type: Stripe.Event.Type, object: T): Stripe.Event {
  return {
    id: `evt_test_${Math.random().toString(36).slice(2, 10)}`,
    object: "event",
    type,
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    data: { object: object as unknown as Stripe.Event.Data.Object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  } as Stripe.Event;
}
