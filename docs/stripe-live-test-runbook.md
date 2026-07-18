# Stripe Live Smoke Test — Runbook

**What this is:** A checklist for running real Stripe test-mode traffic through the Folio webhook once you have test-mode keys set up. Complements `scripts/stress-stripe-webhook.ts` (the fixture-based harness that runs offline).

**What the stress harness proved:** webhook handler logic is correct across 10 scenarios, 35 assertions. If something breaks in live testing, it's **configuration**, not logic.

**What this runbook covers:** catches the configuration failures. Wrong webhook secret, wrong price IDs, missing metadata on checkout, middleware intercepting the webhook path, Supabase service-role key scoped to the wrong schema, etc.

---

## Prerequisites

Before starting, confirm you have:

1. **A Stripe account in test mode.** Dashboard top-left should say "Test mode."
2. **Three test-mode products created** matching Folio's three tiers:
   - Basic — $49 every 90 days (or quarterly / custom — the invoice interval)
   - Pro — $149 every 365 days
   - Max — $249 every 365 days
   Each should have `tier` as a price metadata key (Basic: `tier=basic`, etc.)
3. **Stripe CLI installed** — `brew install stripe/stripe-cli/stripe` or equivalent.
4. **Local dev server running** on `http://localhost:3000`.
5. **`.env.local` populated** with:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_... (from stripe listen output, see below)
   STRIPE_PRICE_BASIC=price_test_... (the Basic tier price ID)
   STRIPE_PRICE_PRO=price_test_...
   STRIPE_PRICE_MAX=price_test_...
   ```
6. **A test user account** created through normal signup flow (to have a `user_id` in Supabase to bind the subscription to).

---

## Step 1 — Webhook signature forwarding

Stripe webhooks require signature verification. In dev, the Stripe CLI forwards events from your test account to your local server and attaches valid signatures.

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The first line of output will be:

```
> Ready! You are using Stripe API Version [2024-06-20]. Your webhook signing secret is whsec_xyz...
```

**Copy that `whsec_xyz` into `.env.local` as `STRIPE_WEBHOOK_SECRET` and restart your dev server.** If you skip the restart, the handler will use the old (or missing) secret and every event will return 400 "Invalid signature."

**Pass criterion:** `stripe listen` keeps running and shows `200` responses on every forwarded event below. `400` = signature verification failure (wrong secret). `500` = handler threw (check `next dev` logs).

---

## Step 2 — Trial signup (happy path)

**What you're testing:** a user starts a 15-day trial; the `subscriptions` row gets created with `status=trialing`, `cycle_end=trial_end`, counters at 0.

1. In your app, click through a full signup flow for the Basic tier.
2. Watch `stripe listen` output — you should see (in order):
   - `checkout.session.completed` → 200
   - `customer.subscription.created` → 200
3. Check your Supabase `subscriptions` table. One new row for the test user.

**Expected row state:**
```
tier:                          basic
status:                        trialing
cycle_start:                   today
cycle_end:                     today + 15 days (trial end)
trial_end:                     today + 15 days
sessions_used_this_cycle:      0
overages_used_this_cycle:      0
auto_renew:                    true
cancel_at_period_end:          false
```

**If row is missing:** the `user_id` metadata wasn't passed through on the checkout session. Check `lib/stripe/checkout.ts` — when you call `stripe.checkout.sessions.create`, `subscription_data.metadata.user_id` must be set. This is the #1 failure mode.

**If status is `active` not `trialing`:** your Stripe product does not have a 15-day trial configured. Check the product in the Stripe dashboard → Pricing → trial settings.

---

## Step 3 — Trial conversion (the critical path)

**What you're testing:** after 15 days, Stripe automatically bills the card and sends `invoice.paid`. The handler should move `status` → `active`, reset counters, and slide `cycle_end` out 90/365 days.

**Don't wait 15 days.** Simulate it:

```bash
# Find the test subscription ID
stripe subscriptions list --limit 1

