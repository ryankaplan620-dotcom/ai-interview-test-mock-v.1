import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Input = z.object({
  draftId: z.string().uuid(),
});

/**
 * POST /api/outreach/send
 *
 * Marks an outreach draft as "sent". Does NOT actually send email via Resend
 * yet — Resend integration is deferred. Just updates the status and records
 * the timestamp.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = createServerClient();

  const sentAt = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("outreach_drafts") as any)
    .update({ status: "sent", sent_at: sentAt })
    .eq("id", parsed.data.draftId)
    .eq("user_id", user.id)
    .select("id, status, sent_at")
    .single();

  if (error) {
    console.error("[outreach.send] update failed:", error);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, sentAt: data.sent_at });
}
