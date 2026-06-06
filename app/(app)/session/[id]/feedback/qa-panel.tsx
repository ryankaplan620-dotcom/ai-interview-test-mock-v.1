"use client";

import { useEffect, useState } from "react";
import { scoreColorClass } from "@/lib/utils/score-color";

interface QaBoundary {
  method: "transition_detected" | "fallback_timestamp" | "absent";
  start_turn_index: number | null;
  start_seconds: number | null;
  candidate_questions_count: number;
}

interface QaQuestionBreakdown {
  question: string;
  signal: string;
  stronger_version: string;
  reasoning: string;
}

interface QaFeedback {
  id: string;
  session_id: string;
  overall_score: number;
  preparation_score: number;
  specificity_score: number;
  engagement_score: number;
  composure_score: number;
  summary: string;
  question_breakdown: QaQuestionBreakdown[];
  improvements: string[];
  questions_asked_count: number;
  created_at: string;
}

type QaState =
  | { kind: "loading" }
  | { kind: "pending" }
  | { kind: "absent"; boundary: QaBoundary }
  | { kind: "ready"; feedback: QaFeedback; boundary: QaBoundary }
  | { kind: "error"; message: string };

interface QaFeedbackPanelProps {
  sessionId: string;
  /** Initial state, server-rendered. Client takes over polling if pending. */
  initial?: QaState;
}

/**
 * Q&A feedback panel — Phase I.2 / Upgrade 08.
 *
 * Three display cases:
 *   - ABSENT: session was too short or no Q&A section was detected. Panel
 *     is not rendered at all (returns null) to avoid adding noise.
 *   - PENDING: Q&A analysis hasn't finished yet. Show a quiet loading state
 *     and poll every 3 seconds, giving up after ~60 seconds.
 *   - READY: render scores + summary + per-question breakdown + improvements.
 */
