import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireStripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/db/server";
import {
  dispatchWebhookEvent,
  type WebhookSupabase,
  type WebhookStripe,
} from "@/lib/stripe/webhook-handlers";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/stripe/webhook
 *
 * Verifies the Stripe signature and delegates event handling to
 * lib/stripe/webhook-handlers. The business logic lives there so it can
 * be exercised by the fixture harness in scripts/stress-stripe-webhook.ts
 * without requiring live Stripe keys.
 *
 * MUST NOT use the middleware session-refresh logic — excluded via
 * middleware matcher.
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

  try {
    const supabase = createServiceRoleClient() as unknown as WebhookSupabase;
    const stripeWebhookClient = stripe as unknown as WebhookStripe;
    const result = await dispatchWebhookEvent(event, {
      supabase,
      stripe: stripeWebhookClient,
    });
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
