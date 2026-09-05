import { NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/db/server";
import { PERSONAS, getPersonaVoiceId } from "@/lib/personas";
import { env } from "@/lib/pipeline/env";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { withRateLimit } from "@/lib/rate-limit/middleware";
import type { PersonaId } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --------------------------------------------------------------------------
// Input
// --------------------------------------------------------------------------

const TTSInput = z.object({
  sessionId: z.string().uuid(),
  /** The sentence to synthesise. Usually emitted by the orchestrator at sentence boundaries. */
  text: z.string().min(1).max(2000),
  /** Monotonic index used for ordering/debugging; not required by ElevenLabs. */
  sentenceIndex: z.number().int().nonnegative().optional(),
});

// --------------------------------------------------------------------------
// Route — POST returns raw PCM audio (chunked)
// --------------------------------------------------------------------------

async function handler(req: NextRequest, { user }: { user: { id: string } }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response("elevenlabs_not_configured", { status: 503 });
  }

  const parsed = TTSInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("bad_request", { status: 400 });

  // Server-side: rebuild persona from session (don't trust client claims about voice ID)
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
    return new Response("not_found", { status: 404 });
  }
  if (["completed", "abandoned", "failed"].includes(session.status)) {
    return new Response("session_ended", { status: 409 });
  }

  const persona = PERSONAS[session.persona];
  const voiceId = getPersonaVoiceId(session.persona);
  if (!voiceId) {
    return new Response("voice_not_configured", { status: 503 });
  }

  // --------------------------------------------------------------------
  // ElevenLabs streaming request
  //   pcm_22050 output — trivially chunk-decodable on the client, no MP3
  //   headers to deal with, fits our audio-sink's push model cleanly.
  // --------------------------------------------------------------------

  const params = new URLSearchParams({ output_format: "pcm_22050" });
  const elevenLabsRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?${params.toString()}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/pcm",
      },
      body: JSON.stringify({
        text: parsed.data.text,
        model_id: env.elevenLabsModel(),
        voice_settings: {
          stability: persona.voiceSettings.stability,
          similarity_boost: persona.voiceSettings.similarityBoost,
          style: persona.voiceSettings.style,
          use_speaker_boost: persona.voiceSettings.speakerBoost,
        },
      }),
      // Pass through the request abort signal so client-side cancellation stops ElevenLabs billing
      signal: req.signal,
    },
  );

  if (!elevenLabsRes.ok) {
    const text = await elevenLabsRes.text().catch(() => "");
    console.error(`[tts.stream] elevenlabs failed ${elevenLabsRes.status}: ${text.slice(0, 500)}`);
    return new Response(
      JSON.stringify({ error: "tts_failed" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!elevenLabsRes.body) {
    return new Response("elevenlabs_no_body", { status: 502 });
  }

  // Forward the audio stream directly. Headers tell the client to treat this
  // as raw PCM at 22050 Hz, mono, 16-bit signed little-endian.
  return new Response(elevenLabsRes.body, {
    headers: {
      "Content-Type": "audio/pcm",
      "X-Audio-Sample-Rate": "22050",
      "X-Audio-Channels": "1",
      "X-Audio-Encoding": "pcm_s16le",
      "Cache-Control": "no-store",
    },
  });
}

export const POST = withRateLimit(RATE_LIMITS.tts_stream, handler);
