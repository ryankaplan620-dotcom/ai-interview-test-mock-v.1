import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Stripe server-side client (lazy-initialized).
 * Call requireStripe() to get an instance; throws at call-time if key is missing,
 * not at module-load time (so builds don't crash before env vars are set).
 */
export function requireStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }

  _stripe = new Stripe(key, {
    apiVersion: "2024-12-18.acacia",
    typescript: true,
    appInfo: {
      name: "Folio",
      version: "0.2.0",
      url: "https://folio.io",
    },
  });

  return _stripe;
}

/**
 * Returns the Stripe client if configured, null otherwise.
 * Use this when you want to gracefully handle missing configuration.
 */
export function getStripe(): Stripe | null {
  try {
    return requireStripe();
  } catch {
    return null;
  }
}
