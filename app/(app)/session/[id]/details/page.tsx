export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { PERSONAS } from "@/lib/personas";
import { scoreColorClass } from "@/lib/utils/score-color";
import type {
  PersonaId,
  InterviewType,
  SessionMode,
  EmotionalState,
  ToneShift,
  KeyDiscussionPoint,
} from "@/types/supabase";

interface PageProps {
  params: { id: string };
}

export default async function SessionDetailsPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = createServerClient();

  // Load session + verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select(
      "id, user_id, persona, interview_type, mode, target_firm, target_role, duration_seconds, actual_duration_seconds, status, started_at, ended_at, recording_url",
    )
    .eq("id", params.id)
    .single();

  const session = sessionRaw as
    | {
        id: string;
        user_id: string;
        persona: PersonaId;
        interview_type: InterviewType;
        mode: SessionMode;
        target_firm: string | null;
        target_role: string | null;
        duration_seconds: number;
        actual_duration_seconds: number | null;
        status: string;
        started_at: string | null;
        ended_at: string | null;
        recording_url: string | null;
      }
    | null;

  if (!session || session.user_id !== user.id) notFound();

  // Load analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: analyticsRaw } = await (supabase.from("session_analytics") as any)
    .select("*")
    .eq("session_id", session.id)
    .maybeSingle();

  const analytics = analyticsRaw as {
    emotional_states: EmotionalState[] | null;
    tone_shifts: ToneShift[] | null;
    key_discussion_points: KeyDiscussionPoint[] | null;
    overall_sentiment: string | null;
    confidence_level: number | null;
    engagement_score: number | null;
    recording_url: string | null;
  } | null;

  // Load feedback score
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: feedbackRaw } = await (supabase.from("session_feedback") as any)
    .select("overall_score")
    .eq("session_id", session.id)
    .maybeSingle();

  const feedbackScore = (feedbackRaw as { overall_score: number | null } | null)?.overall_score ?? null;

  const persona = PERSONAS[session.persona];
  const recordingUrl = analytics?.recording_url ?? session.recording_url;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-10 sm:py-14">
      {/* Breadcrumb */}
      <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          href="/dashboard"
          className="font-sans text-[12px] text-text-tertiary transition-colors hover:text-text-secondary"
        >
          ← Dashboard
        </Link>
        <span className="font-mono text-[10px] text-text-tertiary">·</span>
        <Link
          href={`/session/${session.id}/feedback`}
          className="font-sans text-[12px] text-text-tertiary transition-colors hover:text-text-secondary"
        >
          Feedback
        </Link>
        <span className="font-mono text-[10px] text-text-tertiary">·</span>
        <span className="font-mono text-[11px] tracking-label text-text-tertiary">
          {session.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Header */}
      <header>
        <p className="font-mono text-[11px] tracking-label text-accent">SESSION DETAILS</p>
        <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-text-primary sm:text-[40px]">
          {persona.firstName} at {persona.firm}
        </h1>
        <p className="mt-2 font-sans text-[14px] text-text-secondary">
          {humanInterviewType(session.interview_type)} · {humanMode(session.mode)}
          {session.target_firm ? ` · targeting ${session.target_firm}` : ""}
          {session.actual_duration_seconds !== null
            ? ` · ${Math.round(session.actual_duration_seconds / 60)} min`
            : ""}
          {session.started_at
            ? ` · ${new Date(session.started_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}`
            : ""}
        </p>
      </header>

      {/* Three-column grid */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Column 1 — Perception Analysis */}
        <div className="space-y-4">
          <h2 className="font-mono text-[11px] tracking-label text-text-tertiary">
            PERCEPTION ANALYSIS
          </h2>

          {/* Overall sentiment */}
          {analytics?.overall_sentiment && (
            <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
              <p className="font-mono text-[10px] tracking-label text-text-tertiary">SENTIMENT</p>
              <p className="mt-2 font-sans text-[15px] leading-relaxed text-text-primary">
                {analytics.overall_sentiment}
              </p>
            </div>
          )}

          {/* Confidence meter */}
          <MeterCard
            label="CONFIDENCE"
            value={analytics?.confidence_level ?? null}
          />

          {/* Engagement meter */}
          <MeterCard
            label="ENGAGEMENT"
            value={analytics?.engagement_score ?? null}
          />

          {/* Emotional states timeline */}
          {analytics?.emotional_states && analytics.emotional_states.length > 0 && (
            <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
              <p className="font-mono text-[10px] tracking-label text-text-tertiary">
                EMOTIONAL STATES
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {analytics.emotional_states.map((state, i) => (
                  <EmotionPill key={i} state={state} />
                ))}
              </div>
            </div>
          )}

          {/* Tone shifts */}
          {analytics?.tone_shifts && analytics.tone_shifts.length > 0 && (
            <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
              <p className="font-mono text-[10px] tracking-label text-text-tertiary">
                TONE SHIFTS
              </p>
              <ul className="mt-3 space-y-2">
                {analytics.tone_shifts.map((shift, i) => (
                  <ToneShiftRow key={i} shift={shift} />
                ))}
              </ul>
            </div>
          )}

          {/* Empty state */}
          {!analytics && (
            <div className="rounded-xl border border-dashed border-ink-border bg-ink-surface/50 p-6 text-center">
              <p className="font-sans text-[13px] text-text-tertiary">
                No perception data available for this session.
              </p>
            </div>
          )}
        </div>

        {/* Column 2 — Key Discussion Points */}
        <div className="space-y-4">
          <h2 className="font-mono text-[11px] tracking-label text-text-tertiary">
            KEY DISCUSSION POINTS
          </h2>

          {analytics?.key_discussion_points && analytics.key_discussion_points.length > 0 ? (
            analytics.key_discussion_points.map((point, i) => (
              <DiscussionPointCard key={i} point={point} />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-ink-border bg-ink-surface/50 p-6 text-center">
              <p className="font-sans text-[13px] text-text-tertiary">
                No discussion points captured.
              </p>
            </div>
          )}
        </div>

        {/* Column 3 — Session Info */}
        <div className="space-y-4">
          <h2 className="font-mono text-[11px] tracking-label text-text-tertiary">
            SESSION INFO
          </h2>

          {/* Recording player */}
          {recordingUrl && (
            <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
              <p className="font-mono text-[10px] tracking-label text-text-tertiary">RECORDING</p>
              <div className="mt-3">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  src={recordingUrl}
                  controls
                  preload="metadata"
                  className="w-full rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Folio Score */}
          {feedbackScore !== null && (
            <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
              <p className="font-mono text-[10px] tracking-label text-text-tertiary">FOLIO SCORE</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p
                  className={[
                    "font-display text-[40px] font-bold leading-none tracking-[-0.03em] tabular-nums",
                    scoreColorClass(feedbackScore),
                  ].join(" ")}
                >
                  {feedbackScore}
                </p>
                <p className="font-mono text-[11px] tracking-label text-text-tertiary">/100</p>
              </div>
            </div>
          )}

          {/* Session metadata */}
          <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
            <p className="font-mono text-[10px] tracking-label text-text-tertiary">DETAILS</p>
            <dl className="mt-3 space-y-3">
              <MetaRow label="Persona" value={persona.name} />
              <MetaRow label="Firm" value={persona.firm} />
              <MetaRow label="Interview type" value={humanInterviewType(session.interview_type)} />
              <MetaRow label="Mode" value={humanMode(session.mode)} />
              {session.actual_duration_seconds !== null && (
                <MetaRow
                  label="Duration"
                  value={`${Math.round(session.actual_duration_seconds / 60)} min`}
                />
              )}
              {session.started_at && (
                <MetaRow
                  label="Date"
                  value={new Date(session.started_at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                />
              )}
              <MetaRow label="Status" value={session.status.replace("_", " ")} />
            </dl>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2">
            <Link
              href={`/session/${session.id}/insights`}
              className="rounded-xl border border-accent/40 bg-accent/5 px-5 py-3 text-center font-sans text-[13px] font-medium text-accent transition-all hover:border-accent/60"
            >
              View detailed insights →
            </Link>
            <Link
              href={`/session/${session.id}/feedback`}
              className="rounded-xl border border-ink-border bg-ink-surface px-5 py-3 text-center font-sans text-[13px] font-medium text-text-primary transition-all hover:border-accent/60"
            >
              View feedback →
            </Link>
            <Link
              href="/session/new"
              className="rounded-xl bg-cta-gradient px-5 py-3 text-center font-sans text-[13px] font-semibold text-brand-ink transition-all hover:shadow-accent-glow"
            >
              Start new session →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Sub-components
// ==========================================================================

function MeterCard({ label, value }: { label: string; value: number | null }) {
  const pct = value !== null ? Math.round(value * 100) : null;

  return (
    <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] tracking-label text-text-tertiary">{label}</p>
        {pct !== null && (
          <p className="font-mono text-[11px] tabular-nums text-text-secondary">{pct}%</p>
        )}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-border">
        {pct !== null ? (
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-full w-0 rounded-full bg-accent" />
        )}
      </div>
      {pct === null && (
        <p className="mt-2 font-sans text-[11px] text-text-tertiary">No data</p>
      )}
    </div>
  );
}

function EmotionPill({ state }: { state: EmotionalState }) {
  const borderColor =
    state.intensity > 0.7
      ? "border-l-accent"
      : state.intensity > 0.4
        ? "border-l-amber-300"
        : "border-l-rose-300";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded border border-ink-border border-l-2 bg-ink-raised/40 px-2 py-1 font-mono text-[11px] text-text-primary",
        borderColor,
      ].join(" ")}
    >
      {state.emotion}
      <span className="text-text-tertiary">
        {Math.round(state.intensity * 100)}%
      </span>
      {state.timestamp_seconds !== undefined && (
        <span className="text-text-tertiary">
          {formatTimestamp(state.timestamp_seconds)}
        </span>
      )}
    </span>
  );
}

function ToneShiftRow({ shift }: { shift: ToneShift }) {
  return (
    <li className="flex items-center gap-2 font-sans text-[13px]">
      <span className="text-text-secondary">{shift.from}</span>
      <span className="text-text-tertiary">→</span>
      <span className="text-text-primary">{shift.to}</span>
      <span className="ml-auto font-mono text-[10px] text-text-tertiary">
        {formatTimestamp(shift.at_seconds)}
      </span>
    </li>
  );
}

function DiscussionPointCard({ point }: { point: KeyDiscussionPoint }) {
  const sentimentClass =
    point.sentiment === "positive"
      ? "border-accent/30 bg-accent/5 text-accent"
      : point.sentiment === "negative"
        ? "border-rose-300/30 bg-rose-300/5 text-rose-300/90"
        : "border-ink-border bg-ink-raised/40 text-text-secondary";

  return (
    <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-sans text-[14px] font-medium text-text-primary">{point.topic}</p>
        <span
          className={[
            "flex-shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-label",
            sentimentClass,
          ].join(" ")}
        >
          {point.sentiment.toUpperCase()}
        </span>
      </div>
      {point.details && (
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-text-secondary">
          {point.details}
        </p>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="font-sans text-[12px] text-text-tertiary">{label}</dt>
      <dd className="text-right font-sans text-[13px] text-text-primary">{value}</dd>
    </div>
  );
}

// ==========================================================================
// Formatting helpers
// ==========================================================================

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
