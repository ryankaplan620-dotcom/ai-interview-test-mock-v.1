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
  targetCity: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { targetCompany, targetRole, targetCity } = parsed.data;

  try {
    const contacts = await scoutContacts({
      targetCompany,
      targetRole,
      targetCity,
      userId: user.id,
      requestId: crypto.randomUUID(),
    });

    // Persist. Try the rich shape first (enrichment JSONB column). If that
    // column doesn't exist yet (migration 0013 not applied), fall back to the
    // legacy shape so we still keep contact rows. Either way, request the
    // inserted rows back — the client needs each contact's real id to make
    // it actionable (e.g. "Draft email") without a page reload.
    let insertedRows: { id: string; created_at: string }[] | null = null;
    try {
      const supabase = createServerClient();

      const rich = contacts.map((c) => ({
        user_id: user.id,
        name: c.name,
        title: c.title,
        company: c.company,
        status: "suggested",
        relevance_reason: c.relevance_reason,
        suggested_approach: c.suggested_approach,
        enrichment: {
          city: c.city,
          linkedin_url: c.linkedin_url,
          inferred_email: c.inferred_email,
          email_confidence: c.email_confidence,
          role_signal: c.role_signal,
          tenure_signal: c.tenure_signal,
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertResult = await (supabase.from("outreach_contacts") as any)
        .insert(rich)
        .select("id, created_at");

      if (insertResult.error) {
        // Most likely cause: enrichment column / relevance_reason column missing.
        // Retry with the minimal legacy shape.
        const legacy = contacts.map((c) => ({
          user_id: user.id,
          name: c.name,
          title: c.title,
          company: c.company,
          status: "suggested",
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const legacyResult = await (supabase.from("outreach_contacts") as any)
          .insert(legacy)
          .select("id, created_at");
        if (!legacyResult.error) insertedRows = legacyResult.data;
      } else {
        insertedRows = insertResult.data;
      }
    } catch (dbErr) {
      console.warn("[outreach.scout] DB insert failed (non-fatal):", dbErr);
    }

    // If persistence succeeded, return full OutreachContact rows (with real
    // ids) so the client can merge them straight into the actionable list.
    // Otherwise fall back to the raw scouted contacts (no id — read-only).
    if (insertedRows && insertedRows.length === contacts.length) {
      const persisted = contacts.map((c, i) => ({
        id: insertedRows![i].id,
        name: c.name,
        title: c.title,
        company: c.company,
        source: "scout",
        status: "suggested",
        relevance_reason: c.relevance_reason,
        suggested_approach: c.suggested_approach,
        enrichment: {
          city: c.city,
          linkedin_url: c.linkedin_url,
          inferred_email: c.inferred_email,
          email_confidence: c.email_confidence,
          role_signal: c.role_signal,
          tenure_signal: c.tenure_signal,
        },
        created_at: insertedRows![i].created_at,
      }));
      return NextResponse.json({ contacts: persisted, persisted: true });
    }

    return NextResponse.json({ contacts, persisted: false });
  } catch (err) {
    console.error("[outreach.scout] error:", err);
    return NextResponse.json({ error: "scout_failed" }, { status: 500 });
  }
}
