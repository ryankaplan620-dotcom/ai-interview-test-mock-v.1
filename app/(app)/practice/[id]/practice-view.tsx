"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DrillType, DrillStatus } from "@/types/supabase";
import { abandonDrill } from "../actions";

// ==========================================================================
// Props
// ==========================================================================

export interface PracticeViewDrill {
  id: string;
  drillType: DrillType;
  promptId: string;
  promptText: string;
  status: DrillStatus;
  targetAttempts: number;
  maxAttemptSeconds: number;
  whatItsLookingFor: string | null;
  /** For pushback drills: the follow-up challenge to deliver after the initial answer. */
  pushback: string | null;
}

export interface PracticeViewAttempt {
  id: string;
  attempt_number: number;
  transcript: string;
  duration_seconds: number;
  overall_score: number | null;
  sub_scores: Record<string, number>;
  summary: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  filler_words: Record<string, number> | null;
  filler_count: number | null;
  words_per_minute: number | null;
  created_at: string;
}

interface Props {
  drill: PracticeViewDrill;
  attempts: PracticeViewAttempt[];
  mockMode: boolean;
}

type Phase =
  | "intro" // Pre-first-attempt: shows "what it's looking for"
  | "ready" // Between attempts, not yet recording
  | "recording" // Mic is active, recording
  | "uploading" // Audio sent to server, waiting for feedback
  | "reviewing" // Showing the latest attempt's feedback
  | "complete"; // All attempts done, showing progression

// ==========================================================================
// Main component
// ==========================================================================

