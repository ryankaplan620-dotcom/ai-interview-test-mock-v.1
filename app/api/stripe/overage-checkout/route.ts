import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, getUserTier } from "@/lib/auth/server";
import { createOverageCheckout } from "@/lib/stripe/checkout";
import { createServerClient } from "@/lib/db/server";

const Input = z.object({
  sessionId: z.string().uuid(),
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
 *   3. On confirm, client calls this endpoint with the (pending) sessionId
 *   4. User is redirected to Stripe Checkout
 *   5. Stripe webhook fires payment_intent.succeeded → overage_purchases row
 *   6. Stripe redirects user back to /session/[id]?overage=paid → interview starts
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
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

    const supabase = createServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase.from("sessions") as any)
      .select("id, user_id")
      .eq("id", parsed.data.sessionId)
      .single();

    if (!session || session.user_id !== user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
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
