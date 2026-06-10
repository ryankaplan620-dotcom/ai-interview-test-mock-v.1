"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { endSession } from "./actions";
import type { InterviewType, SessionMode, PersonaId } from "@/types/supabase";

// --------------------------------------------------------------------------
// Agent portraits — product roster is Sarah (v.2) and Gemma (v.3) only.
// Legacy persona ids fall back to the monogram treatment.
// --------------------------------------------------------------------------

const AGENT_PORTRAITS: Record<string, { src: string; version: string }> = {
  sarah: { src: "/images/agents/sarah.png", version: "v.2" },
  gemma: { src: "/images/agents/gemma.png", version: "v.3" },
};

// ==========================================================================
// Types
// ==========================================================================

export interface TavusSessionViewSession {
  id: string;
  persona: PersonaId;
  interview_type: InterviewType;
  mode: SessionMode;
  target_firm: string | null;
  target_role: string | null;
  duration_seconds: number;
}

export interface TavusSessionViewPersona {
  id: PersonaId;
  name: string;
  firstName: string;
  firm: string;
  title: string;
}

interface Props {
  session: TavusSessionViewSession;
  persona: TavusSessionViewPersona;
}

type Phase = "intro" | "connecting" | "live" | "ending";

// ==========================================================================
// Main component
// ==========================================================================