export function PracticeView({ drill, attempts: initialAttempts, mockMode }: Props) {
  const router = useRouter();
  const [attempts, setAttempts] = useState<PracticeViewAttempt[]>(initialAttempts);
  const [phase, setPhase] = useState<Phase>(() => {
    if (drill.status !== "in_progress") return "complete";
    if (initialAttempts.length === 0) return "intro";
    if (initialAttempts.length >= drill.targetAttempts) return "complete";
    return "reviewing"; // Just came back into the drill mid-flow
  });
  const [micState, setMicState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const nextAttemptNumber = attempts.length + 1;
  const isLastAttempt = nextAttemptNumber === drill.targetAttempts;

  // --- Cleanup on unmount ----------------------------------------------
  useEffect(() => {
    return () => {
      stopRecording(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Mic permission --------------------------------------------------
  const requestMic = async () => {
    setMicState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      setMicState("granted");
    } catch {
      setMicState("denied");
    }
  };

  // --- Recording control ----------------------------------------------
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    // Pick a mime type the browser supports
    const mime = pickMimeType();
    const recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    recorder.start(250); // 250ms timeslice
    recordingStartRef.current = Date.now();
    setElapsedSeconds(0);
    setPhase("recording");
    setUploadError(null);

    // Tick elapsed timer
    timerRef.current = window.setInterval(() => {
      const e = (Date.now() - recordingStartRef.current) / 1000;
      setElapsedSeconds(e);
      // Auto-stop at max duration
      if (e >= drill.maxAttemptSeconds) {
        stopRecording(true);
      }
    }, 100);
  }, [drill.maxAttemptSeconds]);

  const stopRecording = useCallback(
    (upload: boolean) => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const recorder = recorderRef.current;
      if (!recorder) return;
      if (recorder.state === "inactive") return;

      // Wait for last chunk before assembling
      return new Promise<void>((resolve) => {
        recorder.onstop = async () => {
          const duration = (Date.now() - recordingStartRef.current) / 1000;
          if (!upload || duration < 2) {
            setPhase((p) => (p === "recording" ? "ready" : p));
            resolve();
            return;
          }

          // Assemble blob and upload
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          chunksRef.current = [];
          await uploadAttempt(blob, duration);
          resolve();
        };
        recorder.stop();
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const uploadAttempt = async (audio: Blob, duration: number) => {
    setPhase("uploading");
    try {
      const form = new FormData();
      form.append("drill_id", drill.id);
      form.append("attempt_number", String(nextAttemptNumber));
      form.append("duration_seconds", String(duration));
      form.append("audio", audio, `attempt-${nextAttemptNumber}.webm`);

      const res = await fetch("/api/practice/attempt", { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as
        | { attempt?: PracticeViewAttempt; error?: string }
        | null;

      if (!res.ok || !body?.attempt) {
        setUploadError(describeApiError(body?.error ?? `http_${res.status}`));
        setPhase("ready");
        return;
      }

      const newAttempt = body.attempt;
      setAttempts((prev) => {
        // Replace if same attempt_number (race/cached), otherwise append
        const existing = prev.findIndex((a) => a.attempt_number === newAttempt.attempt_number);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = newAttempt;
          return copy;
        }
        return [...prev, newAttempt];
      });

      if (newAttempt.attempt_number >= drill.targetAttempts) {
        setPhase("complete");
      } else {
        setPhase("reviewing");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Try again.");
      setPhase("ready");
    }
  };

  const handleAbandon = async () => {
    await abandonDrill(drill.id);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.push("/practice");
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  const latestAttempt = attempts[attempts.length - 1] ?? null;

  return (
    <div className="mx-auto max-w-[880px] px-6 py-10 sm:px-10 sm:py-14">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/practice"
          className="font-sans text-[12px] text-text-tertiary transition-colors hover:text-text-secondary"
        >
          ← Practice
        </Link>
        {phase !== "complete" && drill.status === "in_progress" && attempts.length > 0 && (
          <button
            onClick={handleAbandon}
            className="font-mono text-[10px] tracking-label text-text-tertiary transition-colors hover:text-rose-300/80"
          >
            END DRILL
          </button>
        )}
      </div>

      {/* Mock mode banner */}
      {mockMode && (
        <div className="mb-6 rounded-lg border border-amber-300/30 bg-amber-300/5 px-4 py-2.5">
          <p className="font-mono text-[10px] tracking-label text-amber-300/90">
            MOCK MODE — no real transcription or Claude analysis. Configure API keys for live drills.
          </p>
        </div>
      )}

      {/* Header */}
      <header>
        <p className="font-mono text-[11px] tracking-label text-accent">
          {drillTypeLabel(drill.drillType)}
          {drill.targetAttempts > 1
            ? ` · ATTEMPT ${Math.min(nextAttemptNumber, drill.targetAttempts)} / ${drill.targetAttempts}`
            : ""}
        </p>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-[1.2] text-text-primary sm:text-[32px]">
          {drill.promptText}
        </h1>
        {drill.pushback && (
          <div className="mt-5 rounded-lg border border-amber-300/30 bg-amber-300/5 px-4 py-3">
            <p className="font-mono text-[10px] tracking-label text-amber-300/80">
              THEN THE INTERVIEWER PUSHES BACK
            </p>
            <p className="mt-1.5 font-serif text-[15px] italic leading-[1.5] text-text-primary">
              &ldquo;{drill.pushback}&rdquo;
            </p>
          </div>
        )}
      </header>

      {/* Progress pips */}
      <div className="mt-6 flex gap-2">
        {Array.from({ length: drill.targetAttempts }).map((_, i) => {
          const attempt = attempts[i];
          const isActive = i === nextAttemptNumber - 1 && phase !== "complete";
          return (
            <div
              key={i}
              className={[
                "h-1.5 flex-1 rounded-full transition-colors",
                attempt
                  ? scoreColorBg(attempt.overall_score ?? 0)
                  : isActive
                    ? "bg-accent/40"
                    : "bg-ink-border/40",
              ].join(" ")}
            />
          );
        })}
      </div>

      {/* Phase-specific content */}
      <div className="mt-10">
        {phase === "intro" && (
          <IntroPhase
            drill={drill}
            micState={micState}
            onRequestMic={requestMic}
            onStart={startRecording}
          />
        )}
        {phase === "ready" && (
          <ReadyPhase
            drill={drill}
            nextAttemptNumber={nextAttemptNumber}
            isLastAttempt={isLastAttempt}
            onStart={startRecording}
            uploadError={uploadError}
          />
        )}
        {phase === "recording" && (
          <RecordingPhase
            elapsedSeconds={elapsedSeconds}
            maxSeconds={drill.maxAttemptSeconds}
            onStop={() => stopRecording(true)}
          />
        )}
        {phase === "uploading" && <UploadingPhase />}
        {phase === "reviewing" && latestAttempt && (
          <AttemptFeedback
            attempt={latestAttempt}
            onNextAttempt={() => setPhase("ready")}
            isLastAttempt={false}
          />
        )}
        {phase === "complete" && (
          <CompletionPhase drill={drill} attempts={attempts} onNewDrill={() => router.push("/practice")} />
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// Phase components
// ==========================================================================

function IntroPhase({
  drill,
  micState,
  onRequestMic,
  onStart,
}: {
  drill: PracticeViewDrill;
  micState: "idle" | "requesting" | "granted" | "denied";
  onRequestMic: () => void;
  onStart: () => void;
}) {
  return (
    <div>
      {drill.whatItsLookingFor && (
        <div className="rounded-2xl border border-ink-border bg-ink-surface px-6 py-5">
          <p className="font-mono text-[10px] tracking-label text-accent/80">WHAT TO AIM FOR</p>
          <p className="mt-2 font-serif text-[16px] italic leading-[1.55] text-text-primary">
            {drill.whatItsLookingFor}
          </p>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-accent/20 bg-gradient-to-br from-ink-surface to-ink-raised px-6 py-8">
        <p className="font-mono text-[10px] tracking-label text-accent">READY?</p>
        <p className="mt-2 font-display text-[20px] font-semibold text-text-primary">
          {introHeadline(drill)}
        </p>
        <p className="mt-2 font-sans text-[14px] leading-[1.6] text-text-secondary">
          {introBody(drill)}
        </p>

        <div className="mt-6">
          {micState === "idle" && (
            <button
              onClick={onRequestMic}
              className="rounded-full bg-accent px-6 py-3 font-sans text-[14px] font-semibold text-ink transition-all hover:bg-accent-light"
            >
              Allow microphone →
            </button>
          )}
          {micState === "requesting" && (
            <p className="font-sans text-[13px] text-text-secondary">Waiting for permission...</p>
          )}
          {micState === "granted" && (
            <button
              onClick={onStart}
              className="rounded-full bg-accent px-6 py-3 font-sans text-[14px] font-semibold text-ink transition-all hover:bg-accent-light"
            >
              Start attempt 1 →
            </button>
          )}
          {micState === "denied" && (
            <p className="font-sans text-[13px] text-rose-300/90">
              We need mic access to record your answer. Check browser settings and reload.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReadyPhase({
  drill,
  nextAttemptNumber,
  isLastAttempt,
  onStart,
  uploadError,
}: {
  drill: PracticeViewDrill;
  nextAttemptNumber: number;
  isLastAttempt: boolean;
  onStart: () => void;
  uploadError: string | null;
}) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-ink-surface to-ink-raised px-6 py-8 text-center">
      <p className="font-mono text-[10px] tracking-label text-accent">
        {isLastAttempt ? "LAST REP" : "NEXT REP"}
      </p>
      <p className="mt-3 font-display text-[22px] font-semibold text-text-primary">
        Attempt {nextAttemptNumber} of {drill.targetAttempts}
      </p>
      <p className="mt-2 font-sans text-[13px] text-text-secondary">
        {isLastAttempt
          ? "This is the one that should feel automatic."
          : "Apply the feedback. Go again."}
      </p>

      {uploadError && (
        <p className="mt-4 font-sans text-[13px] text-rose-300/90">{uploadError}</p>
      )}

      <button
        onClick={onStart}
        className="mt-6 rounded-full bg-accent px-6 py-3 font-sans text-[14px] font-semibold text-ink transition-all hover:bg-accent-light"
      >
        Start recording →
      </button>
    </div>
  );
}

function RecordingPhase({
  elapsedSeconds,
  maxSeconds,
  onStop,
}: {
  elapsedSeconds: number;
  maxSeconds: number;
  onStop: () => void;
}) {
  const remaining = Math.max(0, maxSeconds - elapsedSeconds);
  const approaching = remaining < 15;

  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/5 px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center">
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-accent/30" />
        <div className="relative h-4 w-4 rounded-full bg-accent" />
      </div>
      <p className="mt-6 font-mono text-[11px] tracking-label text-accent">RECORDING</p>
      <p className="mt-2 font-display text-[42px] font-semibold tabular-nums text-text-primary">
        {formatTime(elapsedSeconds)}
      </p>
      <p
        className={[
          "mt-1 font-mono text-[11px] tracking-label tabular-nums",
          approaching ? "text-amber-300/90" : "text-text-tertiary",
        ].join(" ")}
      >
        {formatTime(remaining)} REMAINING
      </p>

      <button
        onClick={onStop}
        className="mt-8 rounded-full border border-ink-border bg-ink-surface px-6 py-3 font-sans text-[14px] font-semibold text-text-primary transition-all hover:border-accent"
      >
        ■ Stop recording
      </button>
    </div>
  );
}

function UploadingPhase() {
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-surface px-6 py-12 text-center">
      <div className="mx-auto h-10 w-10">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink-border border-t-accent" />
      </div>
      <p className="mt-6 font-mono text-[11px] tracking-label text-accent">ANALYZING</p>
      <p className="mt-2 font-display text-[18px] font-semibold text-text-primary">
        Listening back and taking notes.
      </p>
      <p className="mt-1 font-sans text-[12px] text-text-tertiary">Usually 10–20 seconds.</p>
    </div>
  );
}

function AttemptFeedback({
  attempt,
  onNextAttempt,
  isLastAttempt,
}: {
  attempt: PracticeViewAttempt;
  onNextAttempt: () => void;
  isLastAttempt: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Score hero */}
      <div className="rounded-2xl border border-ink-border bg-ink-surface px-6 py-6">
        <div className="flex items-baseline gap-3">
          <p
            className={[
              "font-display text-[56px] font-semibold leading-none tabular-nums",
              scoreColorClass(attempt.overall_score ?? 0),
            ].join(" ")}
          >
            {attempt.overall_score ?? "—"}
          </p>
          <p className="font-mono text-[11px] tracking-label text-text-tertiary">/100</p>
        </div>
        <p className="mt-4 font-serif text-[16px] italic leading-[1.55] text-text-primary">
          {attempt.summary}
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid gap-3 sm:grid-cols-4">
        {Object.entries(attempt.sub_scores).map(([key, value]) => (
          <MetricCard key={key} label={key} value={value} suffix="/100" />
        ))}
      </div>

      {/* Filler + pace */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-border/60 bg-ink-raised/40 px-4 py-3">
          <p className="font-mono text-[10px] tracking-label text-text-tertiary">FILLER WORDS</p>
          <p className="mt-1 font-display text-[22px] font-semibold tabular-nums text-text-primary">
            {attempt.filler_count ?? 0}
          </p>
          {attempt.filler_words && Object.keys(attempt.filler_words).length > 0 && (
            <p className="mt-1 font-sans text-[11px] text-text-tertiary">
              {Object.entries(attempt.filler_words)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([w, n]) => `${w.replace(/_/g, " ")} (${n})`)
                .join(" · ")}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-ink-border/60 bg-ink-raised/40 px-4 py-3">
          <p className="font-mono text-[10px] tracking-label text-text-tertiary">PACE</p>
          <p className="mt-1 font-display text-[22px] font-semibold tabular-nums text-text-primary">
            {Math.round(attempt.words_per_minute ?? 0)}
            <span className="ml-1 font-mono text-[11px] font-normal tracking-label text-text-tertiary">WPM</span>
          </p>
          <p className="mt-1 font-sans text-[11px] text-text-tertiary">
            {paceLabel(attempt.words_per_minute ?? 0)}
          </p>
        </div>
      </div>

      {/* Strengths + improvements */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ListCard label="Strengths" accent="text-accent" items={attempt.strengths ?? []} />
        <ListCard
          label="Work on"
          accent="text-amber-300/90"
          items={attempt.improvements ?? []}
        />
      </div>

      {/* CTA to next attempt */}
      {!isLastAttempt && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onNextAttempt}
            className="rounded-full bg-accent px-6 py-3 font-sans text-[14px] font-semibold text-ink transition-all hover:bg-accent-light"
          >
            Go again →
          </button>
        </div>
      )}
    </div>
  );
}

function CompletionPhase({
  drill,
  attempts,
  onNewDrill,
}: {
  drill: PracticeViewDrill;
  attempts: PracticeViewAttempt[];
  onNewDrill: () => void;
}) {
  const first = attempts[0];
  const last = attempts[attempts.length - 1];
  const delta =
    first?.overall_score !== null && last?.overall_score !== null
      ? (last?.overall_score ?? 0) - (first?.overall_score ?? 0)
      : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-ink-surface to-ink-raised px-6 py-8">
        <p className="font-mono text-[11px] tracking-label text-accent">DRILL COMPLETE</p>
        <h2 className="mt-2 font-display text-[28px] font-semibold leading-tight text-text-primary">
          {delta > 15 ? "Big jump. Nice work." : delta > 5 ? "Clear improvement." : "You pushed through all five."}
        </h2>
        <p className="mt-3 font-serif text-[16px] italic leading-[1.55] text-text-secondary">
          {last?.summary ?? "Review your attempts below and run it again whenever."}
        </p>

        {delta > 0 && first && last && (
          <div className="mt-6 flex items-center gap-4">
            <span
              className={[
                "font-display text-[20px] font-semibold tabular-nums",
                scoreColorClass(first.overall_score ?? 0),
              ].join(" ")}
            >
              {first.overall_score ?? "—"}
            </span>
            <span className="font-mono text-[11px] tracking-label text-text-tertiary">ATTEMPT 1 →</span>
            <span
              className={[
                "font-display text-[28px] font-semibold tabular-nums",
                scoreColorClass(last.overall_score ?? 0),
              ].join(" ")}
            >
              {last.overall_score ?? "—"}
            </span>
            <span className="font-mono text-[11px] tracking-label text-accent">
              ATTEMPT {attempts.length} · +{delta}
            </span>
          </div>
        )}
      </div>

      {/* Attempt-by-attempt progression */}
      <div>
        <p className="font-mono text-[10px] tracking-label text-text-tertiary">PROGRESSION</p>
        <div className="mt-4 flex flex-col gap-3">
          {attempts.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-4 rounded-xl border border-ink-border bg-ink-surface px-5 py-4"
            >
              <div className="flex-shrink-0">
                <p className="font-mono text-[10px] tracking-label text-text-tertiary">ATTEMPT</p>
                <p className="font-display text-[20px] font-semibold text-text-primary">
                  {a.attempt_number}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[13px] leading-[1.5] text-text-primary line-clamp-2">
                  {a.summary ?? "—"}
                </p>
                <p className="mt-1 font-mono text-[10px] tracking-label text-text-tertiary">
                  {Math.round(a.duration_seconds)}s · {a.filler_count ?? 0} FILLERS · {Math.round(a.words_per_minute ?? 0)} WPM
                </p>
              </div>
              <div className="flex-shrink-0">
                <p
                  className={[
                    "font-display text-[24px] font-semibold tabular-nums leading-none",
                    scoreColorClass(a.overall_score ?? 0),
                  ].join(" ")}
                >
                  {a.overall_score ?? "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={onNewDrill}
          className="rounded-full bg-accent px-5 py-2.5 font-sans text-[13px] font-semibold text-ink transition-all hover:bg-accent-light"
        >
          Drill another question →
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-ink-border bg-ink-surface px-5 py-2.5 font-sans text-[13px] text-text-primary transition-all hover:border-accent/60"
        >
          Back to dashboard
        </Link>
      </div>

      {/* Session reference */}
      <p className="pt-4 font-mono text-[10px] tracking-label text-text-tertiary">
        DRILL · {drill.id.slice(0, 8).toUpperCase()}
      </p>
    </div>
  );
}

// ==========================================================================
// Small presentational helpers
// ==========================================================================

function MetricCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl border border-ink-border/60 bg-ink-raised/40 px-4 py-3">
      <p className="font-mono text-[10px] tracking-label text-text-tertiary">
        {label.toUpperCase()}
      </p>
      <p
        className={[
          "mt-1 font-display text-[22px] font-semibold leading-none tabular-nums",
          scoreColorClass(value),
        ].join(" ")}
      >
        {value}
        {suffix && <span className="ml-1 font-mono text-[10px] font-normal tracking-label text-text-tertiary">{suffix}</span>}
      </p>
    </div>
  );
}

function ListCard({
  label,
  accent,
  items,
}: {
  label: string;
  accent: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-ink-border bg-ink-surface px-5 py-4">
      <p className={["font-mono text-[10px] tracking-label", accent].join(" ")}>
        {label.toUpperCase()}
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span
              className={["mt-1.5 h-1 w-1 flex-shrink-0 rounded-full", accent].join(" ")}
              style={{ backgroundColor: "currentColor" }}
              aria-hidden
            />
            <p className="font-sans text-[13px] leading-[1.55] text-text-primary">{s}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==========================================================================
// Utility
// ==========================================================================

function drillTypeLabel(t: DrillType): string {
  switch (t) {
    case "pitch_60s":
      return "60-SECOND PITCH";
    case "pushback_drill":
      return "PUSHBACK";
    case "pause_drill":
      return "PAUSE DRILL";
  }
}

function introHeadline(drill: PracticeViewDrill): string {
  if (drill.drillType === "pitch_60s") return "One shot. Sixty seconds.";
  if (drill.drillType === "pushback_drill") return "Answer, then take the hit.";
  if (drill.targetAttempts > 1) return `You'll answer this question ${drill.targetAttempts} times.`;
  return "One attempt.";
}

function introBody(drill: PracticeViewDrill): string {
  const max = `Up to ${Math.floor(drill.maxAttemptSeconds / 60)}:${(drill.maxAttemptSeconds % 60).toString().padStart(2, "0")}.`;
  if (drill.drillType === "pitch_60s") {
    return `Deliver a clean hook, a clear through-line, and a confident landing — all inside the minute. ${max}`;
  }
  if (drill.drillType === "pushback_drill") {
    return `Answer the opening question first. Then deliver your recovery to the pushback line shown above — back-to-back, in one recording. ${max}`;
  }
  return `Between each rep, you'll get specific feedback. ${max}`;
}

function scoreColorClass(v: number): string {
  if (v >= 85) return "text-accent";
  if (v >= 70) return "text-text-primary";
  if (v >= 55) return "text-amber-300/90";
  return "text-rose-300/90";
}

function scoreColorBg(v: number): string {
  if (v >= 85) return "bg-accent";
  if (v >= 70) return "bg-text-primary/50";
  if (v >= 55) return "bg-amber-300/70";
  return "bg-rose-300/70";
}

function paceLabel(wpm: number): string {
  if (wpm === 0) return "—";
  if (wpm < 110) return "Slow — could be intentional or unsure";
  if (wpm <= 160) return "Well-paced for interview speech";
  if (wpm <= 180) return "Fast — still clear";
  return "Too fast — rushing";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  for (const opt of options) {
    if (MediaRecorder.isTypeSupported(opt)) return opt;
  }
  return null;
}

function describeApiError(code: string): string {
  switch (code) {
    case "transcript_too_short":
      return "We couldn't hear much. Try speaking closer to the mic.";
    case "drill_not_active":
      return "This drill has already ended.";
    case "too_many_attempts":
      return "You've completed all attempts for this drill.";
    case "missing_audio":
      return "No audio was recorded. Try again.";
    case "anthropic_not_configured":
    case "deepgram_not_configured":
      return "The analysis service isn't configured. Check your API keys.";
    default:
      return "Something went wrong. Try again.";
  }
}
