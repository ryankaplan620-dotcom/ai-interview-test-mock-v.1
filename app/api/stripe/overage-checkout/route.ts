import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser, getUserTier } from "@/lib/auth/server";
import { createOverageCheckout } from "@/lib/stripe/checkout";

const Input = z.object({
  sessionId: z.string().uuid().optional(),
});

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
 *   3. On confirm, client calls this endpoint. No session exists yet, so
 *      `sessionId` is omitted.
 *   4. User is redirected to Stripe Checkout
 *   5. Stripe webhook fires payment_intent.succeeded → a `session_id`-less
 *      overage_purchases row with status='succeeded' is recorded
 *   6. Stripe redirects user back to /session/new?overage=paid → client calls
 *      startSession({ overageAccepted: true }), which looks up that
 *      unconsumed row, creates the session, and links the row to it
 */
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await request.json();
    const parsed = Input.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

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
      sessionId: parsed.data.sessionId,
      tier: tier.effective_tier,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Overage Checkout] Error:", err);
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}
