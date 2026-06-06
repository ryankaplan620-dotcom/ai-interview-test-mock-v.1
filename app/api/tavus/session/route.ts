import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { getPersonaAvatarId } from "@/lib/personas";
import type { PersonaId } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --------------------------------------------------------------------------
// Input
// --------------------------------------------------------------------------

const SessionInput = z.object({
  sessionId: z.string().uuid(),
});

// --------------------------------------------------------------------------
// Route
// --------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tavusApiKey = process.env.TAVUS_API_KEY;
  if (!tavusApiKey) {
    return NextResponse.json({ error: "tavus_not_configured" }, { status: 503 });
  }

  const parsed = SessionInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Load session, verify ownership, look up replica ID for the persona
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("sessions") as any)
    .select("id, user_id, persona, status")
    .eq("id", parsed.data.sessionId)
    .single();

  const session = data as
    | { id: string; user_id: string; persona: PersonaId; status: string }
    | null;

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (["completed", "abandoned", "failed"].includes(session.status)) {
    return NextResponse.json({ error: "session_ended" }, { status: 409 });
  }

  const replicaId = getPersonaAvatarId(session.persona);
  if (!replicaId) {
    return NextResponse.json({ error: "replica_not_configured" }, { status: 503 });
  }

  try {
    // Create a Tavus conversation
    const res = await fetch("https://tavusapi.com/v2/conversations", {
      method: "POST",
      headers: {
        "x-api-key": tavusApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        replica_id: replicaId,
        // We handle the conversation logic ourselves — Tavus just renders
        conversation_name: `folio-${session.persona}-${Date.now()}`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Tavus] Session creation failed:", err);
      return NextResponse.json({ error: "tavus_session_failed" }, { status: 502 });
    }

    const tavusData = await res.json();
    return NextResponse.json({
      conversationUrl: tavusData.conversation_url,
      conversationId: tavusData.conversation_id,
    });
  } catch (err) {
    console.error("[Tavus] Unexpected error:", err);
    return NextResponse.json({ error: "tavus_session_failed" }, { status: 502 });
  }
}
