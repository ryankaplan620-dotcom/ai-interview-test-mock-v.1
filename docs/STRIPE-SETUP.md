# Stripe Dashboard Setup — Pricing Restructure
# April 22, 2026

## Context

You have no live subscribers, so this is a clean cutover. Delete old Products
that no longer match the new pricing, create new Products, copy the price IDs
into your .env.

## Order of operations

### 1. Archive old Products (don't delete — Stripe keeps history cleaner)

In Stripe Dashboard → Products, archive:
- "Cycle" product (replaced by Basic)
- Any prior "Pro" and "Max" products (prices changed, recreate cleanly)
- Old overage price objects ($8 and $6)

Archiving preserves webhook history but removes them from the new checkout
flow. Safer than delete.

### 2. Create new subscription Products

Create four Stripe Products. For each, create a recurring Price.

| Product name | Price | Billing interval | Metadata |
|---|---|---|---|
| Folio Basic | $49.00 | Every 90 days | tier=basic |
| Folio Pro | $149.00 | Yearly | tier=pro |
| Folio Max | $249.00 | Yearly | tier=max |

Important Stripe settings for each:
- Currency: USD
- Tax behavior: exclusive (or whatever your current setup uses, keep consistent)
- Add `tier` metadata on the Price object itself, not just the Product.
  Webhook handler reads subscription.items.data[0].price.metadata.tier.
- Statement descriptor: "FOLIO [TIER]" for clarity on bank statements

### 3. Create overage Prices

Overage is charged per session (not recurring). Two options:

**Option A: one-time Prices, charged via invoice items**
- Create a Product "Folio Session Overage" with two Prices:
  - $20.00 one-time (used for Basic + Pro)
  - $15.00 one-time (used for Max)
- When a user triggers overage, server creates a one-time charge / invoice item

**Option B: metered Prices with usage records**
- Create metered Price for each tier's overage rate
- Report usage via Stripe API when session completes
- Stripe bills automatically at period end

Option A is simpler for pre-launch. Migrate to Option B later if it matches
better how you want overage to feel to users.

### 4. Copy price IDs to .env

Copy the six `price_xxxxx` IDs into your `.env.local` and production env:

```
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_MAX=price_...
STRIPE_PRICE_OVERAGE_STANDARD=price_...
STRIPE_PRICE_OVERAGE_MAX=price_...
```

Remove old `STRIPE_PRICE_CYCLE` env var if it's still there.

### 5. Update webhook metadata check

If your webhook handler (`app/api/stripe/webhook/route.ts` or similar) reads
the tier from Stripe subscription metadata, confirm it tolerates the new tier
names: 'basic', 'pro', 'max'. No 'cycle' references should remain.

### 6. Test with Stripe test mode

Before pointing production at new prices:
1. Use Stripe test mode keys
2. Run a checkout for each tier
3. Confirm the resulting subscription has correct metadata.tier
4. Confirm webhook fires and creates the subscription row in Supabase
5. Run an overage charge to confirm invoice item / metered usage flows

Only after all four tests pass, swap to production keys.

## Tier metadata JSON schema

When creating Prices in the dashboard, add this metadata to ensure the
webhook handler can cleanly identify tiers:

```
Price metadata:
{
  "tier": "basic" | "pro" | "max",
  "billing_days": "90" | "365",
  "included_interviews": "3" | "8" | "16",
  "included_comms": "4" | "10" | "20",
  "included_outreach": "10" | "30" | "100"
}
```

This makes the Stripe subscription self-describing — if you ever need to
reconcile subscription state without lib/tiers.ts, the metadata has it.
