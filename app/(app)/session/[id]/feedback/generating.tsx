"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackPayload } from "@/lib/pipeline/feedback-types";
import { FeedbackView, type SessionMeta } from "./feedback-view";

interface Props {
  sessionId: string;
  sessionMeta: SessionMeta;
}

type Phase = "generating" | "ready" | "error";

const STAGES = [
  "Reading transcript",
  "Analyzing structure",
  "Checking specificity",
  "Drafting coaching moments",
  "Finalizing",
];

export function FeedbackGenerating({ sessionId, sessionMeta }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("generating");
  const [feedback, setFeedback] = useState<FeedbackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const startedRef = useRef(false);

  // Trigger generation on mount and on explicit retry
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/feedback/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const body = (await res.json().catch(() => null)) as
          | { feedback?: unknown; error?: string }
          | null;

        if (cancelled) return;

        if (!res.ok || !body?.feedback) {
          setError(body?.error ?? `Request failed (${res.status})`);
          setPhase("error");
          return;
        }

        // The API returns the DB row shape — coerce to FeedbackPayload
        const row = body.feedback as Record<string, unknown>;
        setFeedback({
          overall_score: (row.overall_score as number) ?? 0,
          structure_score: (row.structure_score as number) ?? 0,
          specificity_score: (row.specificity_score as number) ?? 0,
          delivery_score: (row.delivery_score as number) ?? 0,
          summary: (row.summary as string) ?? "",
          strengths: (row.strengths as string[]) ?? [],
          improvements: (row.improvements as string[]) ?? [],
          feedback_quotes: (row.feedback_quotes as FeedbackPayload["feedback_quotes"]) ?? [],
        });
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("[feedback.generating] fetch failed:", err);
        setError("Connection error. Check your network and try again.");
        setPhase("error");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [sessionId, retryCount]);

  // Cycle through stage labels while generating
  useEffect(() => {
    if (phase !== "generating") return;
    const interval = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, STAGES.length - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === "ready" && feedback) {
    return <FeedbackView feedback={feedback} sessionMeta={sessionMeta} />;
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-16 sm:px-10">
        <p className="font-mono text-[11px] tracking-label text-rose-300/80">FEEDBACK FAILED</p>
        <h1 className="mt-4 font-display text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-text-primary sm:text-[32px]">
          We couldn&rsquo;t generate feedback for this session.
        </h1>
        <p className="mt-3 font-sans text-[14px] leading-[1.6] text-text-secondary">
          {error ?? "Unknown error."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => {
              startedRef.current = false;
              setError(null);
              setPhase("generating");
              setStageIdx(0);
              setRetryCount((c) => c + 1);
            }}
            className="rounded-full bg-accent px-5 py-2.5 font-sans text-[13px] font-semibold text-brand-ink transition-all hover:bg-accent-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-full border border-ink-border bg-ink-surface px-5 py-2.5 font-sans text-[13px] text-text-primary transition-all hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  // Generating state — cosmos cover moment
  return (
    <div className="mx-auto max-w-[880px] px-6 py-10 sm:px-10 sm:py-14">
      <div className="bg-gradient-dark relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] px-6 py-20 text-center">
        {/* Mint pulse */}
        <div className="relative flex h-14 w-14 items-center justify-center" aria-hidden>
          <span className="absolute inset-0 animate-pulse-ring rounded-full border border-accent/40 motion-reduce:animate-none" />
          <span className="absolute inset-2 rounded-full bg-accent/10" />
          <span className="h-3 w-3 rounded-full bg-accent shadow-accent-glow" />
        </div>

        <p className="mt-9 font-mono text-[11px] tracking-label text-accent">
          FEEDBACK IN PROGRESS
        </p>
        <h1 className="mt-3 font-display text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-text-primary sm:text-[32px]">
          Reviewing your session with {sessionMeta.personaFirstName}
        </h1>

        {/* Mono status line */}
        <div className="mt-7 flex h-5 items-center justify-center" aria-live="polite">
          <p
            key={stageIdx}
            className="animate-fade-in font-mono text-[12px] tracking-[0.08em] text-text-secondary"
          >
            {STAGES[stageIdx]}&hellip;
          </p>
        </div>

        <p className="mt-10 max-w-[460px] font-sans text-[13px] leading-[1.6] text-text-tertiary">
          Usually 15-30 seconds. We&rsquo;re reading the transcript carefully and
          drafting feedback that points to specific moments instead of generic advice.
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
