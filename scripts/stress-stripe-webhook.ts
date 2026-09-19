/**
 * Stripe webhook stress test — exercises the webhook handler against
 * realistic Stripe event fixtures with an in-memory Supabase mock.
 *
 * Scenarios walked through:
 *   1. Trial signup (subscription.created with status=trialing, trial_end set)
 *   2. Trial conversion (subscription.updated trialing→active + invoice.paid)
 *   3. Cycle renewal (invoice.paid on an existing active sub — counters reset)
 *   4. Cancellation (subscription.deleted)
 *   5. Payment failure (invoice.payment_failed → past_due)
 *   6. Overage purchase (payment_intent.succeeded with product_type=overage_session)
 *   7. Webhook replay idempotency (same overage event twice → one row)
 *   8. Irrelevant event (charge.updated → no-op)
 *   9. Subscription missing user_id metadata (→ warn, no-op)
 *   10. Tier upgrade (subscription.updated from cycle → pro mid-cycle)
 *
 * This is the real behavior contract for the Phase H webhook logic. If this
 * test passes, the logic is correct. If Stripe sends an event that this
 * harness doesn't cover, it should be ADDED here before being deployed.
 *
 * Run: npx tsx scripts/stress-stripe-webhook.ts
 */

import type Stripe from "stripe";
import {
  dispatchWebhookEvent,
  type WebhookSupabase,
  type WebhookStripe,
} from "../lib/stripe/webhook-handlers";
import {
  makeSubscription,
  makeInvoice,
  makePaymentIntent,
  makeEvent,
} from "../lib/stripe/fixtures";

// --------------------------------------------------------------------------
// In-memory Supabase mock — matches the WebhookSupabase shape
// --------------------------------------------------------------------------

interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string | null;
  tier: string;
  status: string;
  cycle_start: string | null;
  cycle_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  auto_renew: boolean;
  canceled_at: string | null;
  sessions_used_this_cycle: number;
  overages_used_this_cycle: number;
}

interface OveragePurchaseRow {
  user_id: string;
  session_id: string;
  stripe_payment_intent_id: string;
  stripe_charge_id: string | null;
  amount: number;
  status: string;
  succeeded_at: string;
}

interface MockDb {
  subscriptions: Map<string, SubscriptionRow>; // keyed by user_id
  overage_purchases: Map<string, OveragePurchaseRow>; // keyed by stripe_payment_intent_id
}

function createMockDb(): MockDb {
  return {
    subscriptions: new Map(),
    overage_purchases: new Map(),
  };
}

function createMockSupabase(db: MockDb): WebhookSupabase {
  return {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(col: string, val: string) {
              return {
                async maybeSingle() {
                  if (table === "subscriptions" && col === "user_id") {
                    const row = db.subscriptions.get(val);
                    return { data: row ?? null, error: null };
                  }
                  if (table === "subscriptions" && col === "stripe_subscription_id") {
                    const row = [...db.subscriptions.values()].find(
                      (r) => r.stripe_subscription_id === val,
                    );
                    return { data: row ?? null, error: null };
                  }
                  return { data: null, error: null };
                },
              };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          return {
            eq(col: string, val: string): Promise<{ error: unknown | null }> {
              return new Promise((resolve) => {
                if (table === "subscriptions") {
                  // Find matching rows
                  for (const [userId, row] of db.subscriptions.entries()) {
                    const match =
                      (col === "user_id" && row.user_id === val) ||
                      (col === "stripe_subscription_id" && row.stripe_subscription_id === val);
                    if (match) {
                      db.subscriptions.set(userId, { ...row, ...(payload as Partial<SubscriptionRow>) });
                    }
                  }
                }
                resolve({ error: null });
              });
            },
          };
        },
        async upsert(
          payload: Record<string, unknown>,
          opts?: { onConflict: string },
        ) {
          if (table === "subscriptions") {
            const userId = payload.user_id as string;
            const existing = db.subscriptions.get(userId);
            const merged: SubscriptionRow = {
              sessions_used_this_cycle: existing?.sessions_used_this_cycle ?? 0,
              overages_used_this_cycle: existing?.overages_used_this_cycle ?? 0,
              ...(existing ?? {}),
              ...(payload as Partial<SubscriptionRow>),
            } as SubscriptionRow;
            db.subscriptions.set(userId, merged);
            return { error: null };
          }
          if (table === "overage_purchases") {
            const piId = payload.stripe_payment_intent_id as string;
            // Simulate idempotency via onConflict: if the row exists, overwrite;
            // if not, insert. Either way, key is constant.
            void opts;
            db.overage_purchases.set(piId, payload as unknown as OveragePurchaseRow);
            return { error: null };
          }
          return { error: null };
        },
      };
    },
  };
}

