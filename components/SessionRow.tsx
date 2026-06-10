import Link from "next/link";
import type { SessionStatus, PersonaId, InterviewType } from "@/types/supabase";

// ==========================================================================
// Types
// ==========================================================================

export interface SessionRowData {
  id: string;
  persona: PersonaId;
  interview_type: InterviewType;
  target_firm: string | null;
  status: SessionStatus;
  started_at: string | null;
  actual_duration_seconds: number | null;
  /** Optional — populated via join when feedback exists for this session. */
  overallScore: number | null;
}

// ==========================================================================
// Component
// ==========================================================================

export function SessionRow({ session }: { session: SessionRowData }) {
  const href = hrefForSession(session.status, session.id);
  const isMuted = session.status === "abandoned" || session.status === "failed";

  return (
    <Link
      href={href}
      className={[
        "flex items-center justify-between gap-4 bg-ink-surface px-5 py-4 transition-colors hover:bg-ink-raised",
        isMuted ? "opacity-70 hover:opacity-100" : "",
      ].join(" ")}
    >
      {/* Left: session description */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[14px] font-medium text-text-primary">
          {personaLabel(session.persona)}
          {session.target_firm ? ` · ${session.target_firm}` : ""}
        </p>
        <p className="mt-0.5 truncate font-sans text-[12px] text-text-tertiary">
          {formatInterviewType(session.interview_type)} · {formatDuration(session)}
          {session.started_at ? ` · ${formatRelativeDate(session.started_at)}` : ""}
        </p>
      </div>

      {/* Right: score badge OR status pill, and details link */}
      <div className="flex flex-shrink-0 items-center gap-3">
        {session.status === "completed" && session.overallScore !== null ? (
          <ScoreBadge score={session.overallScore} />
        ) : (
          <StatusPill status={session.status} />
        )}
        {session.status === "completed" && (
          <>
            <Link
              href={`/session/${session.id}/insights`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-[10px] tracking-label text-accent/70 transition-colors hover:text-accent"
              title="View session insights"
            >
              Insights
            </Link>
            <Link
              href={`/session/${session.id}/details`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-[10px] tracking-label text-text-tertiary transition-colors hover:text-accent"
              title="View session details"
            >
              Details
            </Link>
          </>
        )}
      </div>
    </Link>
  );
}

// ==========================================================================
// Sub-components
// ==========================================================================

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColorClass(score);
  return (
    <div className="flex items-baseline gap-1">
      <span className={["font-display text-[22px] font-semibold tabular-nums leading-none", color].join(" ")}>
        {score}
      </span>
      <span className="font-mono text-[10px] tracking-label text-text-tertiary">/100</span>
    </div>
  );
}

function StatusPill({ status }: { status: SessionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium tracking-label",
        config.className,
      ].join(" ")}
    >
      {config.dotClass && (
        <span
          className={["h-1.5 w-1.5 rounded-full", config.dotClass, config.animate ? "animate-pulse" : ""].join(" ")}
          aria-hidden
        />
      )}
      {config.label}
    </span>
  );
}

// ==========================================================================
// Config + helpers
// ==========================================================================

const STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; className: string; dotClass?: string; animate?: boolean }
> = {
  in_progress: {
    label: "LIVE",
    className: "border-accent/30 bg-accent/5 text-accent",
    dotClass: "bg-accent",
    animate: true,
  },
  scheduled: {
    label: "SCHEDULED",
    className: "border-ink-border bg-ink-raised/40 text-text-secondary",
    dotClass: "bg-text-tertiary",
  },
  completed: {
    // Only shown when overall_score is null (feedback not generated yet)
    label: "ANALYZING",
    className: "border-accent/20 bg-accent/5 text-accent/80",
    dotClass: "bg-accent/80",
    animate: true,
  },
  abandoned: {
    label: "ABANDONED",
    className: "border-amber-300/20 bg-amber-300/5 text-amber-300/90",
    dotClass: "bg-amber-300/70",
  },
  failed: {
    label: "FAILED",
    className: "border-rose-300/20 bg-rose-300/5 text-rose-300/90",
    dotClass: "bg-rose-300/70",
  },
};

function hrefForSession(status: SessionStatus, id: string): string {
  // Live sessions resume in the call room; everything terminal goes to feedback
  if (status === "in_progress" || status === "scheduled") return `/session/${id}`;
  return `/session/${id}/feedback`;
}

function scoreColorClass(v: number): string {
  if (v >= 85) return "text-accent";
  if (v >= 70) return "text-text-primary";
  if (v >= 55) return "text-amber-300/90";
  return "text-rose-300/90";
}

function personaLabel(p: PersonaId): string {
  const map: Record<PersonaId, string> = {
    sarah: "Sarah Chen",
    gemma: "Gemma Brooks",
  };
  return map[p] ?? p;
}

function formatInterviewType(t: InterviewType): string {
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

function formatDuration(session: SessionRowData): string {
  if (session.status === "in_progress" || session.status === "scheduled") {
    return "In progress";
  }
  if (session.actual_duration_seconds !== null && session.actual_duration_seconds > 0) {
    const mins = Math.round(session.actual_duration_seconds / 60);
    return `${mins} min`;
  }
  return "—";
}

function formatRelativeDate(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
