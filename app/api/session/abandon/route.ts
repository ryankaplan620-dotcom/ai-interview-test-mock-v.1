import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/session/abandon
 *
 * Called via navigator.sendBeacon when the user closes the tab or navigates
 * away during an active session. Marks the session as abandoned so the
 * dashboard shows the correct status instead of leaving it stuck as in_progress.
 *
 * sendBeacon uses a simple POST with a Blob body — no custom headers, so we
 * can't send a Bearer token. Authentication uses the session cookie the browser
 * sends automatically with same-origin requests.
 *
 * Idempotent: calling on an already-finalized session is a no-op.
 */
export async function POST(req: NextRequest) {
  let sessionId: string | undefined;

  try {
    const body = await req.json();
    sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;
  } catch {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    // sendBeacon fires during page unload — auth cookie may not carry over on
    // some browsers. Return 200 to prevent Tavus-side retries; the session
    // state will be reconciled by the Tavus shutdown webhook.
    return NextResponse.json({ ok: true, note: "unauthenticated" });
  }

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = supabase.from("sessions") as any;

  const { data: existing } = await sessions
    .select("id, user_id, status")
    .eq("id", sessionId)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ ok: true }); // ack silently — not our session
  }

  if (["completed", "abandoned", "failed"].includes(existing.status)) {
    return NextResponse.json({ ok: true }); // already finalized
  }

  const { error: updateError } = await sessions
    .update({ status: "abandoned", ended_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (updateError) {
    console.error("[session.abandon] update failed:", updateError);
    // Still ack — Tavus shutdown webhook will reconcile.
  }

  return NextResponse.json({ ok: true });
}
