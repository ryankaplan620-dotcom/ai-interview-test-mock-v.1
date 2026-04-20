import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { createSubscriptionCheckout, createCoachReviewCheckout } from "@/lib/stripe/checkout";

const SubscriptionBody = z.object({
  type: z.literal("subscription"),
  tier: z.enum(["student", "general", "pro", "max"]),
  billingCycle: z.enum(["monthly", "yearly"]),
});

const CoachReviewBody = z.object({
  type: z.literal("coach_review"),
  sessionId: z.string().uuid().optional(),
});

const CheckoutBody = z.discriminatedUnion("type", [SubscriptionBody, CoachReviewBody]);

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = CheckoutBody.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "User email missing" }, { status: 400 });
    }

    let result: { url: string };

    if (parsed.data.type === "subscription") {
      result = await createSubscriptionCheckout({
        userId: user.id,
        email: user.email,
        tier: parsed.data.tier,
        billingCycle: parsed.data.billingCycle,
      });
    } else {
      result = await createCoachReviewCheckout({
        userId: user.id,
        email: user.email,
        sessionId: parsed.data.sessionId,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[Checkout] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
