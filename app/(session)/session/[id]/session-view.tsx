"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FolioMark } from "@/components/FolioMark";
import { endSession, markSessionStarted } from "./actions";
import type { PersonaId, InterviewType, SessionStatus, SessionMode } from "@/types/supabase";
import type { ConversationTurn, OrchestratorState, OrchestratorHandle } from "@/lib/pipeline/types";
import { createOrchestrator } from "@/lib/client-pipeline/orchestrator";
import { MockSTTClient } from "@/lib/client-pipeline/mock-stt";
import { MockTTSClient } from "@/lib/client-pipeline/mock-tts";
import { MockAvatarClient } from "@/lib/client-pipeline/mock-avatar";
import { DeepgramSTTClient } from "@/lib/client-pipeline/deepgram-stt";
import { ElevenLabsTTSClient } from "@/lib/client-pipeline/elevenlabs-tts";
import { TavusAvatarClient } from "@/lib/client-pipeline/tavus-avatar";
import { createAudioSink, type AudioSink } from "@/lib/client-pipeline/audio-sink";
import type { STTClient, TTSClient, AvatarClient } from "@/lib/client-pipeline/types";
import { formatInterviewType, formatSessionMode } from "@/lib/utils/session-labels";

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

export interface PipelineCapabilities {
  deepgram: boolean;
  elevenlabs: boolean;
  tavus: boolean;
}

export interface SessionViewProps {
  session: SessionViewSession;
  persona: SessionViewPersona;
  runtimeFeatures: RuntimeFeatureFlagsClient;
  pipelineCapabilities: PipelineCapabilities;
}

type Phase = "permissions" | "pre-call" | "live" | "ending";
type MediaState = "idle" | "requesting" | "granted" | "denied" | "error";

// --------------------------------------------------------------------------
// Agent portraits — product roster is Sarah (v.2) and Gemma (v.3) only.
// Legacy persona ids fall back to the monogram treatment.
// --------------------------------------------------------------------------

