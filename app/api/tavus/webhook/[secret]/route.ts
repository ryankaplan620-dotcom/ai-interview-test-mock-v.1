import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual as cryptoTimingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/db/service";
import { shouldMockR2, uploadTranscript } from "@/lib/pipeline/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Tavus webhook endpoint.
 *
 * Tavus posts event callbacks to the URL we set as `callback_url` on
 * conversation creation. We handle:
 *
 *   - system.shutdown: conversation ended (timeout, user left, explicit end).
 *     Mark the session completed/abandoned based on shutdown_reason.
 *
 *   - application.transcription_ready: full chat transcript is ready. Persist
 *     turns to transcript_turns, upload JSON to R2, trigger feedback generation.
 *
 *   - application.recording_ready: if recording is enabled (not in MVP), points
 *     to S3 key of the recording. We don't use this yet.
 *
 *   - system.replica_joined: informational, no action.
 *
 * Security model (2-layer):
 *   1. URL-path shared secret. This endpoint is mounted at
 *      /api/tavus/webhook/[secret]. Tavus-side we pass the secret as the last
 *      path segment of callback_url. Callers without the secret get a 404.
 *      Tavus does not currently support custom webhook headers (verified
 *      against their docs), so embedding the secret in the URL is the
 *      standard workaround. The URL is TLS-encrypted end-to-end.
 *   2. conversation_id → session lookup. Even with a valid secret, the
 *      event must reference a conversation_id we know about. If it doesn't,
 *      we ack-silently (no session mutation) so the webhook doesn't become
 *      a side-channel for probing our DB.
 *
 * Uses the service-role Supabase client (not user-scoped) because webhooks
 * don't carry user auth — the conversation_id → session.user_id mapping
 * is the authorization proof.
 */

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return cryptoTimingSafeEqual(aBuf, bBuf);
}

interface TavusWebhookPayload {
  event_type: string;
  message_type: "system" | "application";
  conversation_id: string;
  webhook_url?: string;
  timestamp: string;
  properties: {
    replica_id?: string;
    shutdown_reason?: string;
    transcript?: Array<{ role: string; content: string }>;
    s3_key?: string;
    recording_url?: string;
    // Perception analysis fields
    perception_analysis?: {
      // Existing
      emotional_states?: Array<{ emotion: string; intensity: number; timestamp_seconds?: number }>;
      tone_shifts?: Array<{ from: string; to: string; at_seconds: number }>;
      key_discussion_points?: Array<{ topic: string; sentiment: string; details?: string }>;
      overall_sentiment?: string;
      confidence_level?: number;
      engagement_score?: number;
      // New detailed fields
      user_appearance?: unknown;
      user_behavior?: unknown;
      gestures?: unknown;
      screen_activities?: unknown;
      network_diagnostics?: unknown;
      perception_summary?: string;
      appearance_description?: string;
      behavior_description?: string;
      gesture_observations?: string[];
      emotional_summary?: string;
      notable_moments?: unknown;
    };
  };
}

