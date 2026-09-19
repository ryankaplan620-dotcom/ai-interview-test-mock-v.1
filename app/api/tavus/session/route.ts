import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/db/server";
import { getPersonaAvatarId } from "@/lib/personas";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { withRateLimit, type AuthedContext } from "@/lib/rate-limit/middleware";
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
//
// This is the legacy fallback used when tavusConfigured() is false (persona
// not registered under /api/tavus/conversation). It must stay behind the
// same rate limit and register the same signed webhook callback_url as the
// primary route — otherwise sessions started here never receive
// system.shutdown / application.transcription_ready and can never complete.

async function handler(req: NextRequest, { user }: AuthedContext) {
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const webhookSecret = process.env.TAVUS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Tavus] TAVUS_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }
  const callbackUrl = `${baseUrl}/api/tavus/webhook/${encodeURIComponent(webhookSecret)}`;

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
        callback_url: callbackUrl,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Tavus] Session creation failed:", err);
      return NextResponse.json({ error: "tavus_session_failed" }, { status: 502 });
    }

    const tavusData = await res.json();

    // Persist the conversation id/url — the webhook looks sessions up by
    // tavus_conversation_id, so without this the session can never receive
    // completion events and would be stuck in "in_progress" forever.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("sessions") as any)
      .update({
        tavus_conversation_id: tavusData.conversation_id,
        tavus_conversation_url: tavusData.conversation_url,
        started_at: new Date().toISOString(),
        status: "in_progress",
      })
      .eq("id", session.id);

    return NextResponse.json({
      conversationUrl: tavusData.conversation_url,
      conversationId: tavusData.conversation_id,
    });
  } catch (err) {
    console.error("[Tavus] Unexpected error:", err);
    return NextResponse.json({ error: "tavus_session_failed" }, { status: 502 });
  }
}

export const POST = withRateLimit(RATE_LIMITS.tavus_conversation, handler);
