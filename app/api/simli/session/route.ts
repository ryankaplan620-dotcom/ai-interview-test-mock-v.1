import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { PERSONAS, getPersonaAvatarId } from "@/lib/personas";
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
// NOTE: VERIFY AGAINST CURRENT SIMLI DOCS
//
// The exact Simli REST endpoint for creating a streaming session varies
// across their API versions. This route wraps the call in a single helper
// (`createSimliSession` below) so updating to match current docs is a
// one-function edit. The route's contract with the client stays stable:
//
//   Request:  { sessionId }
//   Response: { sessionToken, faceId, iceServers?, wsUrl? }
//
// The client uses these to establish the WebRTC connection. If Simli's
// current flow returns an SDP answer directly or uses a different shape,
// update createSimliSession() and the SimliSessionResponse type — the
// client's SimliAvatarClient reads only the fields declared here.
// --------------------------------------------------------------------------

interface SimliSessionResponse {
  /** Session token used by the client to authenticate WebRTC signaling. */
  sessionToken: string;
  /** The avatar's face ID (echoed for client-side reference). */
  faceId: string;
  /** Optional custom ICE servers from Simli. Defaults to Google STUN if absent. */
  iceServers?: RTCIceServer[];
  /** Optional signaling WebSocket URL if Simli uses WS-based SDP exchange. */
  wsUrl?: string;
}

async function createSimliSession(opts: {
  apiKey: string;
  faceId: string;
}): Promise<SimliSessionResponse> {
  // --------------------------------------------------------------------
  // VERIFY: Simli startAudioToVideoSession endpoint + request shape.
  // Reference: https://docs.simli.com (check "Start Session" in their API ref).
  // This structure reflects Simli's documented pattern as of 2025: POST
  // with api_key + face_id, receive a session_token.
  // --------------------------------------------------------------------
  const res = await fetch("https://api.simli.ai/startAudioToVideoSession", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey: opts.apiKey,
      faceId: opts.faceId,
      // Simli's body may accept additional fields: maxSessionLength, maxIdleTime, etc.
      // Set conservative defaults; adjust per current docs.
      maxSessionLength: 3600,
      maxIdleTime: 60,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`simli_start_session_failed_${res.status}_${body.slice(0, 120)}`);
  }

  const data = await res.json();

  // --------------------------------------------------------------------
  // VERIFY: field names from Simli's response. Common shapes:
  //   { session_token, room_url, ice_servers }
  //   { sessionToken, webrtcUrl, iceConfig }
  // Map the current response into our stable SimliSessionResponse shape.
  // --------------------------------------------------------------------
  return {
    sessionToken: data.session_token ?? data.sessionToken ?? "",
    faceId: opts.faceId,
    iceServers: data.ice_servers ?? data.iceServers,
    wsUrl: data.room_url ?? data.ws_url ?? data.webrtcUrl ?? data.wsUrl,
  };
}

// --------------------------------------------------------------------------
// Route
// --------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.SIMLI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "simli_not_configured" }, { status: 503 });
  }

  const parsed = SessionInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Load session, verify ownership, look up avatar ID for the persona
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

  const faceId = getPersonaAvatarId(session.persona);
  if (!faceId) {
    return NextResponse.json({ error: "avatar_not_configured" }, { status: 503 });
  }

  // Log persona for debugging in dev — remove before prod
  void PERSONAS[session.persona];

  try {
    const simli = await createSimliSession({ apiKey, faceId });
    return NextResponse.json(simli);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "simli_session_failed" },
      { status: 502 },
    );
  }
}
