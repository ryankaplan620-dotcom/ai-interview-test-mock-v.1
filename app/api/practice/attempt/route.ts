import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { shouldMock } from "@/lib/pipeline/env";
import { env } from "@/lib/pipeline/env";
import { generateDrillFeedback } from "@/lib/practice/feedback";
import { DRILL_TYPES } from "@/lib/practice/drills";
import type { DrillType } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Deepgram pre-recorded returns in 5-10s for a 2-min clip; Claude analysis
// adds another 5-15s. 60s headroom.
export const maxDuration = 60;

/**
 * Record-a-drill-attempt endpoint.
 *
 * Request: multipart/form-data with
 *   - audio: File (webm/opus or similar)
 *   - drill_id: string (UUID)
 *   - attempt_number: string (1-indexed)
 *   - duration_seconds: string
 *
 * Flow:
 *   1. Verify auth + drill ownership + drill status = in_progress
 *   2. Load prior attempts; reject if attempt_number isn't the next one
 *      in sequence (server-derived, not trusted from the client)
 *   3. Send audio to Deepgram pre-recorded API → transcript
 *   4. Call Claude (via generateDrillFeedback) for analysis
 *   5. Insert drill_attempts row
 *   6. If this is the final attempt (attempt_number === target_attempts),
 *      mark drill as completed
 *   7. Return the full feedback payload to the client
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_multipart" }, { status: 400 });
  }

  const drillId = form.get("drill_id");
  const attemptRaw = form.get("attempt_number");
  const durationRaw = form.get("duration_seconds");
  const audio = form.get("audio");

  if (
    typeof drillId !== "string" ||
    typeof attemptRaw !== "string" ||
    typeof durationRaw !== "string"
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  }

  const attemptNumber = Number.parseInt(attemptRaw, 10);
  const durationSeconds = Number.parseFloat(durationRaw);
  if (!Number.isFinite(attemptNumber) || attemptNumber < 1 || attemptNumber > 20) {
    return NextResponse.json({ error: "bad_attempt_number" }, { status: 400 });
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < 2 || durationSeconds > 600) {
    return NextResponse.json({ error: "bad_duration" }, { status: 400 });
  }

  // --------------------------------------------------------------------
  // 1. Verify drill
  // --------------------------------------------------------------------
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: drillRaw } = await (supabase.from("drills") as any)
    .select("id, user_id, drill_type, prompt_id, prompt_text, config, status")
    .eq("id", drillId)
    .single();

  const drill = drillRaw as
    | {
        id: string;
        user_id: string;
        drill_type: DrillType;
        prompt_id: string;
        prompt_text: string;
        config: Record<string, unknown>;
        status: string;
      }
    | null;

  if (!drill || drill.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (drill.status !== "in_progress") {
    return NextResponse.json({ error: "drill_not_active", status: drill.status }, { status: 409 });
  }

  const drillConfig = DRILL_TYPES[drill.drill_type];
  if (!drillConfig) {
    return NextResponse.json({ error: "unknown_drill_type" }, { status: 400 });
  }
  if (attemptNumber > drillConfig.targetAttempts) {
    return NextResponse.json(
      { error: "too_many_attempts", max: drillConfig.targetAttempts },
      { status: 400 },
    );
  }

  // --------------------------------------------------------------------
  // 2. Load prior attempts (for progression-aware feedback) and verify
  //    attempt_number is actually the next one in sequence. The client
  //    sends attempt_number, but it's untrusted: a stale/crafted request
  //    claiming the final attempt number on the first real submission
  //    would mark the drill "completed" after one attempt and 409 every
  //    legitimate attempt after it. Checked here, before the expensive
  //    transcription/analysis calls, so a bad request fails cheaply.
  // --------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: priorRaw } = await (supabase.from("drill_attempts") as any)
    .select("attempt_number, transcript, overall_score, summary")
    .eq("drill_id", drill.id)
    .order("attempt_number", { ascending: true });

  const priorAttempts = (priorRaw as Array<{
    attempt_number: number;
    transcript: string;
    overall_score: number | null;
    summary: string | null;
  }> | null) ?? [];

  const expectedAttemptNumber = priorAttempts.length + 1;
  if (attemptNumber !== expectedAttemptNumber) {
    return NextResponse.json(
      { error: "out_of_sequence_attempt", expected: expectedAttemptNumber },
      { status: 409 },
    );
  }

  // --------------------------------------------------------------------
  // 3. Transcribe via Deepgram pre-recorded API
  // --------------------------------------------------------------------
  let transcript: string;
  try {
    transcript = await transcribeAudio(audio);
  } catch (err) {
    console.error("[practice.attempt] transcription failed:", err);
    return NextResponse.json({ error: "transcription_failed" }, { status: 502 });
  }

  if (transcript.trim().length < 5) {
    return NextResponse.json({ error: "transcript_too_short" }, { status: 400 });
  }

  // --------------------------------------------------------------------
  // 4. Generate feedback
  // --------------------------------------------------------------------
  let feedback;
  try {
    feedback = await generateDrillFeedback({
      drillType: drill.drill_type,
      promptId: drill.prompt_id,
      promptText: drill.prompt_text,
      transcript,
      durationSeconds,
      attemptNumber,
      priorAttempts,
    });
  } catch (err) {
    console.error("[practice.attempt] feedback generation failed:", err);
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }

  // --------------------------------------------------------------------
  // 5. Persist drill_attempts row
  //    Unique (drill_id, attempt_number) prevents double-submits
  // --------------------------------------------------------------------
  const insertPayload = {
    drill_id: drill.id,
    attempt_number: attemptNumber,
    transcript,
    duration_seconds: durationSeconds,
    overall_score: feedback.overall_score,
    sub_scores: feedback.sub_scores,
    summary: feedback.summary,
    strengths: feedback.strengths,
    improvements: feedback.improvements,
    filler_words: feedback.filler_words,
    filler_count: feedback.filler_count,
    words_per_minute: feedback.words_per_minute,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertErr } = await (supabase.from("drill_attempts") as any)
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertErr) {
    // Most likely duplicate attempt_number — fetch the winner and return it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from("drill_attempts") as any)
      .select("*")
      .eq("drill_id", drill.id)
      .eq("attempt_number", attemptNumber)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ attempt: existing, cached: true });
    }
    console.error("[practice.attempt] insert failed:", insertErr);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // --------------------------------------------------------------------
  // 6. Mark drill completed if this was the last attempt
  // --------------------------------------------------------------------
  if (attemptNumber >= drillConfig.targetAttempts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("drills") as any)
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", drill.id);
  }

  return NextResponse.json({ attempt: inserted, cached: false });
}

// --------------------------------------------------------------------------
// Deepgram pre-recorded transcription
// --------------------------------------------------------------------------

async function transcribeAudio(audio: Blob): Promise<string> {
  if (shouldMock("deepgram")) {
    // Return a canned transcript for dev without the key
    return mockTranscript();
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("deepgram_not_configured");
  }

  const params = new URLSearchParams({
    model: env.deepgramModel(),
    smart_format: "true",
    punctuate: "true",
    language: "en",
  });

  const body = await audio.arrayBuffer();
  const contentType = audio.type || "audio/webm";

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": contentType,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`deepgram_${res.status}_${text.slice(0, 100)}`);
  }

  const data = (await res.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{ transcript?: string }>;
      }>;
    };
  };

  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  return transcript.trim();
}

function mockTranscript(): string {
  // Realistic-enough transcript that the feedback mock has something to work with.
  return "So, um, I think the hardest team situation I led was at my internship last summer. We were working on a client deliverable and about two weeks out from the deadline, we realized our original approach wasn't going to work. I called a meeting, laid out what I was seeing, and told the team we needed to pivot. Some people pushed back because we'd already put a lot of work in. I heard them out, but then made the call that we were going to switch approaches. We ended up delivering on time and the client was actually really happy with the final product. I learned that, you know, as a leader sometimes you have to make decisions that aren't popular in the moment.";
}