# Force the trial to end right now
stripe subscriptions update sub_TESTID --trial-end=now
```

Stripe will fire:
- `customer.subscription.updated` (trialing → active) → 200
- `invoice.paid` → 200

**Expected row state after conversion:**
```
status:                        active
cycle_start:                   today (end of trial = now)
cycle_end:                     today + 90 days (Basic) OR + 365 days (Pro/Max)
sessions_used_this_cycle:      0  (reset by invoice.paid)
trial_end:                     still set (historical record)
```

**If `cycle_end` is wrong:** your Stripe product's billing interval doesn't match the tier's expected cycle length. Basic tier must bill every 90 days (or "custom 3 months"), Pro and Max every year.

**If `invoice.paid` returns 500:** the `stripe.subscriptions.retrieve` call inside `handleInvoicePaid` failed. Most common cause: `STRIPE_SECRET_KEY` is wrong or missing from `.env.local`. The dispatcher uses it to re-fetch the subscription for the new period window.

---

## Step 4 — Overage purchase

**What you're testing:** a user consumes their included sessions, buys an overage credit, the `payment_intent.succeeded` event fires and records an unconsumed `overage_purchases` row, and the next session creation atomically claims it.

The purchase happens *before* any session exists — there's nothing to attach it to yet, so the flow is: pay first, then the picker resubmits and the server claims the credit for the session it creates.

1. Manually set `sessions_used_this_cycle` to the tier's included count in Supabase (3 for Basic, 8 for Pro, 24 for Max) to simulate a user who's used all included sessions:
   ```sql
   update subscriptions
   set sessions_used_this_cycle = 3
   where user_id = '<test-user-uuid>';
   ```
2. In your app, start a new session. You should get `session_quota_exceeded` with a "Buy an overage session" button.
3. Click it — this calls `POST /api/stripe/overage-checkout` and redirects to Stripe Checkout. Confirm the charge (use test card `4242 4242 4242 4242`, any future expiry, any 3-digit CVC).
4. `stripe listen` should show:
   - `payment_intent.succeeded` → 200
5. Stripe redirects back to `/session/new?overage=paid`. The picker restores your prior selection from `sessionStorage` and resubmits automatically.

**Expected:**
- After step 4: a new row in `overage_purchases`, keyed on the PaymentIntent ID, with `session_id = null` (unconsumed credit) and `status = succeeded`.
- After step 5: that row's `session_id` is set to the newly created session (via the `claim_overage_purchase` RPC), the session is created with `is_overage = true`, and `subscriptions.overages_used_this_cycle` bumps to 1.

**If the session is never created / user gets "credit already used":** the RPC in `app/(app)/session/new/actions.ts` couldn't find or lost a race to claim an unconsumed row — check for a `succeeded` row with `session_id is null` for that user in `overage_purchases`.

**If `overage_purchases` row missing after payment:** check the PaymentIntent metadata in Stripe dashboard. The handler only acts on `product_type=overage_session`, read from `payment_intent_data.metadata` (not top-level Checkout Session metadata — Stripe doesn't copy that onto the PaymentIntent for one-time payments). If the checkout that created the PI didn't set that metadata, the handler no-ops.

**Security note:** the session-creation action never trusts a client-supplied "I paid" claim — it always looks up a real `succeeded` / unconsumed `overage_purchases` row server-side before waiving the quota.

---

## Step 5 — Basic renewal

**What you're testing:** end of cycle, Stripe bills again, `invoice.paid` fires, counters reset.

Simulate by advancing the subscription's period:

```bash
stripe subscriptions update sub_TESTID \
  --proration-behavior=none \
  --trial-end=now
