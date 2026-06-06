"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { endSession } from "./actions";
import type { InterviewType, SessionMode, PersonaId } from "@/types/supabase";

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
  return (
    <div className="mx-auto flex min-h-screen max-w-[720px] flex-col items-center justify-center px-6 py-10 text-center sm:px-10">
      <p className="font-mono text-[11px] tracking-label text-accent">READY</p>
      <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-text-primary sm:text-[42px]">
        {persona.name} is ready to interview you.
      </h1>
      <p className="mt-3 max-w-[520px] font-serif text-[17px] italic leading-[1.55] text-text-secondary">
        {persona.title} at {persona.firm}. {Math.round(session.duration_seconds / 60)} minutes.{" "}
        {humanMode(session.mode)} difficulty.
      </p>

      <div className="mt-10 rounded-2xl border border-ink-border bg-ink-surface px-6 py-5 text-left">
        <p className="font-mono text-[10px] tracking-label text-text-tertiary">BEFORE YOU START</p>
        <ul className="mt-3 flex flex-col gap-2.5 font-sans text-[13px] leading-[1.55] text-text-secondary">
          <li>• Make sure your mic and camera work. You'll be asked to allow access when you join.</li>
          <li>• Find a quiet place. Background noise affects the interviewer's ability to respond.</li>
          <li>• Treat this like the real thing. Posture, pacing, the works.</li>
          <li>• Click End call when you're done. Feedback lands the moment you do.</li>
        </ul>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-rose-300/30 bg-rose-300/5 px-4 py-3 w-full max-w-[520px]">
          <p className="font-sans text-[13px] text-rose-300/90">{error}</p>
        </div>
      )}

      <button
        onClick={onStart}
        className="mt-10 rounded-full bg-accent px-8 py-3.5 font-sans text-[15px] font-semibold text-ink transition-all hover:bg-accent-light"
      >
        Join the interview →
      </button>
    </div>
  );
}

function ConnectingScreen({ persona }: { persona: TavusSessionViewPersona }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[720px] flex-col items-center justify-center px-6 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-ink-border border-t-accent" />
      <p className="mt-8 font-mono text-[11px] tracking-label text-accent">CONNECTING</p>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-text-primary">
        {persona.firstName} is joining the room...
      </h1>
      <p className="mt-2 font-sans text-[13px] text-text-tertiary">Usually 5–10 seconds.</p>
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
  return (
    <div className="fixed inset-0 flex flex-col bg-ink">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-ink-border bg-ink-surface px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
          <p className="font-mono text-[11px] tracking-label text-accent">LIVE</p>
          <p className="font-sans text-[12px] text-text-secondary">
            {persona.name} · {persona.firm}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-display text-[14px] font-semibold tabular-nums text-text-primary">
            {formatTime(elapsedSeconds)}
          </p>
          <button
            onClick={onEnd}
            className="rounded-full bg-rose-400/90 px-4 py-1.5 font-sans text-[12px] font-semibold text-ink transition-all hover:bg-rose-400"
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
    <div className="mx-auto flex min-h-screen max-w-[720px] flex-col items-center justify-center px-6 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-ink-border border-t-accent" />
      <p className="mt-8 font-mono text-[11px] tracking-label text-accent">WRAPPING UP</p>
      <h1 className="mt-2 font-display text-[26px] font-semibold text-text-primary">
        Saving your session...
      </h1>
      <p className="mt-2 font-sans text-[13px] text-text-tertiary">
        Feedback will be ready in about 30 seconds.
      </p>
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
