import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { createPortalSession } from "@/lib/stripe/checkout";

export async function POST() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const result = await createPortalSession({ userId: user.id });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Portal] Error:", err);
    return NextResponse.json({ error: "Could not open billing portal. Please try again." }, { status: 500 });
  }
}
