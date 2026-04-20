import { NextRequest, NextResponse } from "next/server";
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
 * Security: Tavus webhooks aren't cryptographically signed by default. We
 * verify by conversation_id → session lookup; an attacker would need to guess
 * a valid conversation_id to inject events. For stronger guarantees in the
 * future, we could enable a shared-secret header check.
 *
 * Uses the service-role Supabase client (not user-scoped) because webhooks
 * don't carry user auth — the conversation_id → session.user_id mapping
 * is the authorization proof.
 */

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
  };
}

export async function POST(req: NextRequest) {
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

    case "application.recording_ready":
    case "application.perception_analysis":
      // Not wired up in Phase G.1
      break;

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
  const sessionStartMs = session.started_at ? new Date(session.started_at).getTime() : Date.now();
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
      const jsonPayload = JSON.stringify(
        {
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
        },
        null,
        2,
      );
      const url = await uploadTranscript(session.id, jsonPayload);
      await supabase.from("sessions").update({ transcript_url: url }).eq("id", session.id);
      void sessionStartMs; // silence lint
    } catch (err) {
      console.error("[tavus.webhook] R2 upload failed:", err);
    }
  }

  console.log(`[tavus.webhook] persisted ${turns.length} turns for session ${session.id}`);
}