export async function POST(req: NextRequest, { params }: { params: { secret: string } }) {
  // Secret-in-URL verification. Tavus does not support custom webhook headers,
  // so we embed a shared secret in the callback URL path — known only to us
  // (stored in env) and Tavus (stored in their conversation record on our
  // behalf). Anyone without the secret is ignored with a 404-like response.
  //
  // Rotation: changing TAVUS_WEBHOOK_SECRET only affects newly-created
  // conversations. Active conversations continue to post to the old URL until
  // they shut down — this is fine since conversations are short-lived.
  const expectedSecret = process.env.TAVUS_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("[tavus.webhook] TAVUS_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // Constant-time comparison to prevent timing attacks, even though URL-embedded
  // secrets are observable over TLS-terminated proxies. Belt and braces.
  if (!timingSafeEqual(params.secret, expectedSecret)) {
    // Return 404-shaped response so scanners get no signal this is a webhook
    // endpoint. Don't log full secret candidate — only a length hint.
    console.warn(
      `[tavus.webhook] bad secret (len=${params.secret.length})`,
    );
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let payload: TavusWebhookPayload;
  try {
    payload = (await req.json()) as TavusWebhookPayload;
  } catch {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  if (!payload.conversation_id || !payload.event_type) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  console.log(
    `[tavus.webhook] ${payload.event_type} for conversation ${payload.conversation_id}`,
  );

  const supabase = createServiceClient();

  // Look up the Folio session this conversation belongs to
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select(
      "id, user_id, persona, interview_type, mode, target_firm, target_role, duration_seconds, started_at, status",
    )
    .eq("tavus_conversation_id", payload.conversation_id)
    .single();

  if (!sessionRaw) {
    // Not our conversation — ack silently so Tavus stops retrying
    console.warn(`[tavus.webhook] no session for conversation ${payload.conversation_id}`);
    return NextResponse.json({ ok: true });
  }

  const session = sessionRaw as {
    id: string;
    user_id: string;
    persona: string;
    interview_type: string;
    mode: string;
    target_firm: string | null;
    target_role: string | null;
    duration_seconds: number;
    started_at: string | null;
    status: string;
  };

  // Dispatch by event type
  switch (payload.event_type) {
    case "system.replica_joined":
      // Informational. Could log to session_events table if desired.
      break;

    case "system.shutdown": {
      await handleShutdown(supabase, session, payload);
      break;
    }

    case "application.transcription_ready": {
      await handleTranscription(supabase, session, payload);
      break;
    }

    case "application.recording_ready": {
      await handleRecordingReady(supabase, session, payload);
      break;
    }

    case "application.perception_analysis": {
      await handlePerceptionAnalysis(supabase, session, payload);
      break;
    }

    default:
      console.log(`[tavus.webhook] unhandled event: ${payload.event_type}`);
  }

  return NextResponse.json({ ok: true });
}

// --------------------------------------------------------------------------

async function handleShutdown(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  session: { id: string; status: string; started_at: string | null },
  payload: TavusWebhookPayload,
): Promise<void> {
  if (["completed", "abandoned", "failed"].includes(session.status)) {
    return; // Already finalized — idempotent
  }

  const reason = payload.properties.shutdown_reason ?? "";

  // Distinguish "user completed their interview" vs "user left early" vs "error"
  let finalStatus: "completed" | "abandoned" | "failed";
  if (reason.includes("max_call_duration")) {
    finalStatus = "completed"; // Hit the time limit cleanly
  } else if (reason.includes("participant_left_timeout") || reason.includes("absent")) {
    finalStatus = "abandoned";
  } else if (reason.includes("end_conversation") || reason === "") {
    // Explicit end from our side or a clean close — treat as completed if the
    // conversation ran for >60s, else abandoned
    const elapsed = session.started_at
      ? (Date.now() - new Date(session.started_at).getTime()) / 1000
      : 0;
    finalStatus = elapsed > 60 ? "completed" : "abandoned";
  } else if (reason.includes("error") || reason.includes("internal")) {
    finalStatus = "failed";
  } else {
    finalStatus = "completed"; // Default to completed for unknown clean shutdowns
  }

  const actualDuration = session.started_at
    ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
    : null;

  await supabase
    .from("sessions")
    .update({
      status: finalStatus,
      ended_at: new Date().toISOString(),
      actual_duration_seconds: actualDuration,
    })
    .eq("id", session.id);

  console.log(`[tavus.webhook] session ${session.id} → ${finalStatus} (${reason})`);
}

// --------------------------------------------------------------------------

async function handleTranscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  session: {
    id: string;
    persona: string;
    interview_type: string;
    mode: string;
    target_firm: string | null;
    target_role: string | null;
    duration_seconds: number;
    started_at: string | null;
  },
  payload: TavusWebhookPayload,
): Promise<void> {
  const transcript = payload.properties.transcript ?? [];
  if (transcript.length === 0) return;

  // Tavus transcript includes the system prompt as the first entry — skip it
  const turns = transcript.filter((t) => t.role === "user" || t.role === "assistant");

  if (turns.length === 0) return;

  // Insert into transcript_turns.
  // Tavus doesn't provide per-turn timestamps, so we synthesize approximate
  // ones by distributing turns evenly across the session duration. Good enough
  // for feedback generation; exact timing isn't used for scoring.
  const approxGapMs = 15_000; // 15s avg per turn

  const rows = turns.map((t, i) => ({
    session_id: session.id,
    speaker: t.role === "assistant" ? "interviewer" : "user",
    text: t.content,
    started_at_seconds: (i * approxGapMs) / 1000,
    ended_at_seconds: ((i + 1) * approxGapMs) / 1000,
  }));

  const { error: turnsErr } = await supabase.from("transcript_turns").insert(rows);
  if (turnsErr) {
    console.error("[tavus.webhook] transcript_turns insert failed:", turnsErr);
    // Don't return — try R2 upload anyway
  }

  // Upload full transcript JSON to R2 (if configured)
  if (!shouldMockR2()) {
    try {
      const transcriptPayload = {
        version: "1",
        sessionId: session.id,
        persona: session.persona,
        interviewType: session.interview_type,
        mode: session.mode,
        targetFirm: session.target_firm,
        targetRole: session.target_role,
        durationSeconds: session.duration_seconds,
        startedAt: session.started_at,
        endedAt: new Date().toISOString(),
        source: "tavus",
        turns: turns.map((t, i) => ({
          role: t.role as "user" | "assistant",
          content: t.content,
          startedAtMs: i * approxGapMs,
          endedAtMs: (i + 1) * approxGapMs,
        })),
      };
      // uploadTranscript stringifies internally — pass the object, not a string,
      // or the stored artifact ends up double-encoded (a JSON string of JSON).
      const url = await uploadTranscript(session.id, transcriptPayload);
      await supabase.from("sessions").update({ transcript_url: url }).eq("id", session.id);
    } catch (err) {
      console.error("[tavus.webhook] R2 upload failed:", err);
    }
  }

  console.log(`[tavus.webhook] persisted ${turns.length} turns for session ${session.id}`);
}

// --------------------------------------------------------------------------

async function handlePerceptionAnalysis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  session: { id: string },
  payload: TavusWebhookPayload,
): Promise<void> {
  const perception = payload.properties.perception_analysis;
  if (!perception) return;

  const { error: perceptionErr } = await supabase.from("session_analytics").upsert(
    {
      session_id: session.id,
      emotional_states: perception.emotional_states ?? null,
      tone_shifts: perception.tone_shifts ?? null,
      key_discussion_points: perception.key_discussion_points ?? null,
      overall_sentiment: perception.overall_sentiment ?? null,
      confidence_level: perception.confidence_level ?? null,
      engagement_score: perception.engagement_score ?? null,
      user_appearance: perception.user_appearance ?? null,
      user_behavior: perception.user_behavior ?? null,
      gestures: perception.gestures ?? null,
      screen_activities: perception.screen_activities ?? null,
      network_diagnostics: perception.network_diagnostics ?? null,
      perception_summary: perception.perception_summary ?? null,
      appearance_description: perception.appearance_description ?? null,
      behavior_description: perception.behavior_description ?? null,
      gesture_observations: perception.gesture_observations ?? null,
      emotional_summary: perception.emotional_summary ?? null,
      notable_moments: perception.notable_moments ?? null,
      raw_perception_payload: perception,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
  if (perceptionErr) {
    console.error("[tavus.webhook] perception analytics upsert failed:", perceptionErr);
    return;
  }

  console.log(`[tavus.webhook] persisted perception analytics for session ${session.id}`);
}

// --------------------------------------------------------------------------

async function handleRecordingReady(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  session: { id: string },
  payload: TavusWebhookPayload,
): Promise<void> {
  const s3Key = payload.properties.s3_key;
  const recordingUrl = payload.properties.recording_url;
  if (!s3Key && !recordingUrl) return;

  const { error: recordingErr } = await supabase.from("session_analytics").upsert(
    {
      session_id: session.id,
      recording_url: recordingUrl ?? null,
      recording_s3_key: s3Key ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
  if (recordingErr) {
    console.error("[tavus.webhook] recording upsert failed:", recordingErr);
  }

  // Also update the sessions table recording_url for backward compat
  if (recordingUrl) {
    await supabase
      .from("sessions")
      .update({ recording_url: recordingUrl })
      .eq("id", session.id);
  }

  console.log(`[tavus.webhook] persisted recording for session ${session.id}`);
}
