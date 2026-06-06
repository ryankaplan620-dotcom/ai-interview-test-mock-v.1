"use client";

import Link from "next/link";
import type { FeedbackPayload, FeedbackQuote } from "@/lib/pipeline/feedback-types";
import type { InterviewType, SessionMode } from "@/types/supabase";
import { QaFeedbackPanel } from "./qa-panel";
import { scoreColorClass } from "@/lib/utils/score-color";

export interface SessionMeta {
  id: string;
  personaName: string;
  personaFirstName: string;
  personaFirm: string;
  interviewType: InterviewType;
  mode: SessionMode;
  targetFirm: string | null;
  targetRole: string | null;
  durationSeconds: number;
  actualDurationSeconds: number | null;
  endedAt: string | null;
}

interface FeedbackViewProps {
  feedback: FeedbackPayload;
  sessionMeta: SessionMeta;
}

export function FeedbackView({ feedback, sessionMeta }: FeedbackViewProps) {
  return (
    <div className="mx-auto max-w-[880px] px-6 py-10 sm:px-10 sm:py-14">
      {/* Context strip */}
      <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          href="/dashboard"
          className="font-sans text-[12px] text-text-tertiary transition-colors hover:text-text-secondary"
        >
          ← Dashboard
        </Link>
        <span className="font-mono text-[10px] text-text-tertiary">·</span>
        <span className="font-mono text-[11px] tracking-label text-text-tertiary">
          {sessionMeta.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Header */}
      <header>
        <p className="font-mono text-[11px] tracking-label text-accent/80">SESSION FEEDBACK</p>
        <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.1] text-text-primary sm:text-[40px]">
          {sessionMeta.personaFirstName} at {sessionMeta.personaFirm}
        </h1>
        <p className="mt-2 font-sans text-[14px] text-text-secondary">
          {humanInterviewType(sessionMeta.interviewType)} · {humanMode(sessionMeta.mode)}
          {sessionMeta.targetFirm ? ` · targeting ${sessionMeta.targetFirm}` : ""}
          {sessionMeta.actualDurationSeconds !== null
            ? ` · ${Math.round(sessionMeta.actualDurationSeconds / 60)} min`
            : ""}
        </p>
      </header>

      {/* Score hero */}
      <section className="mt-10 rounded-2xl border border-ink-border bg-ink-surface px-8 py-10">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-label text-text-tertiary">OVERALL</p>
            <p
              className={[
                "mt-1 font-display font-semibold leading-none tabular-nums",
                "text-[84px] sm:text-[112px]",
                scoreColorClass(feedback.overall_score),
              ].join(" ")}
            >
              {feedback.overall_score}
            </p>
            <p className="mt-1 font-sans text-[13px] text-text-secondary">
              {scoreLabel(feedback.overall_score)}
            </p>
          </div>

          {/* Sub-score breakdown */}
          <div className="grid w-full grid-cols-3 gap-3 sm:w-auto sm:min-w-[420px]">
            <SubScoreCard label="Structure" value={feedback.structure_score} />
            <SubScoreCard label="Specificity" value={feedback.specificity_score} />
            <SubScoreCard label="Delivery" value={feedback.delivery_score} />
          </div>
        </div>

        {/* Summary prose */}
        {feedback.summary && (
          <p className="mt-8 border-t border-ink-border pt-6 font-serif text-[17px] italic leading-[1.55] text-text-primary">
            {feedback.summary}
          </p>
        )}
      </section>

      {/* Strengths + Improvements */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <ListBlock
          label="Strengths"
          accentClass="text-accent"
          items={feedback.strengths}
        />
        <ListBlock
          label="Work on"
          accentClass="text-amber-300/90"
          items={feedback.improvements}
        />
      </section>

      {/* Quote-based coaching */}
      {feedback.feedback_quotes.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-[22px] font-semibold text-text-primary">
            Moments that matter
          </h2>
          <p className="mt-1 font-sans text-[13px] text-text-secondary">
            Specific turns where a small change would've landed harder.
          </p>
          <div className="mt-6 flex flex-col gap-4">
            {feedback.feedback_quotes.map((q, i) => (
              <QuoteCard key={i} quote={q} />
            ))}
          </div>
        </section>
      )}

      {/* Q&A section — Phase I.2 / Upgrade 08 */}
      {/* Panel self-renders based on its internal polling state. Returns null
          for sessions with no Q&A section (too short or no transition detected),
          so we don't need a conditional wrapper here. */}
      <QaFeedbackPanel sessionId={sessionMeta.id} />

      {/* Full analytics link */}
      <section className="mt-10 flex flex-col items-center gap-3">
        <Link
          href={`/session/${sessionMeta.id}/insights`}
          className="inline-flex items-center gap-1 font-sans text-[13px] font-medium text-accent transition-opacity hover:opacity-80"
        >
          View detailed insights →
        </Link>
        <Link
          href={`/session/${sessionMeta.id}/details`}
          className="inline-flex items-center gap-1 font-sans text-[12px] text-text-tertiary transition-opacity hover:opacity-80"
        >
          View full analytics →
        </Link>
      </section>

      {/* CTA */}
      <section className="mt-10 flex flex-col items-start gap-3 border-t border-ink-border pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-[14px] text-text-secondary">
          Ready to run it back?
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/session/new"
            className="rounded-full bg-accent px-5 py-2.5 font-sans text-[13px] font-semibold text-ink transition-all hover:bg-accent-light"
          >
            Start another session →
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-ink-border bg-ink-surface px-5 py-2.5 font-sans text-[13px] text-text-primary transition-all hover:border-accent/60"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

// ==========================================================================
// Sub-components
// ==========================================================================

function SubScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ink-border/60 bg-ink-raised/40 px-4 py-3">
      <p className="font-mono text-[10px] tracking-label text-text-tertiary">
        {label.toUpperCase()}
      </p>
      <p
        className={[
          "mt-1 font-display text-[28px] font-semibold leading-none tabular-nums",
          scoreColorClass(value),
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function ListBlock({
  label,
  accentClass,
  items,
}: {
  label: string;
  accentClass: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-surface px-6 py-6">
      <p className={["font-mono text-[11px] tracking-label", accentClass].join(" ")}>
        {label.toUpperCase()}
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span
              className={["mt-2 h-1 w-1 flex-shrink-0 rounded-full", accentClass].join(" ")}
              style={{ backgroundColor: "currentColor" }}
              aria-hidden
            />
            <p className="font-sans text-[14px] leading-[1.6] text-text-primary">{s}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuoteCard({ quote }: { quote: FeedbackQuote }) {
  return (
    <article className="rounded-2xl border border-ink-border bg-ink-surface p-6">
      {typeof quote.timestamp_seconds === "number" && (
        <p className="font-mono text-[10px] tracking-label text-text-tertiary">
          {formatTimestamp(quote.timestamp_seconds)}
        </p>
      )}

      <blockquote className="mt-2 border-l-2 border-ink-border pl-4">
        <p className="font-serif text-[15px] italic leading-[1.55] text-text-secondary">
          &ldquo;{quote.user_quote}&rdquo;
        </p>
      </blockquote>

      <div className="mt-5">
        <p className="font-mono text-[10px] tracking-label text-accent/80">STRONGER VERSION</p>
        <p className="mt-1.5 font-sans text-[15px] leading-[1.6] text-text-primary">
          {quote.stronger_version}
        </p>
      </div>

      <div className="mt-4">
        <p className="font-mono text-[10px] tracking-label text-text-tertiary">WHY</p>
        <p className="mt-1.5 font-sans text-[13px] leading-[1.55] text-text-secondary">
          {quote.reasoning}
        </p>
      </div>
    </article>
  );
}

// ==========================================================================
// Formatting helpers
// ==========================================================================

function scoreLabel(v: number): string {
  if (v >= 90) return "Exceptional";
  if (v >= 80) return "Strong";
  if (v >= 70) return "Solid";
  if (v >= 60) return "Developing";
  if (v >= 45) return "Rough";
  return "Needs work";
}

function humanInterviewType(t: InterviewType): string {
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

function humanMode(m: SessionMode): string {
  const map: Record<SessionMode, string> = {
    easy: "Easy",
    standard: "Standard",
    hard: "Hard",
  };
  return map[m];
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
