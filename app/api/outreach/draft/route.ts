import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { generateDraft } from "@/lib/outreach/draft";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { withRateLimit, type AuthedContext } from "@/lib/rate-limit/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Input = z.object({
  contactId: z.string().uuid(),
});

const PatchInput = z.object({
  draftId: z.string().uuid(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
});

const DeleteInput = z.object({
  draftId: z.string().uuid(),
});

/**
 * POST /api/outreach/draft
 *
 * Loads a contact from outreach_contacts, generates a personalized outreach
 * email via Claude, and persists the draft to outreach_drafts.
 */
async function handler(req: NextRequest, { user }: AuthedContext) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = createServerClient();

  // 1. Load the contact
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contact, error: contactError } = await (supabase.from("outreach_contacts") as any)
    .select("*")
    .eq("id", parsed.data.contactId)
    .eq("user_id", user.id)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: "contact_not_found" }, { status: 404 });
  }

  // 2. Load user profile for personalization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("user_profiles") as any)
    .select("full_name, target_role, target_firms")
    .eq("id", user.id)
    .single();

  const userProfile = {
    name: profile?.full_name ?? user.email?.split("@")[0] ?? "Candidate",
    background: profile?.target_role
      ? `Targeting ${profile.target_role} roles`
      : "Career professional",
    targetRole: profile?.target_role ?? contact.title ?? "the role",
  };

  try {
    const draft = await generateDraft({
      contactName: contact.name,
      contactTitle: contact.title,
      contactCompany: contact.company,
      userProfile,
      tone: "professional",
      requestId: crypto.randomUUID(),
    });

    // 3. Persist the draft
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saved, error: insertError } = await (supabase.from("outreach_drafts") as any)
      .insert({
        user_id: user.id,
        contact_id: parsed.data.contactId,
        subject: draft.subject,
        body: draft.body,
        status: "draft",
        tone: "professional",
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("[outreach.draft] insert failed:", insertError);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ draft: saved });
  } catch (err) {
    console.error("[outreach.draft] error:", err);
    return NextResponse.json({ error: "draft_failed" }, { status: 500 });
  }
}

export const POST = withRateLimit(RATE_LIMITS.outreach_draft, handler);

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PatchInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("outreach_drafts") as any)
    .update({ subject: parsed.data.subject, body: parsed.data.body })
    .eq("id", parsed.data.draftId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("[outreach.draft] update failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ draft: data });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = DeleteInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("outreach_drafts") as any)
    .delete()
    .eq("id", parsed.data.draftId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[outreach.draft] delete failed:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
