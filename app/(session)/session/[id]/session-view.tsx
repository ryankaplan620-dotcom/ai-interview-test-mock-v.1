"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolioMark } from "@/components/FolioMark";
import { endSession, markSessionStarted } from "./actions";
import type { PersonaId, InterviewType, SessionStatus, SessionMode } from "@/types/supabase";

// --------------------------------------------------------------------------
// Prop types (all client-safe — no prompts, no env IDs)
// --------------------------------------------------------------------------

export interface SessionViewPersona {
  id: PersonaId;
  name: string;
  firstName: string;
  firm: string;
  title: string;
}

export interface SessionViewSession {
  id: string;
  persona: PersonaId;
  interview_type: InterviewType;
  mode: SessionMode;
  is_panel: boolean;
  target_firm: string | null;
  target_role: string | null;
  duration_seconds: number;
  status: SessionStatus;
  started_at: string | null;
}

export interface RuntimeFeatureFlagsClient {
  firmCalibration: boolean;
  sessionMemory: boolean;
  questionIntelligenceEngine: boolean;
  nonVerbalFeedback: boolean;
  voiceAcousticAnalysis: boolean;
}

export interface SessionViewProps {
  session: SessionViewSession;
  persona: SessionViewPersona;
  runtimeFeatures: RuntimeFeatureFlagsClient;
}

type Phase = "permissions" | "pre-call" | "live" | "ending";
type MediaState = "idle" | "requesting" | "granted" | "denied" | "error";

