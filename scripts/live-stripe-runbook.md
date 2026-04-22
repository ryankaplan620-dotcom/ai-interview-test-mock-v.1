# Stripe live-test runbook

Step-by-step checklist for running the Phase H webhook against real Stripe test-mode keys.

The fixture harness in `stress-stripe-webhook.ts` already proves the handler logic is correct. What this runbook catches is **configuration**: wrong env vars, missing checkout metadata, price ID mismatches, SheerID misconfig.

---

## Prerequisites

1. **Stripe CLI** — `brew install stripe/stripe-cli/stripe` (or platform equivalent). `stripe login`.
2. **Test-mode keys** in `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...  # from `stripe listen`
   ```
3. **Test-mode Stripe dashboard** has products + prices matching Phase H:
   - Cycle: $49 recurring every 90 days
   - Pro: $149 recurring yearly
   - Max: $249 recurring yearly
   - Overage: $8 one-time (Cycle/Pro), $6 one-time (Max)
4. **Supabase** migrations through 0009 applied on a dev/test database.

---

## Step 1 — Start the webhook forwarder

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` signing secret into `.env.local` and restart the Next dev server.

## Step 2 — Trial signup

In the browser: log in as a test user, go to `/pricing`, pick Pro, click "Start trial."

In the Stripe CLI terminal, expect:
```
customer.created
customer.subscription.created        ← our handler acts on this
```

In Supabase:
```sql
select user_id, tier, status, cycle_start, cycle_end, trial_end,
       sessions_used_this_cycle, overages_used_this_cycle, auto_renew
from subscriptions
where user_id = '<your test UUID>';
```

Expected:
- `tier = 'pro'`
- `status = 'trialing'`
- `trial_end` ≈ 15 days from now
- Counters = 0
- `auto_renew = true`

## Step 3 — Cancel mid-trial

In `/settings`, click "Cancel subscription." Watch for:
```
customer.subscription.updated        ← cancel_at_period_end: true
```

Supabase:
- `cancel_at_period_end = true`
- `auto_renew = false`
- `status` still `trialing` (user keeps access through trial end)

## Step 4 — Trial conversion

Use Stripe test clocks (`stripe test_helpers test-clocks advance`) or the CLI trigger:

```bash
stripe trigger customer.subscription.updated --override=status=active
```

Expected webhook sequence:
1. `customer.subscription.updated` (status → active)
2. `invoice.paid`

Supabase:
- `status = 'active'`
- `cycle_start` = old trial_end
- `cycle_end` = `cycle_start + 365d` for Pro
- `sessions_used_this_cycle = 0` (explicit reset via invoice.paid)
- `trial_end` still populated (historical)

## Step 5 — Consume a session

From `/session/new`, start and complete a test session. Supabase:
```sql
select sessions_used_this_cycle from subscriptions where ...;
```
Expected: `1`. Bumped synchronously by `session/new/actions.ts`, not by the webhook.

## Step 6 — Trigger an overage

Consume enough sessions to exceed the tier cap. The overage modal triggers. Confirm the charge.

Expected webhook:
```
payment_intent.succeeded
```

Supabase:
```sql
select * from overage_purchases where user_id = ...;
select overages_used_this_cycle from subscriptions where ...;
```
Expected: one `overage_purchases` row with `status = 'succeeded'`, `amount = 800` (Pro) or `600` (Max). Counter = 1.

## Step 7 — Replay idempotency

Copy the overage `evt_...` id from the CLI log. Resend:
```bash
stripe events resend evt_xxxxxxxxx
```

`overage_purchases` should still have exactly one row for that PI id.

## Step 8 — Renewal (test clock)

Advance the test clock to `cycle_end`. Expect `invoice.paid` to fire again. Verify counters reset and cycle window advances.

## Step 9 — Payment failure

```bash
stripe trigger invoice.payment_failed
```

Expected: `status = 'past_due'`, counters unchanged.

## Step 10 — Malformed signature rejection

```bash
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "stripe-signature: t=0,v1=fake" \
  -d '{"fake":"event"}'
```

Expected: `400 {"error":"Invalid signature"}`. Nothing changes in Supabase.

---

## Common failure modes

| Symptom | Likely cause |
|---|---|
| Webhook returns 400 on every event | `STRIPE_WEBHOOK_SECRET` doesn't match the one `stripe listen` printed |
| Subscription created in Stripe but no row in Supabase | Checkout session missing `metadata.user_id` — check wherever you create the Checkout Session |
| Tier in Supabase doesn't match what user picked | Price ID in Stripe dashboard doesn't match `lib/tiers.ts`; OR checkout metadata missing `tier` |
| Cycle checkout never progresses past SheerID | `SHEERID_PROGRAM_ID` not set, or the program isn't live in SheerID dashboard |
| Overage purchase succeeds but counter doesn't bump | Counter is bumped synchronously by `session/new/actions.ts`, not the webhook — verify that action ran (check logs) |
| `handleInvoicePaid` throws "No such subscription" | Webhook fired before subscription was fully persisted. Stripe occasionally sends events out of order; retry via `stripe events resend` should succeed once subscription exists |

---

## When this is done

You've verified, end-to-end against real Stripe, that:
- Trial signups create correct Supabase rows
- Cancellation mid-trial works cleanly
- Conversion fires both `subscription.updated` and `invoice.paid`, counters reset once
- Overage purchases persist and are idempotent
- Signature verification rejects tampering
- Payment failures mark `past_due` without wiping user state

That's the full contract. Phase H is live-verified. Move to paying users.