export function QaFeedbackPanel({ sessionId, initial }: QaFeedbackPanelProps) {
  const [state, setState] = useState<QaState>(initial ?? { kind: "loading" });

  useEffect(() => {
    // Only poll if we're in a state that warrants it
    if (state.kind !== "loading" && state.kind !== "pending") return;

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 20; // 20 × 3s = ~60 seconds of patience

    async function poll() {
      try {
        const res = await fetch("/api/feedback/qa/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) {
          if (!cancelled) setState({ kind: "error", message: "Couldn't load Q&A feedback." });
          return;
        }
        const body = (await res.json()) as
          | { status: "pending" }
          | { status: "absent"; boundary: QaBoundary }
          | { status: "ready"; feedback: QaFeedback; boundary: QaBoundary };

        if (cancelled) return;

        if (body.status === "ready") {
          setState({ kind: "ready", feedback: body.feedback, boundary: body.boundary });
        } else if (body.status === "absent") {
          setState({ kind: "absent", boundary: body.boundary });
        } else {
          // still pending
          attempts += 1;
          if (attempts >= MAX_ATTEMPTS) {
            setState({ kind: "error", message: "Q&A feedback is taking longer than expected." });
          } else {
            setState({ kind: "pending" });
            setTimeout(poll, 3000);
          }
        }
      } catch {
        if (!cancelled) setState({ kind: "error", message: "Network error loading Q&A feedback." });
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
    // sessionId is the only identity; state.kind transitions are intentional and
    // we don't want to re-poll just because state changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (state.kind === "absent") {
    // Session too short / no Q&A section — render nothing. No point in
    // showing an empty panel on a short practice session.
    return null;
  }

  if (state.kind === "error") {
    return (
      <section className="mt-8 rounded-2xl border border-ink-border bg-ink-surface px-8 py-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[20px] font-semibold text-text-primary">
            Q&A section
          </h2>
          <span className="font-mono text-[10px] tracking-label text-rose-400/80">ERROR</span>
        </div>
        <p className="mt-3 font-sans text-[13px] text-text-tertiary">{state.message}</p>
      </section>
    );
  }

  if (state.kind === "loading" || state.kind === "pending") {
    return (
      <section className="mt-8 rounded-2xl border border-ink-border bg-ink-surface px-8 py-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[20px] font-semibold text-text-primary">
            Q&A section
          </h2>
          <span className="font-mono text-[10px] tracking-label text-accent/80">ANALYSING</span>
        </div>
        <p className="mt-3 font-sans text-[13px] italic text-text-tertiary">
          Evaluating your end-of-interview questions…
        </p>
      </section>
    );
  }

  // Ready
  const { feedback } = state;
  const noQuestions = feedback.questions_asked_count === 0;

  return (
    <section className="mt-8 rounded-2xl border border-ink-border bg-ink-surface px-8 py-7">
      {/* Header row */}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-label text-accent/80">Q&A SECTION</p>
          <h2 className="mt-1 font-display text-[22px] font-semibold text-text-primary">
            Your end-of-interview questions
          </h2>
        </div>
        <div className="text-right">
          <p
            className={[
              "font-display font-semibold leading-none tabular-nums text-[40px]",
              scoreColorClass(feedback.overall_score),
            ].join(" ")}
          >
            {feedback.overall_score}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-label text-text-tertiary">
            {feedback.questions_asked_count === 0
              ? "NO QUESTIONS ASKED"
              : `${feedback.questions_asked_count} QUESTION${feedback.questions_asked_count === 1 ? "" : "S"}`}
          </p>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SubScoreCard label="Preparation" value={feedback.preparation_score} />
        <SubScoreCard label="Specificity" value={feedback.specificity_score} />
        <SubScoreCard label="Engagement" value={feedback.engagement_score} />
        <SubScoreCard label="Composure" value={feedback.composure_score} />
      </div>

      {/* Summary */}
      <p className="mt-6 font-serif text-[15px] italic leading-[1.6] text-text-secondary">
        {feedback.summary}
      </p>

      {/* Question breakdown — only when there are questions */}
      {!noQuestions && feedback.question_breakdown.length > 0 && (
        <div className="mt-7">
          <p className="font-mono text-[11px] tracking-label text-text-tertiary">
            WHAT YOU ASKED
          </p>
          <div className="mt-3 space-y-4">
            {feedback.question_breakdown.map((q, i) => (
              <QaQuestionCard key={i} entry={q} />
            ))}
          </div>
        </div>
      )}

      {/* Improvements */}
      {feedback.improvements.length > 0 && (
        <div className="mt-7">
          <p className="font-mono text-[11px] tracking-label text-text-tertiary">
            NEXT TIME
          </p>
          <ul className="mt-3 space-y-2">
            {feedback.improvements.map((s, i) => (
              <li
                key={i}
                className="flex gap-3 font-sans text-[14px] leading-[1.55] text-text-primary"
              >
                <span className="mt-[8px] h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function QaQuestionCard({ entry }: { entry: QaQuestionBreakdown }) {
  return (
    <div className="rounded-xl border border-ink-border bg-ink-raised px-5 py-4">
      <p className="font-serif text-[15px] italic leading-[1.55] text-text-primary">
        "{entry.question}"
      </p>
      <p className="mt-2 font-sans text-[13px] leading-[1.55] text-text-secondary">
        <span className="font-mono text-[10px] tracking-label text-text-tertiary">SIGNAL · </span>
        {entry.signal}
      </p>
      <div className="mt-3 border-t border-ink-border/40 pt-3">
        <p className="font-mono text-[10px] tracking-label text-accent/80">STRONGER</p>
        <p className="mt-1 font-sans text-[14px] leading-[1.55] text-text-primary">
          {entry.stronger_version}
        </p>
        <p className="mt-2 font-sans text-[13px] leading-[1.55] text-text-tertiary">
          {entry.reasoning}
        </p>
      </div>
    </div>
  );
}

function SubScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink-border bg-ink-raised px-3 py-2.5">
      <p className="font-mono text-[10px] tracking-label text-text-tertiary">
        {label.toUpperCase()}
      </p>
      <p className={[scoreColorClass(value), "mt-0.5 font-display text-[22px] font-semibold tabular-nums"].join(" ")}>
        {value}
      </p>
    </div>
  );
}

