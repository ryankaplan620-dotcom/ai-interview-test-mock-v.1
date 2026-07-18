import { NextResponse } from "next/server";
import { requireUser, getUserTier } from "@/lib/auth/server";
import { createOverageCheckout } from "@/lib/stripe/checkout";

/**
 * POST /api/stripe/overage-checkout
 *
 * Creates a one-off Stripe Checkout session to charge the user for an
 * overage interview slot. Called from the picker when the user has
 * exhausted their cycle's included sessions and confirmed they want to
 * purchase an overage.
 *
 * Flow:
 *   1. Client calls startSession() → gets session_quota_exceeded + overageAvailable
 *   2. Client shows confirmation dialog with price
 *   3. On confirm, client calls this endpoint (no session exists yet —
 *      nothing to accept from the client here, only the authenticated user)
 *   4. User is redirected to Stripe Checkout
 *   5. Stripe webhook fires payment_intent.succeeded → overage_purchases row
 *      is recorded with session_id = null (an unconsumed credit)
 *   6. Stripe redirects user back to /session/new?overage=paid → the picker
 *      resubmits startSession(), which looks up and atomically claims the
 *      unconsumed credit server-side before creating the session.
 */
export async function POST() {
  try {
    const user = await requireUser();

    if (!user.email) {
      return NextResponse.json({ error: "User email missing" }, { status: 400 });
    }

    const tier = await getUserTier();
    if (!tier) {
      return NextResponse.json(
        { error: "No active subscription — can't purchase overage without a base plan." },
        { status: 400 },
      );
    }

    const result = await createOverageCheckout({
      userId: user.id,
      email: user.email,
      tier: tier.effective_tier,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Overage Checkout] Error:", err);
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}