interface TranscriptLine {
  id: string;
  speaker: "user" | "interviewer";
  text: string;
  startedAtMs: number; // ms since call start
  interim?: boolean;
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export function SessionView({ session, persona, runtimeFeatures }: SessionViewProps) {
  const router = useRouter();

  // Phase: skip pre-call if the session was already started
  const [phase, setPhase] = useState<Phase>(session.started_at ? "live" : "permissions");

  // Media state
  const [mediaState, setMediaState] = useState<MediaState>("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  // Call state
  const [callStartedAtMs, setCallStartedAtMs] = useState<number | null>(
    session.started_at ? new Date(session.started_at).getTime() : null,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Transcript (Phase C populates this via the orchestrator)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [currentInterviewerLine, setCurrentInterviewerLine] = useState<string | null>(null);

  // Refs
  const streamRef = useRef<MediaStream | null>(null);

  // Callback ref: re-binds srcObject every time a <video> element mounts.
  // Needed because pre-call and live render different <video> nodes, and a plain
  // useRef would only hold the most recent reference — losing srcObject on transition.
  const attachSelfVideo = useCallback((el: HTMLVideoElement | null) => {
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
    }
  }, []);

  const [, startEndTransition] = useTransition();

  // ---- Media acquisition ------------------------------------------------

  const requestMedia = useCallback(async () => {
    setMediaState("requesting");
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      streamRef.current = stream;
      // Bind to any <video> already mounted (callback ref only fires on mount/unmount).
      document.querySelectorAll<HTMLVideoElement>("video[data-self-view]").forEach((v) => {
        v.srcObject = stream;
      });
      setMediaState("granted");
      setPhase((p) => (p === "permissions" ? "pre-call" : p));
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMediaState("denied");
        setMediaError("Camera and microphone access were blocked. Unblock them in your browser and try again.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setMediaState("error");
        setMediaError("No camera or microphone found. Plug one in and retry.");
      } else {
        setMediaState("error");
        setMediaError("Couldn't access your camera or microphone. Try another browser if this persists.");
      }
    }
  }, []);

  // Request media on mount if we're in permissions phase
  useEffect(() => {
    if (phase === "permissions" && mediaState === "idle") {
      void requestMedia();
    }
  }, [phase, mediaState, requestMedia]);

  // If already live on mount (session was started and user came back), request media silently
  useEffect(() => {
    if (phase === "live" && mediaState === "idle") {
      void requestMedia();
    }
  }, [phase, mediaState, requestMedia]);

  // ---- Track toggles ----------------------------------------------------

  useEffect(() => {
    const s = streamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
  }, [micEnabled]);

  useEffect(() => {
    const s = streamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = cameraEnabled));
  }, [cameraEnabled]);

  // ---- Call timer -------------------------------------------------------

  useEffect(() => {
    if (phase !== "live" || callStartedAtMs === null) return;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - callStartedAtMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, callStartedAtMs]);

  // ---- Cleanup on unmount ----------------------------------------------

  useEffect(() => {
    const stream = streamRef.current;
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ---- Abandonment on unload (best-effort) -----------------------------

  useEffect(() => {
    if (phase !== "live") return;
    const handler = () => {
      // Best-effort; sendBeacon is the reliable path but requires an edge route.
      // For Phase B, we rely on the server action call when the user clicks End.
      // Leaving this effect in place as a hook point for a /api/session/abandon route in Phase C.
      void 0;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // ---- Start call -------------------------------------------------------

  const startCall = useCallback(async () => {
    if (mediaState !== "granted") return;
    const result = await markSessionStarted(session.id);
    if (!result.ok) {
      setMediaError("Couldn't start the session. Try again.");
      return;
    }
    setCallStartedAtMs(Date.now());
    setPhase("live");
    // Phase C hook: orchestrator.start({ session, persona, streamRef.current }) goes here.
    // For Phase B we seed a placeholder interviewer line so the transcript panel isn't empty.
    setCurrentInterviewerLine("Connecting...");
  }, [mediaState, session.id]);

  // ---- End call ---------------------------------------------------------

  const endCall = useCallback(
    async (finalStatus: "completed" | "abandoned" = "completed") => {
      setPhase("ending");
      const duration = callStartedAtMs ? Math.floor((Date.now() - callStartedAtMs) / 1000) : 0;
      startEndTransition(async () => {
        await endSession({ sessionId: session.id, finalStatus, actualDurationSeconds: duration });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        router.push("/dashboard?session=" + session.id);
      });
    },
    [callStartedAtMs, session.id, router],
  );

  // ---- Derived ----------------------------------------------------------

  const targetMinutes = Math.round(session.duration_seconds / 60);

  // ---- Render -----------------------------------------------------------

  if (phase === "permissions" || phase === "pre-call") {
    return (
      <PreCallScreen
        persona={persona}
        session={session}
        runtimeFeatures={runtimeFeatures}
        mediaState={mediaState}
        mediaError={mediaError}
        onRetryMedia={requestMedia}
        attachSelfVideo={attachSelfVideo}
        onStart={startCall}
        targetMinutes={targetMinutes}
      />
    );
  }

  if (phase === "ending") {
    return <EndingScreen />;
  }

  return (
    <LiveCallScreen
      persona={persona}
      session={session}
      elapsedSeconds={elapsedSeconds}
      targetMinutes={targetMinutes}
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      onToggleMic={() => setMicEnabled((m) => !m)}
      onToggleCamera={() => setCameraEnabled((c) => !c)}
      onEnd={() => endCall("completed")}
      attachSelfVideo={attachSelfVideo}
      transcript={transcript}
      currentInterviewerLine={currentInterviewerLine}
    />
  );
}

// ==========================================================================
// PRE-CALL SCREEN
// ==========================================================================

function PreCallScreen({
  persona,
  session,
  runtimeFeatures,
  mediaState,
  mediaError,
  onRetryMedia,
  attachSelfVideo,
  onStart,
  targetMinutes,
}: {
  persona: SessionViewPersona;
  session: SessionViewSession;
  runtimeFeatures: RuntimeFeatureFlagsClient;
  mediaState: MediaState;
  mediaError: string | null;
  onRetryMedia: () => void;
  attachSelfVideo: (el: HTMLVideoElement | null) => void;
  onStart: () => void;
  targetMinutes: number;
}) {
  const ready = mediaState === "granted";

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-12 sm:px-10">
      <p className="font-mono text-[11px] tracking-label text-text-tertiary">
        SESSION · {session.interview_type.replace(/_/g, " ").toUpperCase()} · {targetMinutes} MIN
      </p>
      <h1 className="mt-3 font-display text-[36px] font-semibold tracking-heading text-text-primary">
        You're about to meet {persona.firstName}.
      </h1>
      <p className="mt-2 font-serif text-[16px] italic text-text-secondary">
        {interviewPitchLine(persona, session)}
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Self-view preview */}
        <div className="overflow-hidden rounded-2xl border border-ink-border bg-ink-surface">
          <div className="relative aspect-video w-full bg-ink">
            {ready ? (
              <video
                ref={attachSelfVideo} data-self-view
                autoPlay
                muted
                playsInline
                className="h-full w-full scale-x-[-1] object-cover"
              />
            ) : (
              <MediaPlaceholder state={mediaState} message={mediaError} onRetry={onRetryMedia} />
            )}
            {ready && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-between p-4">
                <span className="rounded-md bg-ink/80 px-2 py-1 font-mono text-[10px] tracking-label text-text-secondary backdrop-blur-sm">
                  PREVIEW · YOU
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-ink-border px-4 py-3">
            <p className="font-sans text-[12px] text-text-tertiary">
              {ready
                ? "Audio and video look good. You can mute or turn off your camera anytime."
                : "We need camera and microphone access to run the call."}
            </p>
          </div>
        </div>

        {/* Persona + mode card */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-ink-border bg-gradient-to-br from-ink-surface to-ink-raised p-6">
          <PersonaBadge persona={persona} />

          <div className="border-t border-ink-border pt-4">
            <p className="font-mono text-[10px] tracking-label text-text-tertiary">FORMAT</p>
            <p className="mt-1 font-sans text-[14px] text-text-primary">
              {formatLabel(session.interview_type)} · {modeLabel(session.mode)}
            </p>
          </div>

          {(session.target_firm || session.target_role) && (
            <div className="border-t border-ink-border pt-4">
              <p className="font-mono text-[10px] tracking-label text-text-tertiary">TARGET</p>
              <p className="mt-1 font-sans text-[14px] text-text-primary">
                {[session.target_firm, session.target_role].filter(Boolean).join(" · ")}
              </p>
              {session.target_firm && !runtimeFeatures.firmCalibration && (
                <p className="mt-1 font-sans text-[11px] text-text-tertiary">
                  Saved for your notes. Firm-specific calibration activates on Pro.
                </p>
              )}
            </div>
          )}

          <div className="border-t border-ink-border pt-4">
            <p className="font-mono text-[10px] tracking-label text-text-tertiary">BEFORE YOU START</p>
            <ul className="mt-2 space-y-1.5 font-sans text-[12px] leading-relaxed text-text-secondary">
              <li>• Find a quiet spot. Close tabs that make noise.</li>
              <li>• Sit where you'd sit for the real interview.</li>
              <li>• Treat this like the real thing. That's where the value is.</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={onStart}
            disabled={!ready}
            className={[
              "mt-2 rounded-full px-6 py-3 font-sans text-[14px] font-semibold transition-all",
              ready
                ? "bg-accent text-ink hover:bg-accent-light"
                : "cursor-not-allowed bg-ink-raised text-text-tertiary",
            ].join(" ")}
          >
            {ready ? `Start the call →` : "Waiting for camera..."}
          </button>
        </aside>
      </div>
    </div>
  );
}

// ==========================================================================
// LIVE CALL SCREEN
// ==========================================================================

function LiveCallScreen({
  persona,
  session,
  elapsedSeconds,
  targetMinutes,
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onEnd,
  attachSelfVideo,
  transcript,
  currentInterviewerLine,
}: {
  persona: SessionViewPersona;
  session: SessionViewSession;
  elapsedSeconds: number;
  targetMinutes: number;
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
  attachSelfVideo: (el: HTMLVideoElement | null) => void;
  transcript: TranscriptLine[];
  currentInterviewerLine: string | null;
}) {
  const elapsedLabel = formatElapsed(elapsedSeconds);
  const overBudget = elapsedSeconds > targetMinutes * 60;

  return (
    <div className="fixed inset-0 flex flex-col bg-ink">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-ink-border px-6 py-3">
        <div className="flex items-center gap-3">
          <FolioMark className="h-5 w-5" color="#00F590" />
          <span className="font-mono text-[11px] tracking-label text-text-tertiary">
            {session.interview_type.replace(/_/g, " ").toUpperCase()} · {modeLabel(session.mode).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={[
              "flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] tracking-label",
              overBudget ? "border-accent/60 text-accent" : "border-ink-border text-text-secondary",
            ].join(" ")}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            {elapsedLabel} / {targetMinutes}:00
          </span>
        </div>
      </header>

      {/* Stage */}
      <div className="relative flex-1 overflow-hidden">
        {/* Persona frame — Phase C replaces this with the Simli <video> */}
        <PersonaFrame persona={persona} />

        {/* Self-view PiP */}
        <div className="absolute bottom-28 right-6 w-[200px] overflow-hidden rounded-xl border border-ink-border bg-ink-raised shadow-lg sm:w-[240px]">
          <div className="relative aspect-video w-full bg-ink">
            <video
              ref={attachSelfVideo} data-self-view
              autoPlay
              muted
              playsInline
              className={[
                "h-full w-full scale-x-[-1] object-cover transition-opacity",
                cameraEnabled ? "opacity-100" : "opacity-0",
              ].join(" ")}
            />
            {!cameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-[10px] tracking-label text-text-tertiary">CAMERA OFF</span>
              </div>
            )}
          </div>
        </div>

        {/* Interviewer line (current spoken / being spoken — seeded placeholder until Phase C) */}
        {currentInterviewerLine && (
          <div className="pointer-events-none absolute bottom-28 left-0 right-[260px] flex justify-center px-6">
            <p className="max-w-[720px] rounded-xl bg-ink/80 px-5 py-3 text-center font-sans text-[15px] leading-relaxed text-text-primary backdrop-blur-md">
              {currentInterviewerLine}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <footer className="flex items-center justify-center gap-3 border-t border-ink-border bg-ink px-6 py-4">
        <ControlButton
          active={micEnabled}
          onClick={onToggleMic}
          label={micEnabled ? "Mute" : "Unmute"}
          icon={micEnabled ? "mic" : "mic-off"}
          dangerWhenInactive
        />
        <ControlButton
          active={cameraEnabled}
          onClick={onToggleCamera}
          label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
          icon={cameraEnabled ? "video" : "video-off"}
          dangerWhenInactive
        />
        <button
          type="button"
          onClick={onEnd}
          className="ml-4 flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 font-sans text-[13px] font-semibold text-white transition-all hover:bg-red-400"
        >
          <EndCallIcon />
          End call
        </button>
      </footer>

      {/* Transcript strip — collapsed by default for Phase B (Phase C can make this toggleable) */}
      <TranscriptStrip transcript={transcript} persona={persona} />
    </div>
  );
}

// ==========================================================================
// ENDING SCREEN
// ==========================================================================

function EndingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6">
      <FolioMark className="h-10 w-10" color="#00F590" />
      <p className="mt-6 font-display text-[18px] font-semibold text-text-primary">Wrapping up.</p>
      <p className="mt-1 font-sans text-[13px] text-text-secondary">
        Saving your session. Feedback in a moment.
      </p>
    </div>
  );
}

// ==========================================================================
// SUB-COMPONENTS
// ==========================================================================

function PersonaFrame({ persona }: { persona: SessionViewPersona }) {
  // Phase B placeholder. Phase C replaces the inner block with <video ref={simliVideoRef}>.
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="relative flex h-[420px] w-[560px] items-center justify-center rounded-3xl border border-ink-border"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(0,245,144,0.12), transparent 60%), radial-gradient(ellipse at bottom right, rgba(0,212,120,0.08), transparent 55%), #161B22",
        }}
        aria-label={`${persona.name} frame`}
      >
        <div className="flex flex-col items-center">
          <div
            className="flex h-44 w-44 items-center justify-center rounded-full border border-accent/30"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(0,245,144,0.25), rgba(13,17,23,0.9) 70%)",
            }}
          >
            <span className="font-serif text-[64px] font-semibold italic text-accent">
              {persona.firstName[0]}
            </span>
          </div>
          <p className="mt-6 font-display text-[18px] font-semibold text-text-primary">{persona.name}</p>
          <p className="mt-0.5 font-sans text-[12px] text-text-secondary">
            {persona.title} · {persona.firm}
          </p>
        </div>
      </div>
    </div>
  );
}

