import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createPortalSession } from "@/lib/stripe/checkout";

export async function POST() {
  try {
    const user = await requireUser();
    const result = await createPortalSession({ userId: user.id });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Portal] Error:", err);
    return NextResponse.json({ error: "Could not open billing portal. Please try again." }, { status: 500 });
  }
}
