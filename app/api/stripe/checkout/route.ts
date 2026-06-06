import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { createSubscriptionCheckout } from "@/lib/stripe/checkout";

const CheckoutBody = z.object({
  tier: z.enum(["basic", "pro", "max"]),
});

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

    const result = await createSubscriptionCheckout({
      userId: user.id,
      email: user.email,
      tier: parsed.data.tier,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Checkout] Error:", err);
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}