function PersonaBadge({ persona }: { persona: SessionViewPersona }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep font-serif text-[18px] font-semibold text-ink"
        aria-hidden="true"
      >
        {persona.firstName[0]}
      </div>
      <div>
        <p className="font-sans text-[14px] font-semibold text-text-primary">{persona.name}</p>
        <p className="font-sans text-[12px] text-text-secondary">
          {persona.title} · {persona.firm}
        </p>
      </div>
    </div>
  );
}

function MediaPlaceholder({
  state,
  message,
  onRetry,
}: {
  state: MediaState;
  message: string | null;
  onRetry: () => void;
}) {
  if (state === "requesting") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-border border-t-accent" />
        <p className="font-sans text-[13px] text-text-secondary">
          Waiting for camera and microphone permission...
        </p>
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-sans text-[13px] text-text-secondary">
        {message ?? "Camera and microphone access is required."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-accent/40 bg-accent/10 px-4 py-2 font-sans text-[12px] font-semibold text-accent transition-all hover:bg-accent/20"
      >
        Try again
      </button>
    </div>
  );
}

function ControlButton({
  active,
  onClick,
  label,
  icon,
  dangerWhenInactive = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: "mic" | "mic-off" | "video" | "video-off";
  dangerWhenInactive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "flex h-11 w-11 items-center justify-center rounded-full border transition-all",
        active
          ? "border-ink-border bg-ink-raised text-text-primary hover:bg-ink-surface"
          : dangerWhenInactive
            ? "border-red-500/40 bg-red-500/10 text-red-400"
            : "border-ink-border bg-ink-raised text-text-tertiary",
      ].join(" ")}
    >
      <ControlIcon icon={icon} />
    </button>
  );
}

