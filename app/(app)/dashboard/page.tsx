export const dynamic = "force-dynamic";
import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@/lib/db/server";
import { requireUser, getUserTier, getProfile } from "@/lib/auth/server";
import { TIERS } from "@/lib/tiers";
import { LinkButton } from "@/components/Button";
import { SessionRow, type SessionRowData } from "@/components/SessionRow";
import { scoreColorClass } from "@/lib/utils/score-color";
import type { SessionStatus, PersonaId, InterviewType } from "@/types/supabase";

// Supabase nested selects return joined rows as an array regardless of cardinality.
// session_feedback has unique(session_id) from migration 0004, so the array is always 0 or 1.
interface SessionWithFeedbackRaw {
  id: string;
  persona: PersonaId;
  interview_type: InterviewType;
  target_firm: string | null;
  status: SessionStatus;
  started_at: string | null;
  actual_duration_seconds: number | null;
  session_feedback: Array<{ overall_score: number | null }> | null;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const tier = await getUserTier();
  const supabase = await createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionsRaw } = await (supabase.from("sessions") as any)
    .select(
      `id, persona, interview_type, target_firm, status, started_at, actual_duration_seconds,
       session_feedback ( overall_score )`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const sessions: SessionRowData[] = ((sessionsRaw ?? []) as SessionWithFeedbackRaw[]).map((s) => ({
    id: s.id,
    persona: s.persona,
    interview_type: s.interview_type,
    target_firm: s.target_firm,
    status: s.status,
    started_at: s.started_at,
    actual_duration_seconds: s.actual_duration_seconds,
    overallScore: s.session_feedback?.[0]?.overall_score ?? null,
  }));

  const tierConfig = tier ? TIERS[tier.effective_tier] : TIERS.free;
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  // Average score across completed sessions with feedback
  const scoredSessions = sessions.filter((s) => s.overallScore !== null);
  const averageScore =
    scoredSessions.length > 0
      ? Math.round(
          scoredSessions.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / scoredSessions.length,
        )
      : null;

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-12 sm:px-10">
      {/* Greeting */}
      <div className="mb-12">
        <span className="font-mono text-[11px] font-medium tracking-label text-accent">
          DASHBOARD
        </span>
        <h1 className="mt-3 font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary sm:text-[44px]">
          Hello, {firstName}.
        </h1>
        <p className="mt-3 max-w-xl font-sans text-[16px] leading-relaxed tracking-body text-text-secondary">
          {scoredSessions.length > 0
            ? `You've completed ${scoredSessions.length} session${scoredSessions.length === 1 ? "" : "s"}.`
            : "Your next interview is already on the calendar."}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-8">
          {/* Primary CTA cards — interview + drill */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Full interview card */}
            <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-ink-surface to-ink-raised p-7">
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-accent/10 blur-3xl"
                aria-hidden
              />
              <div className="relative">
                <span className="font-mono text-[10px] font-medium tracking-label text-accent">
                  FULL INTERVIEW
                </span>
                <h2 className="mt-3 font-display text-[22px] font-bold leading-tight tracking-heading text-text-primary">
                  Run a full session.
                </h2>
                <p className="mt-2 font-sans text-[14px] leading-relaxed text-text-secondary">
                  Pick a persona. Pick a firm. Real interview. Feedback the moment you end the call.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <LinkButton href="/session/new" size="md">
                    Start interview →
                  </LinkButton>
                </div>
              </div>
            </div>

            {/* Drill card */}
            <div className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink-surface p-7">
              <div className="relative">
                <span className="font-mono text-[10px] font-medium tracking-label text-text-tertiary">
                  DRILL
                </span>
                <h2 className="mt-3 font-display text-[22px] font-bold leading-tight tracking-heading text-text-primary">
                  Polish one answer.
                </h2>
                <p className="mt-2 font-sans text-[14px] leading-relaxed text-text-secondary">
                  Five reps on one behavioral question. Between each, what worked and what didn't. Converge on tight.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <LinkButton href="/practice" variant="secondary" size="md">
                    Pick a drill →
                  </LinkButton>
                </div>
              </div>
            </div>
          </div>

          {/* Session history */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[20px] font-bold tracking-heading text-text-primary">
                Recent sessions
              </h3>
              {sessions.length >= 10 && (
                <Link
                  href="/sessions"
                  className="rounded-full font-sans text-[13px] font-medium text-text-secondary transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  View all →
                </Link>
              )}
            </div>

            {sessions.length > 0 ? (
              <ul className="divide-y divide-white/[0.08] overflow-hidden rounded-2xl border border-ink-border">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <SessionRow session={session} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-dark p-12 text-center">
                <div
                  className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
                  aria-hidden
                />
                <div className="relative">
                  <span className="font-mono text-[10px] font-medium tracking-label text-accent">
                    SESSION 001
                  </span>
                  <p className="mx-auto mt-3 max-w-sm font-sans text-[14px] leading-relaxed text-text-secondary">
                    No sessions yet. Your first practice is one click away.
                  </p>
                  <LinkButton href="/session/new" size="sm" className="mt-5">
                    Start your first session →
                  </LinkButton>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Average score (only shown after first scored session) */}
          {averageScore !== null && (
            <div className="rounded-2xl border border-ink-border bg-ink-surface p-6">
              <span className="font-mono text-[10px] font-medium tracking-label text-text-tertiary">
                YOUR AVERAGE
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <p
                  className={[
                    "font-display text-[44px] font-extrabold leading-none tracking-[-0.03em] tabular-nums",
                    scoreColorClass(averageScore),
                  ].join(" ")}
                >
                  {averageScore}
                </p>
                <p className="font-mono text-[11px] tracking-label text-text-tertiary">/100</p>
              </div>
              <p className="mt-2 font-sans text-[12px] text-text-tertiary">
                Across {scoredSessions.length} session{scoredSessions.length === 1 ? "" : "s"}
              </p>
            </div>
          )}

          {/* Tier card */}
          <div className="rounded-2xl border border-ink-border bg-ink-surface p-6">
            <span className="font-mono text-[10px] font-medium tracking-label text-text-tertiary">
              YOUR PLAN
            </span>
            <p className="mt-2 font-display text-[20px] font-bold tracking-heading text-text-primary">
              {tierConfig.label}
            </p>
            <p className="mt-1 font-sans text-[13px] leading-relaxed text-text-secondary">
              {tierConfig.billing.label}
            </p>

            {tier?.trial_end && new Date(tier.trial_end).getTime() > Date.now() && (
              <p className="mt-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 font-sans text-[12px] text-accent">
                Trial ends {new Date(tier.trial_end).toLocaleDateString()}
              </p>
            )}

            {tier && tier.cycle_end && (
              <div className="mt-4 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] tracking-label text-text-tertiary">
                    SESSIONS LEFT
                  </span>
                  <span className="font-display text-[14px] font-bold tabular-nums text-text-primary">
                    {tier.sessions_remaining_this_cycle} / {tier.included_sessions}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] tracking-label text-text-tertiary">
                    CYCLE ENDS
                  </span>
                  <span className="font-sans text-[12px] text-text-secondary">
                    {new Date(tier.cycle_end).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            )}

            <Link
              href="/pricing"
              className="mt-5 block rounded-full text-center font-sans text-[13px] font-medium text-accent transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {!tier || tier.effective_tier === "basic" ? "Upgrade plan →" : "Manage plan →"}
            </Link>
          </div>

          {/* Interviewer roster */}
          <div className="rounded-2xl border border-ink-border bg-ink-surface p-6">
            <span className="font-mono text-[10px] font-medium tracking-label text-text-tertiary">
              INTERVIEWERS
            </span>
            <ul className="mt-4 space-y-4">
              <PersonaRow
                name="Sarah Chen"
                version="v.2"
                role="Folio · Engineering Manager"
                image="/images/agents/sarah.png"
              />
              <PersonaRow
                name="Gemma Brooks"
                version="v.3"
                role="Marcus & Millichap · SVP"
                image="/images/agents/gemma.png"
              />
            </ul>
          </div>

          {/* Quote */}
          <div className="rounded-2xl border border-ink-border bg-ink-surface p-6">
            <p className="font-sans text-[15px] italic leading-relaxed text-text-primary">
              &ldquo;The interview before the interview.&rdquo;
            </p>
            <p className="mt-2 font-mono text-[10px] tracking-label text-text-tertiary">
              — THE FOLIO METHOD
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PersonaRow({
  name,
  version,
  role,
  image,
}: {
  name: string;
  version: string;
  role: string;
  image: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <Image
        src={image}
        alt={name}
        width={36}
        height={36}
        className="h-9 w-9 flex-shrink-0 rounded-full border border-white/[0.08] object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[13px] font-medium text-text-primary">
          {name}
          <span className="ml-1.5 font-mono text-[10px] font-medium tracking-label text-text-tertiary">
            {version}
          </span>
        </p>
        <p className="truncate font-sans text-[11px] text-text-tertiary">{role}</p>
      </div>
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" aria-hidden />
    </li>
  );
}
