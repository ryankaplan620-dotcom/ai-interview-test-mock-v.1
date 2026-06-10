"use client";

import Link from "next/link";
import type { FeedbackPayload, FeedbackQuote } from "@/lib/pipeline/feedback-types";
import type { InterviewType, SessionMode } from "@/types/supabase";
import { QaFeedbackPanel } from "./qa-panel";

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
          className="font-sans text-[12px] text-text-tertiary transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
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
        <p className="font-mono text-[11px] tracking-label text-accent">SESSION FEEDBACK</p>
        <h1 className="mt-3 font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.03em] text-text-primary sm:text-[42px]">
          {sessionMeta.personaFirstName} at {sessionMeta.personaFirm}
        </h1>
        <p className="mt-3 font-sans text-[14px] text-text-secondary">
          {humanInterviewType(sessionMeta.interviewType)} · {humanMode(sessionMeta.mode)}
          {sessionMeta.targetFirm ? ` · targeting ${sessionMeta.targetFirm}` : ""}
          {sessionMeta.actualDurationSeconds !== null
            ? ` · ${Math.round(sessionMeta.actualDurationSeconds / 60)} min`
            : ""}
        </p>
      </header>

      {/* Score hero — the Folio scorecard */}
      <section className="relative mt-10 overflow-hidden rounded-2xl border border-ink-border bg-ink-surface px-8 py-10 sm:px-10">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/[0.06] blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-10 sm:flex-row sm:items-center sm:justify-between">
          {/* Overall numeral */}
          <div>
            <p className="font-mono text-[11px] tracking-label text-text-tertiary">OVERALL SCORE</p>
            <div className="mt-2 flex items-baseline gap-3">
              <p className="text-gradient-mint font-display text-[96px] font-extrabold leading-none tracking-[-0.03em] tabular-nums sm:text-[120px]">
                {feedback.overall_score}
              </p>
              <span className="font-mono text-[13px] text-text-tertiary">/ 100</span>
            </div>
            <p className="mt-3 inline-flex items-center gap-2 font-sans text-[13px] font-medium text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              {scoreLabel(feedback.overall_score)}
            </p>
          </div>

          {/* Dimension breakdown */}
          <div className="flex w-full flex-col gap-5 sm:w-auto sm:min-w-[320px] sm:max-w-[360px]">
            <ScoreRow label="Structure" value={feedback.structure_score} />
            <ScoreRow label="Specificity" value={feedback.specificity_score} />
            <ScoreRow label="Delivery" value={feedback.delivery_score} />
          </div>
        </div>

        {/* Summary prose */}
        {feedback.summary && (
          <p className="relative mt-9 border-t border-ink-border pt-7 font-sans text-[16px] leading-[1.65] text-text-secondary">
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
          <h2 className="font-display text-[24px] font-bold tracking-heading text-text-primary">
            Moments that matter
          </h2>
          <p className="mt-1 font-sans text-[13px] text-text-secondary">
            Specific turns where a small change would've landed harder.
          </p>
          <div className="mt-6 flex flex-col gap-5">
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
          className="inline-flex items-center gap-1 font-sans text-[13px] font-medium text-accent transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          View detailed insights →
        </Link>
        <Link
          href={`/session/${sessionMeta.id}/details`}
          className="inline-flex items-center gap-1 font-sans text-[12px] text-text-tertiary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
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
            className="rounded-full bg-cta-gradient px-5 py-2.5 font-sans text-[13px] font-semibold text-brand-ink transition-all hover:shadow-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Start another session →
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-ink-border bg-ink-surface px-5 py-2.5 font-sans text-[13px] text-text-primary transition-all hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
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

function ScoreRow({ label, value }: { label: string; value: number }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[10px] tracking-label text-text-tertiary">
          {label.toUpperCase()}
        </p>
        <p className="font-display text-[20px] font-bold leading-none tabular-nums text-text-primary">
          {value}
        </p>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${width}%` }}
        />
      </div>
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
    <article className="overflow-hidden rounded-2xl border border-ink-border bg-ink-surface">
      {/* What you said */}
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            What you said
          </span>
          {typeof quote.timestamp_seconds === "number" && (
            <span className="font-mono text-[10px] tracking-label text-text-tertiary">
              {formatTimestamp(quote.timestamp_seconds)}
            </span>
          )}
        </div>
        <p className="mt-3 font-sans text-[15px] italic leading-[1.6] text-text-secondary">
          &ldquo;{quote.user_quote}&rdquo;
        </p>
      </div>

      {/* Connector */}
      <div className="relative flex items-center justify-center border-y border-ink-border/60 bg-ink-raised/40 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-brand-ink shadow-accent-glow">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M8 3v10M8 13l-3.5-3.5M8 13l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {/* The stronger version */}
      <div className="bg-accent/[0.04] p-6 sm:p-7">
        <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
          The stronger version
        </span>
        <p className="mt-3 font-sans text-[15px] font-medium leading-[1.6] text-text-primary">
          {quote.stronger_version}
        </p>
        <div className="mt-5 border-t border-ink-border/50 pt-4">
          <p className="font-mono text-[10px] tracking-label text-text-tertiary">WHY</p>
          <p className="mt-1.5 font-sans text-[13px] leading-[1.6] text-text-secondary">
            {quote.reasoning}
          </p>
        </div>
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
