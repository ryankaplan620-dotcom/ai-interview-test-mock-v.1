import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { initiateVerification } from "@/lib/verification/student";

export async function POST() {
  try {
    const user = await requireUser();
    if (!user.email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const result = await initiateVerification({ userId: user.id, email: user.email });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    console.error("[Verify Student] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