const AGENT_PORTRAITS: Record<string, { src: string; version: string }> = {
  sarah: { src: "/images/agents/sarah.png", version: "v.2" },
  gemma: { src: "/images/agents/gemma.png", version: "v.3" },
};

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export function SessionView({ session, persona, runtimeFeatures, pipelineCapabilities }: SessionViewProps) {
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

  // Transcript + interviewer line are driven by the orchestrator once the call is live.
  const [orchestratorState, setOrchestratorState] = useState<OrchestratorState | null>(null);
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const [remoteAvatarStream, setRemoteAvatarStream] = useState<MediaStream | null>(null);

  // Derived: what the UI actually shows
  const transcript = orchestratorState?.transcript ?? [];
  const currentInterviewerLine = orchestratorState?.currentInterviewerLine ?? null;
  const currentUserInterim = orchestratorState?.currentUserInterim ?? null;

  // Refs
  const streamRef = useRef<MediaStream | null>(null);
  const orchestratorRef = useRef<OrchestratorHandle | null>(null);
  const mockSttRef = useRef<MockSTTClient | null>(null);
  const mockAvatarRef = useRef<MockAvatarClient | null>(null);
  const audioSinkRef = useRef<AudioSink | null>(null);

  // Callback ref: re-binds srcObject every time a <video> element mounts.
  // Needed because pre-call and live render different <video> nodes, and a plain
  // useRef would only hold the most recent reference — losing srcObject on transition.
  const attachSelfVideo = useCallback((el: HTMLVideoElement | null) => {
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
    }
  }, []);

  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const sttErrorUnsubRef = useRef<(() => void) | null>(null);

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
    // Read streamRef.current inside the cleanup closure itself (not captured
    // here) — getUserMedia resolves asynchronously after this effect runs on
    // mount, so capturing it eagerly would always see null.
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ---- Abandonment on unload (sendBeacon to /api/session/abandon) -----

  useEffect(() => {
    if (phase !== "live") return;
    const handler = () => {
      // pagehide fires in more cases than beforeunload (mobile background,
      // bfcache, page-replace). sendBeacon is the only reliable way to
      // post during unload — regular fetch gets cancelled.
      try {
        const body = new Blob([JSON.stringify({ sessionId: session.id })], {
          type: "application/json",
        });
        navigator.sendBeacon?.("/api/session/abandon", body);
      } catch {
        /* silent — unload path */
      }
    };
    window.addEventListener("pagehide", handler);
    // beforeunload kept for browsers where pagehide doesn't fire reliably on tab close
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [phase, session.id]);

  // ---- Start call -------------------------------------------------------

  const startCall = useCallback(async () => {
    if (mediaState !== "granted") return;
    if (!streamRef.current) return;
    if (orchestratorRef.current || startingRef.current) return; // already running or already starting
    // Set synchronously, before the first await, so a second click that lands
    // before markSessionStarted resolves can't slip past this guard too.
    startingRef.current = true;
    setStarting(true);

    const result = await markSessionStarted(session.id);
    if (!result.ok) {
      setMediaError("Couldn't start the session. Try again.");
      startingRef.current = false;
      setStarting(false);
      return;
    }
    setCallStartedAtMs(Date.now());
    setPhase("live");

    // Build the pipeline. Real services used when the server advertises capability
    // (key present); otherwise mock. TTS + avatar share an AudioSink in real mode —
    // ElevenLabs writes PCM into it, Tavus sends that stream's audio track upstream
    // over WebRTC. The user hears Tavus's returned (lip-synced) audio, not local playback.

    const useRealTts = pipelineCapabilities.elevenlabs;
    const useRealAvatar = pipelineCapabilities.tavus;

    // Audio sink only needed if *either* real TTS or real avatar is active — both
    // share it in full-real mode; a real-TTS-only mode would play through it locally
    // but we don't support that (Option B — audio only via Tavus).
    let audioSink: AudioSink | null = null;
    if (useRealTts && useRealAvatar) {
      audioSink = await createAudioSink({ sampleRate: 22050 });
      audioSinkRef.current = audioSink;
    }

    const stt: STTClient = pipelineCapabilities.deepgram
      ? new DeepgramSTTClient()
      : new MockSTTClient();

    const tts: TTSClient =
      useRealTts && audioSink
        ? new ElevenLabsTTSClient({ sessionId: session.id, audioSink })
        : new MockTTSClient();

    const avatar: AvatarClient =
      useRealAvatar && audioSink
        ? new TavusAvatarClient({
            sessionId: session.id,
            audioSink,
            onRemoteStream: (stream) => {
              setRemoteAvatarStream(stream);
            },
            onError: (err) => {
              console.error("[tavus]", err);
              setAvatarError("Video connection lost. Audio is still active.");
            },
          })
        : new MockAvatarClient();

    mockAvatarRef.current = avatar instanceof MockAvatarClient ? avatar : null;
    mockSttRef.current = stt instanceof MockSTTClient ? stt : null;

    sttErrorUnsubRef.current = stt.onError?.((err) => {
      console.error("[deepgram]", err);
      setSttError("Live transcription lost connection. Your interviewer may not be able to hear your answers — try ending and restarting the session if this continues.");
    }) ?? null;

    if (mockAvatarRef.current) {
      mockAvatarRef.current.onSpeakingChange((speaking) => setAvatarSpeaking(speaking));
    } else if (avatar instanceof TavusAvatarClient) {
      avatar.onSpeakingChange((speaking) => setAvatarSpeaking(speaking));
    }

    const orchestrator = createOrchestrator({
      ctx: {
        sessionId: session.id,
        personaId: session.persona,
        interviewType: session.interview_type,
        mode: session.mode,
        targetFirm: session.target_firm,
        targetRole: session.target_role,
        candidateFirstName: null,
        targetDurationMinutes: Math.round(session.duration_seconds / 60),
      },
      micStream: streamRef.current,
      clients: { stt, tts, avatar },
    });
    orchestratorRef.current = orchestrator;
    startingRef.current = false;
    setStarting(false);

    const unsub = orchestrator.subscribe((s) => setOrchestratorState(s));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (orchestratorRef as any).unsub = unsub;

    void orchestrator.start();
  }, [mediaState, session, pipelineCapabilities]);

  // ---- End call ---------------------------------------------------------

  const endCall = useCallback(
    async (finalStatus: "completed" | "abandoned" = "completed") => {
      setPhase("ending");
      const duration = callStartedAtMs ? Math.floor((Date.now() - callStartedAtMs) / 1000) : 0;

      // Capture transcript BEFORE tearing down the orchestrator so we're
      // working from a stable snapshot.
      const transcriptSnapshot = orchestratorRef.current?.getState().transcript ?? [];

      // Tear down orchestrator first so it stops any in-flight streams
      try {
        await orchestratorRef.current?.end(finalStatus === "completed" ? "completed" : "abandoned");
      } catch {
        /* noop */
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsub = (orchestratorRef as any).unsub as (() => void) | undefined;
      unsub?.();
      orchestratorRef.current = null;

      sttErrorUnsubRef.current?.();
      sttErrorUnsubRef.current = null;
      setSttError(null);

      // Tear down shared audio sink (AudioContext)
      try {
        audioSinkRef.current?.close();
      } catch {
        /* noop */
      }
      audioSinkRef.current = null;
      setRemoteAvatarStream(null);

      startEndTransition(async () => {
        await endSession({
          sessionId: session.id,
          finalStatus,
          actualDurationSeconds: duration,
          transcript: transcriptSnapshot.map((t) => ({
            role: t.role === "assistant" ? "interviewer" as const : "candidate" as const,
            content: t.content,
            startedAtMs: t.startedAtMs,
            endedAtMs: t.endedAtMs ?? undefined,
          })),
        });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        router.push(`/session/${session.id}/feedback`);
      });
    },
    [callStartedAtMs, session.id, router],
  );

  // Clean up orchestrator on unmount only if still running (user navigated away mid-call).
  // The ref is nulled in endCall, so this is a no-op after a normal end.
  useEffect(() => {
    return () => {
      if (orchestratorRef.current) {
        void orchestratorRef.current.end("abandoned");
      }
    };
  }, []);

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
        starting={starting}
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
      currentUserInterim={currentUserInterim}
      avatarSpeaking={avatarSpeaking}
      remoteAvatarStream={remoteAvatarStream}
      avatarError={avatarError}
      sttError={sttError}
      orchestratorPhase={orchestratorState?.phase ?? "idle"}
      onMockSubmit={(text) => orchestratorRef.current?.mockSubmitUserTurn(text)}
      isMockMode={mockSttRef.current?.isMock ?? true}
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
  starting,
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
  starting: boolean;
  targetMinutes: number;
}) {
  const ready = mediaState === "granted";

  return (
    <div className="relative min-h-screen bg-gradient-dark">
      <div className="relative z-10 mx-auto max-w-[1040px] px-6 py-12 sm:px-10">
        <p className="font-mono text-[11px] font-medium tracking-label text-accent">
          SESSION · {session.interview_type.replace(/_/g, " ").toUpperCase()} · {targetMinutes} MIN
        </p>
        <h1 className="mt-3 font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary sm:text-[42px]">
          <span className="text-gradient-mint">{persona.firstName}</span> is ready to interview
          you.
        </h1>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-text-secondary">
          {interviewPitchLine(persona, session)}
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Self-view preview */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink/60 backdrop-blur-sm">
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
                  <span className="rounded-full bg-ink/80 px-2.5 py-1 font-mono text-[10px] tracking-label text-text-secondary backdrop-blur-sm">
                    PREVIEW · YOU
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3">
              <p className="font-sans text-[12px] text-text-tertiary">
                {ready
                  ? "Audio and video look good. You can mute or turn off your camera anytime."
                  : "We need camera and microphone access to run the call."}
              </p>
            </div>
          </div>

          {/* Persona + mode card */}
          <aside className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm">
            <PersonaBadge persona={persona} />

            <div className="border-t border-white/[0.08] pt-4">
              <p className="font-mono text-[10px] tracking-label text-text-tertiary">FORMAT</p>
              <p className="mt-1 font-sans text-[14px] text-text-primary">
                {formatInterviewType(session.interview_type)} · {formatSessionMode(session.mode)}
              </p>
            </div>

            {(session.target_firm || session.target_role) && (
              <div className="border-t border-white/[0.08] pt-4">
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

            <div className="border-t border-white/[0.08] pt-4">
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
              disabled={!ready || starting}
              className={[
                "mt-2 inline-flex h-12 items-center justify-center rounded-full px-6 font-sans text-[14px] font-semibold transition-all duration-200 ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cosmos",
                ready && !starting
                  ? "bg-cta-gradient text-ink hover:shadow-accent-glow"
                  : "cursor-not-allowed border border-white/[0.08] bg-white/[0.04] text-text-tertiary",
              ].join(" ")}
            >
              {starting ? "Starting..." : ready ? `Join the interview →` : "Waiting for camera..."}
            </button>
          </aside>
        </div>
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
  currentUserInterim,
  avatarSpeaking,
  remoteAvatarStream,
  avatarError,
  sttError,
  orchestratorPhase,
  onMockSubmit,
  isMockMode,
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
  transcript: ConversationTurn[];
  currentInterviewerLine: string | null;
  currentUserInterim: string | null;
  avatarSpeaking: boolean;
  remoteAvatarStream: MediaStream | null;
  avatarError: string | null;
  sttError: string | null;
  orchestratorPhase: string;
  onMockSubmit: (text: string) => void;
  isMockMode: boolean;
}) {
  const elapsedLabel = formatElapsed(elapsedSeconds);
  const overBudget = elapsedSeconds > targetMinutes * 60;

  return (
    <div className="fixed inset-0 flex flex-col bg-ink">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-ink-border px-6 py-3">
        <div className="flex items-center gap-3">
          <FolioMark className="h-5 w-5 text-accent" />
          <span className="font-mono text-[11px] tracking-label text-text-tertiary">
            {session.interview_type.replace(/_/g, " ").toUpperCase()} · {formatSessionMode(session.mode).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={[
              "flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] tabular-nums tracking-label",
              overBudget ? "border-accent/60 text-accent" : "border-ink-border text-text-secondary",
            ].join(" ")}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            {elapsedLabel} / {targetMinutes}:00
          </span>
        </div>
      </header>

      {/* Avatar / transcription error banners */}
      {avatarError && (
        <div className="border-b border-amber-300/20 bg-amber-300/5 px-6 py-2 text-center font-sans text-[12px] text-amber-300/90">
          {avatarError}
        </div>
      )}
      {sttError && (
        <div className="border-b border-amber-300/20 bg-amber-300/5 px-6 py-2 text-center font-sans text-[12px] text-amber-300/90">
          {sttError}
        </div>
      )}

      {/* Stage */}
      <div className="relative flex-1 overflow-hidden">
        <PersonaFrame persona={persona} speaking={avatarSpeaking} remoteStream={remoteAvatarStream} />

        {/* Listening-phase indicator */}
        {orchestratorPhase === "listening" && !currentInterviewerLine && (
          <div className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2">
            <span className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[10px] tracking-label text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              {persona.firstName.toUpperCase()} IS LISTENING
            </span>
          </div>
        )}

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

        {/* Interviewer line (streaming Claude text; cleared on commit) */}
        {currentInterviewerLine && (
          <div className="pointer-events-none absolute bottom-28 left-0 right-[260px] flex justify-center px-6">
            <p className="max-w-[720px] rounded-xl bg-ink/80 px-5 py-3 text-center font-sans text-[15px] leading-relaxed text-text-primary backdrop-blur-md">
              {currentInterviewerLine}
              {orchestratorPhase === "thinking" && <span className="ml-1 animate-pulse">...</span>}
            </p>
          </div>
        )}

        {/* User interim transcription (shown while listening) */}
        {currentUserInterim && orchestratorPhase === "listening" && (
          <div className="pointer-events-none absolute bottom-28 left-6 w-[260px]">
            <p className="rounded-xl bg-ink/60 px-4 py-2 font-sans text-[12px] italic leading-relaxed text-text-tertiary backdrop-blur-md">
              {currentUserInterim}
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
          className="ml-4 flex h-11 items-center gap-2 rounded-full bg-red-500 px-5 font-sans text-[13px] font-semibold text-white transition-all duration-200 ease-brand hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          <EndCallIcon />
          End call
        </button>
      </footer>

      {/* Mock-mode dev panel — lets you drive a session without real STT.
          Only rendered when the STT client is the mock implementation. */}
      {isMockMode && orchestratorPhase === "listening" && (
        <MockInputPanel onSubmit={onMockSubmit} persona={persona} />
      )}

      <TranscriptStrip transcript={transcript} persona={persona} />
    </div>
  );
}

// --------------------------------------------------------------------------
// Mock input panel — only shown in dev / mock mode
// --------------------------------------------------------------------------

function MockInputPanel({
  onSubmit,
  persona,
}: {
  onSubmit: (text: string) => void;
  persona: SessionViewPersona;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <div className="border-t border-accent/20 bg-accent/5 px-6 py-3">
      <div className="mx-auto flex max-w-[720px] items-center gap-3">
        <span className="shrink-0 font-mono text-[10px] tracking-label text-accent">
          MOCK · REPLY TO {persona.firstName.toUpperCase()}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Type what you'd say, press Enter..."
          className="flex-1 rounded-lg border border-ink-border bg-ink px-3 py-2 font-sans text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          autoFocus
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="rounded-lg bg-accent px-3 py-2 font-sans text-[12px] font-semibold text-ink transition-colors hover:bg-accent-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ==========================================================================
// ENDING SCREEN
// ==========================================================================

function EndingScreen() {
  return (
    <div className="relative min-h-screen bg-gradient-dark">
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <FolioMark className="h-10 w-10 text-accent" />
        <p className="mt-6 font-display text-[18px] font-bold tracking-heading text-text-primary">Wrapping up.</p>
        <p className="mt-1 font-sans text-[13px] text-text-secondary">
          Saving your session. Feedback in a moment.
        </p>
      </div>
    </div>
  );
}

// ==========================================================================
// SUB-COMPONENTS
// ==========================================================================

function PersonaFrame({
  persona,
  speaking = false,
  remoteStream = null,
}: {
  persona: SessionViewPersona;
  speaking?: boolean;
  remoteStream?: MediaStream | null;
}) {
  // Callback ref rebinds srcObject when the <video> mounts (same pattern as self-view).
  const attachVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && remoteStream) {
        el.srcObject = remoteStream;
      }
    },
    [remoteStream],
  );

  const portrait = AGENT_PORTRAITS[persona.id];

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className={[
          "relative flex h-[420px] w-[560px] items-center justify-center overflow-hidden rounded-3xl border bg-ink-surface transition-colors",
          speaking ? "border-accent/60 shadow-accent-glow" : "border-ink-border",
        ].join(" ")}
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, rgba(99,216,138,0.12), transparent 60%), radial-gradient(ellipse at bottom right, rgba(65,176,108,0.08), transparent 55%)",
        }}
        aria-label={`${persona.name} frame`}
      >
        {/* Speaking pulse ring (shows regardless of video presence) */}
        {speaking && (
          <div className="pointer-events-none absolute inset-0 rounded-3xl">
            <div className="absolute inset-0 animate-pulse rounded-3xl ring-2 ring-accent/30" />
          </div>
        )}

        {remoteStream ? (
          // Real avatar — Tavus's returned video + audio (audio plays through this element)
          <>
            <video
              ref={attachVideo}
              autoPlay
              playsInline
              // Do NOT mute — this element is the only audio path in Option B
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Name strip overlay */}
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-md bg-ink/70 px-3 py-1.5 backdrop-blur-sm">
              <p className="font-sans text-[13px] font-semibold text-text-primary">{persona.name}</p>
              <p className="font-sans text-[10px] text-text-secondary">
                {persona.title} · {persona.firm}
              </p>
            </div>
          </>
        ) : (
          // Placeholder — used in mock avatar mode, or while Tavus is still connecting
          <div className="flex flex-col items-center">
            <div
              className={[
                "relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border transition-all duration-500 motion-reduce:transition-none",
                speaking
                  ? "scale-105 border-accent/60 shadow-accent-glow-lg"
                  : "scale-100 border-accent/30",
              ].join(" ")}
              style={{
                background: "radial-gradient(circle at 30% 30%, rgba(99,216,138,0.25), rgba(14,17,22,0.9) 70%)",
              }}
            >
              {portrait ? (
                <Image
                  src={portrait.src}
                  alt={persona.name}
                  fill
                  sizes="176px"
                  className="object-cover"
                  priority
                />
              ) : (
                <span className="font-display text-[64px] font-bold text-accent">
                  {persona.firstName[0]}
                </span>
              )}
            </div>
            <p className="mt-6 flex items-center gap-2 font-display text-[18px] font-bold tracking-heading text-text-primary">
              {persona.name}
              {portrait && (
                <span className="rounded-full border border-white/[0.12] bg-ink/60 px-2 py-0.5 font-mono text-[10px] font-normal tracking-normal text-accent">
                  {portrait.version}
                </span>
              )}
            </p>
            <p className="mt-0.5 font-sans text-[12px] text-text-secondary">
              {persona.title} · {persona.firm}
            </p>
            {speaking && (
              <p className="mt-3 font-mono text-[10px] tracking-label text-accent/80">SPEAKING</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PersonaBadge({ persona }: { persona: SessionViewPersona }) {
  const portrait = AGENT_PORTRAITS[persona.id];

  return (
    <div className="flex items-center gap-3">
      {portrait ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/[0.12]">
          <Image src={portrait.src} alt={persona.name} fill sizes="48px" className="object-cover" />
        </div>
      ) : (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep font-display text-[18px] font-bold text-ink"
          aria-hidden="true"
        >
          {persona.firstName[0]}
        </div>
      )}
      <div>
        <p className="flex items-center gap-2 font-sans text-[14px] font-semibold text-text-primary">
          {persona.name}
          {portrait && (
            <span className="rounded-full border border-white/[0.12] bg-ink/60 px-2 py-0.5 font-mono text-[10px] font-normal text-accent">
              {portrait.version}
            </span>
          )}
        </p>
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
        className="inline-flex h-11 items-center rounded-full border border-accent/40 bg-accent/10 px-5 font-sans text-[12px] font-semibold text-accent transition-all duration-200 ease-brand hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
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
        "flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
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
  transcript: ConversationTurn[];
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
        {lastTwo.map((line, i) => (
          <p
            key={`${line.startedAtMs}-${i}`}
            className={[
              "font-sans text-[13px] leading-relaxed",
              line.role === "user" ? "text-text-secondary" : "text-text-primary",
            ].join(" ")}
          >
            <span className="font-mono text-[10px] tracking-label text-text-tertiary">
              {line.role === "user" ? "YOU" : persona.firstName.toUpperCase()}
            </span>{" "}
            {line.content}
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

function interviewPitchLine(persona: SessionViewPersona, session: SessionViewSession): string {
  const format = formatInterviewType(session.interview_type).toLowerCase();
  return `${persona.firstName} is running a ${format} interview. Keep it real — that's where the value is.`;
}