```

(or use Stripe Test Clocks for a cleaner simulation — see Stripe docs for `stripe test_clocks`.)

**Expected:**
- `cycle_start` moves forward to the new period start
- `cycle_end` moves forward by 90 or 365 days
- `sessions_used_this_cycle` resets to 0
- `overages_used_this_cycle` resets to 0
- `status` stays `active`

**Common failure:** if the counters don't reset, the `syncSubscription` handler thinks this is the same cycle (`cycle_start` didn't change). Verify Stripe is actually sending a new `current_period_start` — check the webhook event payload in the Stripe dashboard's Events log.

---

## Step 6 — Payment failure

**What you're testing:** card declines; `status` moves to `past_due` but access is not immediately revoked.

Use a declining test card: `4000 0000 0000 0341` (declines after initial success, simulates a failed renewal).

Wait for the next `invoice.payment_failed` event (Stripe retries several times over a week in production; in test mode it fires immediately).

**Expected:**
- `status: past_due`
- `sessions_used_this_cycle` unchanged (counters are NOT reset on failure)
- User is NOT immediately locked out (this is intentional — Stripe retries for 7 days before giving up).

---

## Step 7 — Cancellation

**What you're testing:** user cancels their subscription; cycle keeps running until cycle_end, then status moves to canceled.

Two-stage cancellation in Stripe:

1. User toggles auto-renew off → Stripe marks `cancel_at_period_end=true`. Sends `customer.subscription.updated`.
   - Expected: `cancel_at_period_end=true`, `auto_renew=false`, status still `active`, user retains access.
2. At end of current period → Stripe sends `customer.subscription.deleted`.
   - Expected: `status=canceled`, `canceled_at` stamped, `tier` preserved for historical lookup.

Test both. The second stage can be forced:

```bash
stripe subscriptions cancel sub_TESTID
```

---

## Step 8 — Idempotency (replay safety)

**What you're testing:** if Stripe retries an event (which they do, for hours, on any 5xx response), the handler doesn't double-process.

```bash
# Resend the most recent event
stripe events resend evt_TESTID
```

**Expected:**
- `200` response
- No duplicate rows in `overage_purchases` (enforced by `onConflict: stripe_payment_intent_id`)
- No duplicate subscription rows (enforced by `onConflict: user_id`)

---

## Step 9 — Invalid signature

**What you're testing:** the handler rejects forged webhook requests.

```bash
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "stripe-signature: t=1,v1=invalid" \
  -d '{"type":"customer.subscription.deleted"}'
```

**Expected:**
- `400` response with `{"error":"Invalid signature"}`.
- No DB writes.

**If this returns 200:** your handler isn't verifying signatures, which is a critical security flaw. Check `STRIPE_WEBHOOK_SECRET` is set and `stripe.webhooks.constructEvent` is actually being called before the dispatcher.

---

## Step 10 — Middleware exclusion

**What you're testing:** the webhook path isn't accidentally hitting your auth middleware.

In `middleware.ts`, there should be a matcher config that excludes `/api/stripe/webhook`. If not, the request will be intercepted and Supabase's auth cookie refresh will try to consume the request body — which is required by Stripe's signature verification.

Check by watching for a specific failure mode: Stripe CLI shows `200` responses but `next dev` logs show signature verification failures. That's middleware consuming the body before the handler sees it.

**Fix:** ensure `middleware.ts` matcher includes:
```typescript
export const config = {
  matcher: [
    "/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

---

## Pass criteria — all must hold

- [ ] `stripe listen` shows 200 responses for all events in steps 2–7
- [ ] Trial signup creates a `subscriptions` row with `status=trialing`, counters at 0
- [ ] Trial conversion flips status to `active` and resets counters
- [ ] Overage purchase creates an unconsumed `overage_purchases` row (`session_id=null`); the next session-creation attempt claims it and bumps the counter
- [ ] Basic renewal resets counters and slides cycle window forward
- [ ] Payment failure sets `status=past_due` without touching counters
- [ ] Cancellation (two stages) handled correctly
- [ ] Replay of any event is idempotent
- [ ] Invalid signature returns 400 with no DB writes

---

## When any step fails

Run the fixture harness first: `npx tsx scripts/stress-stripe-webhook.ts`. If that passes (as it does in the ship state), the handler logic is correct — the live failure is either:

1. **Config.** Wrong secret, wrong price ID, missing metadata, middleware interception.
2. **Stripe dashboard state.** Product not configured with a trial, billing interval wrong, price not active.
3. **Environment.** Stripe CLI not forwarding, `.env.local` not re-read after change, supabase service role key scoped wrong.

Inspect the specific event payload in Stripe dashboard → Developers → Events → click the event → "Preview webhook payload." Compare to what the fixture harness feeds — if your payload is missing a field (e.g. no `user_id` in `subscription.metadata`), the bug is upstream (checkout session creation), not in the webhook.

---

## What this runbook does NOT cover

- **Production deployment.** Webhook URLs on prod must be HTTPS and registered in the Stripe dashboard (Developers → Webhooks → Add endpoint). The `STRIPE_WEBHOOK_SECRET` for prod is DIFFERENT from the one `stripe listen` gives you in dev — you'll get a new `whsec_...` when you register the prod endpoint.
- **Paid flows (real money).** This is strictly test-mode. Do not run these steps against `sk_live_...`.
- **Dispute / chargeback handling.** Not currently modeled in the handler. If this becomes a real concern, add a `charge.dispute.created` branch.
- **Subscription schedule / phase changes.** If you ever use Stripe Subscription Schedules, those emit different events. Not currently used by Folio.
