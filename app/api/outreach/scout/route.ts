import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { scoutContacts } from "@/lib/outreach/scout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Input = z.object({
  targetCompany: z.string().min(1).max(200),
  targetRole: z.string().min(1).max(200),
});

/**
 * POST /api/outreach/scout
 *
 * Uses Claude to generate contact suggestions for the given company + role,
 * then persists them to outreach_contacts.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { targetCompany, targetRole } = parsed.data;

  try {
    const contacts = await scoutContacts({
      targetCompany,
      targetRole,
      userId: user.id,
      requestId: crypto.randomUUID(),
    });

    const supabase = createServerClient();

    const rows = contacts.map((c) => ({
      user_id: user.id,
      name: c.name,
      title: c.title,
      company: c.company,
      source: "folio_scout",
      status: "suggested",
      relevance_reason: c.relevanceReason,
      suggested_approach: c.suggestedApproach,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("outreach_contacts") as any)
      .insert(rows)
      .select("*");

    if (error) {
      console.error("[outreach.scout] insert failed:", error);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ contacts: data });
  } catch (err) {
    console.error("[outreach.scout] error:", err);
    return NextResponse.json({ error: "scout_failed" }, { status: 500 });
  }
}