// Mock stripe client — only subscriptions.retrieve is called by the handlers
function createMockStripe(fakeSubs: Map<string, Stripe.Subscription>): WebhookStripe {
  return {
    subscriptions: {
      async retrieve(subId: string): Promise<Stripe.Subscription> {
        const sub = fakeSubs.get(subId);
        if (!sub) throw new Error(`mock_stripe_sub_not_found_${subId}`);
        return sub;
      },
    },
  };
}

// --------------------------------------------------------------------------
// Harness
// --------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, label: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
}

const USER_A = "user-a-uuid";
const USER_B = "user-b-uuid";

async function main() {
  console.log("\n=== Stripe webhook stress test ===\n");

  // --------------------------------------------------------------------------
  // 1. Trial signup
  // --------------------------------------------------------------------------
  console.log("1. Trial signup (subscription.created, status=trialing)");
  {
    const db = createMockDb();
    const now = new Date("2026-05-01T00:00:00Z");
    const trialEnd = new Date("2026-05-16T00:00:00Z"); // 15-day trial

    const sub = makeSubscription({
      subId: "sub_a_1",
      userId: USER_A,
      tier: "pro",
      status: "trialing",
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialStart: now,
      trialEnd: trialEnd,
    });
    const fakeSubs = new Map([[sub.id, sub]]);
    const deps = { supabase: createMockSupabase(db), stripe: createMockStripe(fakeSubs) };

    const result = await dispatchWebhookEvent(
      makeEvent("customer.subscription.created", sub),
      deps,
    );
    assert(result.handled, "handled=true");

    const row = db.subscriptions.get(USER_A);
    assert(row !== undefined, "subscription row created for user");
    assert(row?.tier === "pro", "tier=pro persisted");
    assert(row?.status === "trialing", "status=trialing persisted");
    assert(row?.trial_end !== null, "trial_end set");
    assert(row?.sessions_used_this_cycle === 0, "sessions counter at 0");
    assert(row?.overages_used_this_cycle === 0, "overages counter at 0");
    assert(row?.auto_renew === true, "auto_renew=true by default");
  }

  // --------------------------------------------------------------------------
  // 2. Trial conversion (updated + invoice.paid)
  // --------------------------------------------------------------------------
  console.log("\n2. Trial conversion → active");
  {
    const db = createMockDb();
    const trialStart = new Date("2026-05-01T00:00:00Z");
    const trialEnd = new Date("2026-05-16T00:00:00Z");
    const cycleEnd = new Date("2027-05-16T00:00:00Z"); // Pro = 365 days

    // Set up existing trialing row
    const trialSub = makeSubscription({
      subId: "sub_a_2",
      userId: USER_A,
      tier: "pro",
      status: "trialing",
      currentPeriodStart: trialStart,
      currentPeriodEnd: trialEnd,
      trialStart,
      trialEnd,
    });
    await dispatchWebhookEvent(makeEvent("customer.subscription.created", trialSub), {
      supabase: createMockSupabase(db),
      stripe: createMockStripe(new Map([[trialSub.id, trialSub]])),
    });

    // Seed some consumed counters to verify they get reset on conversion
    const existing = db.subscriptions.get(USER_A)!;
    existing.sessions_used_this_cycle = 2;
    db.subscriptions.set(USER_A, existing);

    // Simulate trial converting to active
    const activeSub = makeSubscription({
      subId: "sub_a_2",
      userId: USER_A,
      tier: "pro",
      status: "active",
      currentPeriodStart: trialEnd, // cycle starts at end of trial
      currentPeriodEnd: cycleEnd,
      trialStart,
      trialEnd,
    });
    const fakeSubs = new Map([[activeSub.id, activeSub]]);
    const deps = { supabase: createMockSupabase(db), stripe: createMockStripe(fakeSubs) };

    // .updated event — status transitions
    await dispatchWebhookEvent(makeEvent("customer.subscription.updated", activeSub), deps);
    // .paid event — counters reset explicitly
    await dispatchWebhookEvent(
      makeEvent(
        "invoice.paid",
        makeInvoice({ subscriptionId: activeSub.id, amountPaid: 14900 }),
      ),
      deps,
    );

    const row = db.subscriptions.get(USER_A);
    assert(row?.status === "active", "status=active after conversion");
    assert(row?.sessions_used_this_cycle === 0, "counter reset to 0 on conversion");
    assert(row?.cycle_end === cycleEnd.toISOString(), "cycle_end set to 365 days from trial end");
  }

  // --------------------------------------------------------------------------
  // 3. Cycle renewal (invoice.paid on existing active sub)
  // --------------------------------------------------------------------------
  console.log("\n3. Cycle renewal (invoice.paid) — counters reset");
  {
    const db = createMockDb();
    const cycleStart = new Date("2026-05-16T00:00:00Z");
    const cycleEnd = new Date("2027-05-16T00:00:00Z");
    const renewalStart = cycleEnd; // next cycle begins where the old one ended
    const renewalEnd = new Date("2028-05-16T00:00:00Z");

    // Pre-existing active sub with consumed counters
    db.subscriptions.set(USER_A, {
      user_id: USER_A,
      stripe_customer_id: "cus_a",
      stripe_subscription_id: "sub_a_3",
      stripe_price_id: "price_pro",
      tier: "pro",
      status: "active",
      cycle_start: cycleStart.toISOString(),
      cycle_end: cycleEnd.toISOString(),
      current_period_start: cycleStart.toISOString(),
      current_period_end: cycleEnd.toISOString(),
      trial_start: null,
      trial_end: null,
      cancel_at_period_end: false,
      auto_renew: true,
      canceled_at: null,
      sessions_used_this_cycle: 3,
      overages_used_this_cycle: 1,
    });

    // Renewal sub (new cycle window)
    const renewedSub = makeSubscription({
      subId: "sub_a_3",
      userId: USER_A,
      tier: "pro",
      status: "active",
      currentPeriodStart: renewalStart,
      currentPeriodEnd: renewalEnd,
    });

    const deps = {
      supabase: createMockSupabase(db),
      stripe: createMockStripe(new Map([[renewedSub.id, renewedSub]])),
    };

    await dispatchWebhookEvent(
      makeEvent(
        "invoice.paid",
        makeInvoice({ subscriptionId: renewedSub.id, amountPaid: 14900 }),
      ),
      deps,
    );

    const row = db.subscriptions.get(USER_A);
    assert(row?.cycle_start === renewalStart.toISOString(), "cycle_start moved to new period");
    assert(row?.cycle_end === renewalEnd.toISOString(), "cycle_end moved to new period end");
    assert(row?.sessions_used_this_cycle === 0, "sessions reset on renewal");
    assert(row?.overages_used_this_cycle === 0, "overages reset on renewal");
    assert(row?.status === "active", "status stays active");
  }

  // --------------------------------------------------------------------------
  // 3b. Same-cycle proration invoice (invoice.paid without a period change)
  // --------------------------------------------------------------------------
  console.log("\n3b. Proration invoice.paid mid-cycle — counters NOT reset");
  {
    const db = createMockDb();
    const cycleStart = new Date("2026-05-16T00:00:00Z");
    const cycleEnd = new Date("2027-05-16T00:00:00Z");

    // Pre-existing active sub with consumed counters, mid-cycle.
    db.subscriptions.set(USER_A, {
      user_id: USER_A,
      stripe_customer_id: "cus_a",
      stripe_subscription_id: "sub_a_3b",
      stripe_price_id: "price_pro",
      tier: "pro",
      status: "active",
      cycle_start: cycleStart.toISOString(),
      cycle_end: cycleEnd.toISOString(),
      current_period_start: cycleStart.toISOString(),
      current_period_end: cycleEnd.toISOString(),
      trial_start: null,
      trial_end: null,
      cancel_at_period_end: false,
      auto_renew: true,
      canceled_at: null,
      sessions_used_this_cycle: 3,
      overages_used_this_cycle: 1,
    });

    // A plan-change proration or retried charge: same subscription, same
    // current_period_start/end as what's already on file.
    const sameCycleSub = makeSubscription({
      subId: "sub_a_3b",
      userId: USER_A,
      tier: "pro",
      status: "active",
      currentPeriodStart: cycleStart,
      currentPeriodEnd: cycleEnd,
    });

    const deps = {
      supabase: createMockSupabase(db),
      stripe: createMockStripe(new Map([[sameCycleSub.id, sameCycleSub]])),
    };

    await dispatchWebhookEvent(
      makeEvent(
        "invoice.paid",
        makeInvoice({ subscriptionId: sameCycleSub.id, amountPaid: 500 }),
      ),
      deps,
    );

    const row = db.subscriptions.get(USER_A);
    assert(row?.cycle_start === cycleStart.toISOString(), "cycle_start unchanged");
    assert(row?.sessions_used_this_cycle === 3, "sessions NOT reset on same-cycle invoice");
    assert(row?.overages_used_this_cycle === 1, "overages NOT reset on same-cycle invoice");
    assert(row?.status === "active", "status stays active");
  }

  // --------------------------------------------------------------------------
  // 4. Cancellation (subscription.deleted)
  // --------------------------------------------------------------------------
  console.log("\n4. Cancellation (subscription.deleted)");
  {
    const db = createMockDb();
    db.subscriptions.set(USER_A, {
      user_id: USER_A,
      stripe_customer_id: "cus_a",
      stripe_subscription_id: "sub_a_4",
      stripe_price_id: "price_pro",
      tier: "pro",
      status: "active",
      cycle_start: "2026-05-01T00:00:00.000Z",
      cycle_end: "2027-05-01T00:00:00.000Z",
      current_period_start: "2026-05-01T00:00:00.000Z",
      current_period_end: "2027-05-01T00:00:00.000Z",
      trial_start: null,
      trial_end: null,
      cancel_at_period_end: false,
      auto_renew: true,
      canceled_at: null,
      sessions_used_this_cycle: 2,
      overages_used_this_cycle: 0,
    });

    const deletedSub = makeSubscription({
      subId: "sub_a_4",
      userId: USER_A,
      tier: "pro",
      status: "canceled",
      currentPeriodStart: new Date("2026-05-01T00:00:00Z"),
      currentPeriodEnd: new Date("2027-05-01T00:00:00Z"),
      canceledAt: new Date("2026-06-01T00:00:00Z"),
    });

    const deps = {
      supabase: createMockSupabase(db),
      stripe: createMockStripe(new Map()),
    };

    await dispatchWebhookEvent(makeEvent("customer.subscription.deleted", deletedSub), deps);

    const row = db.subscriptions.get(USER_A);
    assert(row?.status === "canceled", "status=canceled");
    assert(row?.auto_renew === false, "auto_renew=false");
    assert(row?.canceled_at !== null, "canceled_at stamped");
    // Tier is preserved — important for showing users their historical tier
    assert(row?.tier === "pro", "tier preserved for history");
  }

  // --------------------------------------------------------------------------
  // 5. Payment failure (invoice.payment_failed → past_due)
  // --------------------------------------------------------------------------
  console.log("\n5. Payment failure → past_due");
  {
    const db = createMockDb();
    db.subscriptions.set(USER_A, {
      user_id: USER_A,
      stripe_customer_id: "cus_a",
      stripe_subscription_id: "sub_a_5",
      stripe_price_id: "price_pro",
      tier: "pro",
      status: "active",
      cycle_start: "2026-05-01T00:00:00.000Z",
      cycle_end: "2027-05-01T00:00:00.000Z",
      current_period_start: "2026-05-01T00:00:00.000Z",
      current_period_end: "2027-05-01T00:00:00.000Z",
      trial_start: null,
      trial_end: null,
      cancel_at_period_end: false,
      auto_renew: true,
      canceled_at: null,
      sessions_used_this_cycle: 1,
      overages_used_this_cycle: 0,
    });

    const failedInvoice = makeInvoice({
      subscriptionId: "sub_a_5",
      status: "open",
      amountPaid: 0,
    });

    const deps = {
      supabase: createMockSupabase(db),
      stripe: createMockStripe(new Map()),
    };

    await dispatchWebhookEvent(makeEvent("invoice.payment_failed", failedInvoice), deps);

    const row = db.subscriptions.get(USER_A);
    assert(row?.status === "past_due", "status=past_due after failure");
    // Counters NOT reset on failure — only on successful renewal
    assert(row?.sessions_used_this_cycle === 1, "counters not touched on failure");
  }

  // --------------------------------------------------------------------------
  // 6. Overage purchase
  // --------------------------------------------------------------------------
  console.log("\n6. Overage purchase (payment_intent.succeeded)");
  {
    const db = createMockDb();
    const sessionId = "session-abc-123";
    const pi = makePaymentIntent({
      piId: "pi_overage_1",
      userId: USER_A,
      sessionId,
      amount: 800,
    });

    const deps = {
      supabase: createMockSupabase(db),
      stripe: createMockStripe(new Map()),
    };

    await dispatchWebhookEvent(makeEvent("payment_intent.succeeded", pi), deps);

    assert(db.overage_purchases.size === 1, "exactly one overage row");
    const row = db.overage_purchases.get("pi_overage_1");
    assert(row?.user_id === USER_A, "correct user_id");
    assert(row?.session_id === sessionId, "correct session_id");
    assert(row?.amount === 800, "amount recorded");
    assert(row?.status === "succeeded", "status=succeeded");
  }

  // --------------------------------------------------------------------------
  // 7. Webhook replay idempotency
  // --------------------------------------------------------------------------
  console.log("\n7. Overage replay idempotency (same PI event twice)");
  {
    const db = createMockDb();
    const pi = makePaymentIntent({
      piId: "pi_overage_replay",
      userId: USER_A,
      sessionId: "session-replay",
    });

    const deps = {
      supabase: createMockSupabase(db),
      stripe: createMockStripe(new Map()),
    };

    await dispatchWebhookEvent(makeEvent("payment_intent.succeeded", pi), deps);
    await dispatchWebhookEvent(makeEvent("payment_intent.succeeded", pi), deps);
    // Event ID differs but PI ID is the same — onConflict: stripe_payment_intent_id
    assert(db.overage_purchases.size === 1, "replay does not create duplicate row");
  }

  // --------------------------------------------------------------------------
  // 8. Irrelevant event
  // --------------------------------------------------------------------------
  console.log("\n8. Irrelevant event (charge.updated → no-op)");
  {
    const db = createMockDb();
    const deps = {
      supabase: createMockSupabase(db),
      stripe: createMockStripe(new Map()),
    };

    const result = await dispatchWebhookEvent(
      makeEvent("charge.updated" as Stripe.Event.Type, {}),
      deps,
    );
    assert(result.handled === false, "handled=false for irrelevant event");
    assert(result.reason === "ignored_charge.updated", "reason names the ignored type");
    assert(db.subscriptions.size === 0 && db.overage_purchases.size === 0, "no DB writes");
  }

  // --------------------------------------------------------------------------
  // 9. Subscription missing user_id metadata
  // --------------------------------------------------------------------------
  console.log("\n9. Subscription missing user_id metadata");
  {
    const db = createMockDb();
    const sub = makeSubscription({
      userId: "",
      tier: "pro",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    });
    // Manually strip user_id to simulate a misconfigured checkout
    (sub.metadata as Record<string, string>).user_id = "";

    const deps = {
      supabase: createMockSupabase(db),
      stripe: createMockStripe(new Map([[sub.id, sub]])),
    };

    // Should warn-and-return without throwing
    await dispatchWebhookEvent(makeEvent("customer.subscription.created", sub), deps);
    assert(db.subscriptions.size === 0, "no row created when user_id missing");
  }

  // --------------------------------------------------------------------------
  // 10. Tier upgrade mid-cycle (cycle → pro)
  // --------------------------------------------------------------------------
  console.log("\n10. Tier upgrade mid-cycle (cycle → pro)");
  {
    const db = createMockDb();
    // Pre-existing cycle-tier active sub
    const cycleStart = new Date("2026-05-01T00:00:00Z");
    const cycleEnd = new Date("2026-07-30T00:00:00Z"); // 90 days for Cycle tier
    db.subscriptions.set(USER_B, {
      user_id: USER_B,
      stripe_customer_id: "cus_b",
      stripe_subscription_id: "sub_b_1",
      stripe_price_id: "price_cycle",
      tier: "basic",
      status: "active",
      cycle_start: cycleStart.toISOString(),
      cycle_end: cycleEnd.toISOString(),
      current_period_start: cycleStart.toISOString(),
      current_period_end: cycleEnd.toISOString(),
      trial_start: null,
      trial_end: null,
      cancel_at_period_end: false,
      auto_renew: true,
      canceled_at: null,
      sessions_used_this_cycle: 2,
      overages_used_this_cycle: 0,
    });

    // Stripe sends a subscription.updated with tier=pro and a NEW cycle window
    // (Stripe realigns period on upgrades with proration)
    const upgradedSub = makeSubscription({
      subId: "sub_b_1",
      userId: USER_B,
      tier: "pro",
      status: "active",
      currentPeriodStart: new Date("2026-06-01T00:00:00Z"), // new cycle starts at upgrade
      currentPeriodEnd: new Date("2027-06-01T00:00:00Z"),
    });

    const deps = {
      supabase: createMockSupabase(db),
      stripe: createMockStripe(new Map([[upgradedSub.id, upgradedSub]])),
    };

    await dispatchWebhookEvent(makeEvent("customer.subscription.updated", upgradedSub), deps);

    const row = db.subscriptions.get(USER_B);
    assert(row?.tier === "pro", "tier upgraded to pro");
    assert(row?.cycle_start === "2026-06-01T00:00:00.000Z", "cycle_start moved to upgrade time");
    // cycleChanged triggers counter reset
    assert(row?.sessions_used_this_cycle === 0, "counter reset on tier upgrade");
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  ✗ ${f}`));
    process.exit(1);
  }
  console.log("\n✓ All assertions passed.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("stress test crashed:", err);
  process.exit(2);
});