function ControlIcon({ icon }: { icon: "mic" | "mic-off" | "video" | "video-off" }) {
  const common = "h-4 w-4";
  switch (icon) {
    case "mic":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 11a7 7 0 0 1-14 0" />
          <line x1="12" y1="18" x2="12" y2="22" />
        </svg>
      );
    case "mic-off":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M18.89 13.23A7 7 0 0 0 19 12v-2" />
          <path d="M5 10v2a7 7 0 0 0 12 5" />
          <path d="M15 9.34V5a3 3 0 0 0-5.94-.6" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
          <line x1="12" y1="19" x2="12" y2="23" />
        </svg>
      );
    case "video":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="14" height="12" rx="2" />
          <path d="m22 8-6 4 6 4V8Z" />
        </svg>
      );
    case "video-off":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34" />
          <path d="M16 16v0a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
          <path d="m22 8-6 4 6 4V8Z" />
        </svg>
      );
  }
}

function EndCallIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" transform="rotate(135 12 12)" />
    </svg>
  );
}

function TranscriptStrip({
  transcript,
  persona,
}: {
  transcript: TranscriptLine[];
  persona: SessionViewPersona;
}) {
  if (transcript.length === 0) {
    return (
      <div className="absolute bottom-20 left-0 right-0 flex justify-center px-6">
        <p className="font-mono text-[10px] tracking-label text-text-tertiary">
          WAITING FOR {persona.firstName.toUpperCase()}...
        </p>
      </div>
    );
  }
  const lastTwo = transcript.slice(-2);
  return (
    <div className="absolute bottom-20 left-0 right-0 flex justify-center px-6">
      <div className="flex max-w-[720px] flex-col gap-1.5">
        {lastTwo.map((line) => (
          <p
            key={line.id}
            className={[
              "font-sans text-[13px] leading-relaxed",
              line.speaker === "user" ? "text-text-secondary" : "text-text-primary",
            ].join(" ")}
          >
            <span className="font-mono text-[10px] tracking-label text-text-tertiary">
              {line.speaker === "user" ? "YOU" : persona.firstName.toUpperCase()}
            </span>{" "}
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}

// ==========================================================================
// HELPERS
// ==========================================================================

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatLabel(t: InterviewType): string {
  const map: Record<InterviewType, string> = {
    behavioral: "Behavioral",
    case: "Case",
    technical: "Technical",
    product_sense: "Product sense",
    superday: "Superday",
    hard_mode: "Hard mode",
  };
  return map[t];
}

function modeLabel(mode: SessionMode): string {
  return mode === "easy" ? "Easy" : mode === "hard" ? "Hard" : "Standard";
}

function interviewPitchLine(persona: SessionViewPersona, session: SessionViewSession): string {
  const format = formatLabel(session.interview_type).toLowerCase();
  return `${persona.firstName} is running a ${format} interview. Keep it real — that's where the value is.`;
}

// Suppress unused-var lint on the memoized dep placeholder
void useMemo;