export function TavusSessionView({ session, persona }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // --- Start the Tavus conversation ------------------------------------

  const startCall = useCallback(async () => {
    setPhase("connecting");
    setError(null);

    try {
      const res = await fetch("/api/tavus/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const body = (await res.json().catch(() => null)) as
        | { conversationUrl?: string; conversationId?: string; error?: string }
        | null;

      if (!res.ok || !body?.conversationUrl) {
        setError(describeError(body?.error ?? `http_${res.status}`));
        setPhase("intro");
        return;
      }

      setConversationUrl(body.conversationUrl);
      setPhase("live");
      startedAtRef.current = Date.now();

      // Tick elapsed timer
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((Date.now() - startedAtRef.current) / 1000);
      }, 500);
    } catch (err) {
      console.error("[tavus-session] startCall failed:", err);
      setError("Connection error. Check your network and try again.");
      setPhase("intro");
    }
  }, [session.id]);

  // --- End the call ----------------------------------------------------

  const endCall = useCallback(
    async (finalStatus: "completed" | "abandoned" = "completed") => {
      setPhase("ending");
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Tavus shutdown webhook will eventually mark the session itself, but
      // we also proactively mark it here so the user's dashboard is accurate
      // immediately. Webhook is idempotent — if it fires after we already
      // marked, it's a no-op.
      const duration = startedAtRef.current
        ? Math.floor((Date.now() - startedAtRef.current) / 1000)
        : 0;

      await endSession({
        sessionId: session.id,
        finalStatus,
        actualDurationSeconds: duration,
        transcript: [], // Transcript arrives via Tavus webhook, not from client
      });

      router.push(`/session/${session.id}/feedback`);
    },
    [session.id, router],
  );

  // --- Cleanup ---------------------------------------------------------

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  // Abandon on tab close
  useEffect(() => {
    if (phase !== "live") return;
    const handler = () => {
      try {
        const body = new Blob([JSON.stringify({ sessionId: session.id })], {
          type: "application/json",
        });
        navigator.sendBeacon?.("/api/session/abandon", body);
      } catch {
        /* silent */
      }
    };
    window.addEventListener("pagehide", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [phase, session.id]);

  // ==========================================================================
  // Render
  // ==========================================================================

  if (phase === "intro") {
    return <IntroScreen persona={persona} session={session} error={error} onStart={startCall} />;
  }

  if (phase === "connecting") {
    return <ConnectingScreen persona={persona} />;
  }

  if (phase === "ending") {
    return <EndingScreen />;
  }

  // Live phase
  return (
    <LiveScreen
      persona={persona}
      session={session}
      conversationUrl={conversationUrl!}
      elapsedSeconds={elapsedSeconds}
      onEnd={() => endCall("completed")}
    />
  );
}

// ==========================================================================
// Phase screens
// ==========================================================================

function IntroScreen({
  persona,
  session,
  error,
  onStart,
}: {
  persona: TavusSessionViewPersona;
  session: TavusSessionViewSession;
  error: string | null;
  onStart: () => void;
}) {
  const portrait = AGENT_PORTRAITS[persona.id];

  return (
    <div className="relative min-h-screen bg-gradient-dark">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[760px] flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
        {/* Agent portrait — monogram fallback for legacy persona ids */}
        {portrait ? (
          <div className="relative">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/[0.12] shadow-accent-glow sm:h-32 sm:w-32">
              <Image
                src={portrait.src}
                alt={persona.name}
                fill
                sizes="128px"
                className="object-cover"
                priority
              />
            </div>
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full border border-white/[0.12] bg-ink/80 px-2.5 py-0.5 font-mono text-[10px] text-accent backdrop-blur-sm">
              {portrait.version}
            </span>
          </div>
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-accent/30 bg-ink-surface font-display text-[40px] font-bold text-accent shadow-accent-glow sm:h-32 sm:w-32">
            {persona.firstName[0]}
          </div>
        )}

        <p className="mt-8 font-mono text-[11px] font-medium tracking-label text-accent">
          SESSION READY
        </p>
        <h1 className="mt-3 font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary sm:text-[44px]">
          <span className="text-gradient-mint">{persona.firstName}</span> is ready to interview
          you.
        </h1>
        <p className="mt-4 max-w-[520px] font-sans text-[15px] leading-relaxed text-text-secondary">
          {persona.title} at {persona.firm}.
        </p>

        {/* Session config — mono pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-white/[0.12] bg-white/[0.04] px-3.5 py-1.5 font-mono text-[10px] tracking-label text-text-secondary">
            {session.interview_type.replace(/_/g, " ").toUpperCase()}
          </span>
          <span className="rounded-full border border-white/[0.12] bg-white/[0.04] px-3.5 py-1.5 font-mono text-[10px] tracking-label text-text-secondary">
            {Math.round(session.duration_seconds / 60)} MIN
          </span>
          <span className="rounded-full border border-white/[0.12] bg-white/[0.04] px-3.5 py-1.5 font-mono text-[10px] tracking-label text-text-secondary">
            {humanMode(session.mode).toUpperCase()} MODE
          </span>
          {session.target_firm && (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 font-mono text-[10px] tracking-label text-accent">
              {session.target_firm.toUpperCase()}
            </span>
          )}
        </div>

        <div className="mt-10 w-full max-w-[560px] rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-5 text-left backdrop-blur-sm">
          <p className="font-mono text-[10px] tracking-label text-text-tertiary">BEFORE YOU START</p>
          <ul className="mt-3 flex flex-col gap-2.5 font-sans text-[13px] leading-[1.55] text-text-secondary">
            <li>• Make sure your mic and camera work. You'll be asked to allow access when you join.</li>
            <li>• Find a quiet place. Background noise affects the interviewer's ability to respond.</li>
            <li>• Treat this like the real thing. Posture, pacing, the works.</li>
            <li>• Click End call when you're done. Feedback lands the moment you do.</li>
          </ul>
        </div>

        {error && (
          <div className="mt-6 w-full max-w-[560px] rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3">
            <p className="font-sans text-[13px] leading-relaxed text-rose-300">{error}</p>
          </div>
        )}

        <button
          onClick={onStart}
          className="mt-10 inline-flex h-12 items-center rounded-full bg-cta-gradient px-8 font-sans text-[15px] font-semibold text-ink transition-all duration-200 ease-brand hover:shadow-accent-glow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cosmos"
        >
          Join the interview →
        </button>
      </div>
    </div>
  );
}

function ConnectingScreen({ persona }: { persona: TavusSessionViewPersona }) {
  const portrait = AGENT_PORTRAITS[persona.id];

  return (
    <div className="relative min-h-screen bg-gradient-dark">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[720px] flex-col items-center justify-center px-6 text-center">
        {portrait ? (
          <div className="relative h-24 w-24">
            <div className="absolute -inset-2 animate-pulse-ring rounded-full border-2 border-accent/40 motion-reduce:animate-none" />
            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-white/[0.12]">
              <Image src={portrait.src} alt={persona.name} fill sizes="96px" className="object-cover" priority />
            </div>
          </div>
        ) : (
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/[0.12] border-t-accent motion-reduce:animate-none" />
        )}
        <p className="mt-8 font-mono text-[11px] font-medium tracking-label text-accent">CONNECTING</p>
        <h1 className="mt-3 font-display text-[26px] font-bold tracking-[-0.03em] text-text-primary">
          {persona.firstName} is joining the room...
        </h1>
        <p className="mt-2 font-sans text-[13px] text-text-tertiary">Usually 5–10 seconds.</p>
      </div>
    </div>
  );
}

function LiveScreen({
  persona,
  conversationUrl,
  elapsedSeconds,
  onEnd,
}: {
  persona: TavusSessionViewPersona;
  session: TavusSessionViewSession;
  conversationUrl: string;
  elapsedSeconds: number;
  onEnd: () => void;
}) {
  const portrait = AGENT_PORTRAITS[persona.id];

  return (
    <div className="fixed inset-0 flex flex-col bg-ink">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-ink px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <p className="font-mono text-[11px] font-medium tracking-label text-accent">LIVE</p>
          <div className="flex items-center gap-2">
            {portrait && (
              <span className="relative h-5 w-5 overflow-hidden rounded-full border border-white/[0.12]">
                <Image src={portrait.src} alt="" fill sizes="20px" className="object-cover" />
              </span>
            )}
            <p className="font-sans text-[12px] text-text-secondary">
              {persona.name} · {persona.firm}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-mono text-[13px] tabular-nums text-text-primary">
            {formatTime(elapsedSeconds)}
          </p>
          <button
            onClick={onEnd}
            className="inline-flex h-9 items-center rounded-full bg-red-500 px-4 font-sans text-[12px] font-semibold text-white transition-all duration-200 ease-brand hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            End call
          </button>
        </div>
      </div>

      {/* Tavus iframe */}
      <iframe
        src={conversationUrl}
        allow="camera *; microphone *; autoplay *; encrypted-media *; fullscreen *; display-capture *"
        className="flex-1 w-full border-0"
        title={`Interview with ${persona.name}`}
      />
    </div>
  );
}

function EndingScreen() {
  return (
    <div className="relative min-h-screen bg-gradient-dark">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[720px] flex-col items-center justify-center px-6 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/[0.12] border-t-accent motion-reduce:animate-none" />
        <p className="mt-8 font-mono text-[11px] font-medium tracking-label text-accent">WRAPPING UP</p>
        <h1 className="mt-3 font-display text-[26px] font-bold tracking-[-0.03em] text-text-primary">
          Saving your session...
        </h1>
        <p className="mt-2 font-sans text-[13px] text-text-tertiary">
          Feedback will be ready in about 30 seconds.
        </p>
      </div>
    </div>
  );
}

// ==========================================================================
// Helpers
// ==========================================================================

function describeError(code: string): string {
  switch (code) {
    case "tavus_not_configured":
      return "The interview service isn't configured. This is a deployment issue — check back soon.";
    case "persona_not_registered":
      return "This interviewer isn't set up yet. Try a different persona.";
    case "session_ended":
      return "This session has already ended.";
    case "not_found":
      return "Session not found.";
    default:
      if (code.startsWith("tavus_create_conversation_failed")) {
        return "Couldn't start the conversation. Try again.";
      }
      return "Something went wrong starting the session. Try again.";
  }
}

function humanMode(m: SessionMode): string {
  return { easy: "Easy", standard: "Standard", hard: "Hard" }[m];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
