import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Input = z.object({
  sessionId: z.string().uuid(),
});

/**
 * Lazy fetch for Q&A feedback and boundary.
 *
 * The main /api/feedback/generate route runs Q&A analysis inline after the
 * main feedback persists, but the browser may land on the feedback page
 * between "main feedback is in" and "Q&A feedback is in." This endpoint
 * lets the client poll for Q&A state without forcing the whole feedback
 * flow to be blocked on Q&A completion.
 *
 * Returns one of three shapes:
 *   - { status: 'absent', boundary: {...} } — session too short, or no Q&A
 *     section was detected. UI should not render the Q&A panel.
 *   - { status: 'pending' } — main feedback exists, Q&A processing hasn't
 *     completed yet. UI should show a loading placeholder and poll again.
 *   - { status: 'ready', feedback: {...}, boundary: {...} } — both are in.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { sessionId } = parsed.data;
  const supabase = await createServerClient();

  // Verify ownership — RLS would handle this, but returning a clean 404 is
  // less leaky than relying on an empty select result.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session } = await (supabase.from("sessions") as any)
    .select("id, user_id, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Boundary row is persisted BEFORE Q&A feedback, and is also persisted when
  // method='absent' (short sessions). If the boundary row is missing, Q&A
  // processing hasn't run at all yet → pending.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: boundary } = await (supabase.from("session_qa_boundary") as any)
    .select("session_id, method, start_turn_index, start_seconds, candidate_questions_count")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!boundary) {
    return NextResponse.json({ status: "pending" });
  }

  if (boundary.method === "absent") {
    return NextResponse.json({ status: "absent", boundary });
  }

  // Boundary exists and says there was a Q&A section — fetch the feedback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: feedback } = await (supabase.from("session_qa_feedback") as any)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!feedback) {
    // Boundary is there but feedback isn't yet — either still processing or
    // processing failed. From the UI's perspective these are the same until
    // we give up polling.
    return NextResponse.json({ status: "pending", boundary });
  }

  return NextResponse.json({ status: "ready", feedback, boundary });
}
