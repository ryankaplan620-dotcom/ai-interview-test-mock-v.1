export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { PERSONAS } from "@/lib/personas";
import type {
  PersonaId,
  InterviewType,
  SessionMode,
  SessionAnalytics,
  EmotionalState,
  ToneShift,
  KeyDiscussionPoint,
  UserAppearance,
  UserBehavior,
  GestureObservation,
  ScreenActivity,
  NetworkDiagnostics,
  NotableMoment,
  TranscriptTurn,
} from "@/types/supabase";
import { formatSeconds } from "@/lib/utils/time";
import { formatInterviewType, formatSessionMode } from "@/lib/utils/session-labels";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

type TabId = "perception" | "transcript" | "emotional" | "network";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default async function SessionInsightsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireUser();
  const supabase = await createServerClient();

  // Load session + verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select(
      "id, user_id, persona, interview_type, mode, target_firm, target_role, duration_seconds, actual_duration_seconds, status, started_at, ended_at",
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
      }
    | null;

  if (!session || session.user_id !== user.id) notFound();

  // Load analytics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: analyticsRaw } = await (supabase.from("session_analytics") as any)
    .select("*")
    .eq("session_id", session.id)
    .maybeSingle();

  const analytics = analyticsRaw as SessionAnalytics | null;

  // Load transcript turns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: turnsRaw } = await (supabase.from("transcript_turns") as any)
    .select("*")
    .eq("session_id", session.id)
    .order("started_at_seconds", { ascending: true });

  const turns = (turnsRaw as TranscriptTurn[] | null) ?? [];

  const persona = PERSONAS[session.persona];
  const activeTab: TabId = isValidTab(searchParams.tab) ? searchParams.tab : "perception";

  const sessionDate = session.started_at
    ? new Date(session.started_at).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10 sm:px-10 sm:py-14">
      {/* Breadcrumb */}
      <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          href="/dashboard"
          className="font-sans text-[12px] text-text-secondary transition-colors hover:text-text-primary"
        >
          Dashboard
        </Link>
        <span className="font-mono text-[10px] text-text-secondary">/</span>
        <Link
          href={`/session/${session.id}/feedback`}
          className="font-sans text-[12px] text-text-secondary transition-colors hover:text-text-primary"
        >
          Feedback
        </Link>
        <span className="font-mono text-[10px] text-text-secondary">/</span>
        <span className="font-mono text-[11px] tracking-label text-text-secondary">INSIGHTS</span>
      </div>

      {/* Header */}
      <header className="mb-10">
        <p className="font-mono text-[11px] tracking-label">
          <span className="text-gradient-violet">SESSION INTELLIGENCE</span>
        </p>
        <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-text-primary sm:text-[40px]">
          {persona.firstName} at {persona.firm}
        </h1>
        <p className="mt-2 font-sans text-[14px] text-text-secondary">
          {formatInterviewType(session.interview_type)} · {formatSessionMode(session.mode)}
          {session.target_firm ? ` · targeting ${session.target_firm}` : ""}
          {session.actual_duration_seconds !== null
            ? ` · ${Math.round(session.actual_duration_seconds / 60)} min`
            : ""}
          {sessionDate ? ` · ${sessionDate}` : ""}
        </p>
      </header>

      {/* Tab bar */}
      <nav className="mb-8 flex gap-1 border-b border-ink-border">
        <TabLink tab="perception" activeTab={activeTab} sessionId={session.id}>
          Perception
        </TabLink>
        <TabLink tab="transcript" activeTab={activeTab} sessionId={session.id}>
          Transcript
        </TabLink>
        <TabLink tab="emotional" activeTab={activeTab} sessionId={session.id}>
          Emotional
        </TabLink>
        <TabLink tab="network" activeTab={activeTab} sessionId={session.id}>
          Network
        </TabLink>
      </nav>

      {/* Tab content */}
      {!analytics && activeTab !== "transcript" ? (
        <LoadingState />
      ) : (
        <>
          {activeTab === "perception" && <PerceptionTab analytics={analytics} />}
          {activeTab === "transcript" && (
            <TranscriptTab turns={turns} personaFirstName={persona.firstName} />
          )}
          {activeTab === "emotional" && <EmotionalTab analytics={analytics} />}
          {activeTab === "network" && <NetworkTab analytics={analytics} />}
        </>
      )}

      {/* Back link */}
      <div className="mt-10 border-t border-ink-border pt-8 text-center">
        <Link
          href={`/session/${session.id}/feedback`}
          className="inline-flex items-center gap-1 font-sans text-[13px] font-medium text-accent transition-opacity hover:opacity-80"
        >
          Back to feedback
        </Link>
      </div>
    </div>
  );
}

// ==========================================================================
// Tab link
// ==========================================================================

function TabLink({
  tab,
  activeTab,
  sessionId,
  children,
}: {
  tab: TabId;
  activeTab: TabId;
  sessionId: string;
  children: React.ReactNode;
}) {
  const isActive = tab === activeTab;
  return (
    <Link
      href={`/session/${sessionId}/insights?tab=${tab}`}
      aria-current={isActive ? "page" : undefined}
      className={[
        "px-4 py-2.5 font-sans text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isActive
          ? "border-b-2 border-accent text-text-primary"
          : "text-text-secondary hover:text-text-primary",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

// ==========================================================================
// Loading state
// ==========================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-border border-t-accent" />
      <p className="font-sans text-[15px] text-text-secondary">Insights are being generated...</p>
      <p className="mt-1 font-sans text-[12px] text-text-tertiary">
        This usually takes a few moments after the session ends.
      </p>
    </div>
  );
}

// ==========================================================================
// Perception Tab
// ==========================================================================

function PerceptionTab({ analytics }: { analytics: SessionAnalytics | null }) {
  if (!analytics) return <LoadingState />;

  const appearance = analytics.user_appearance as UserAppearance | null;
  const behavior = analytics.user_behavior as UserBehavior | null;
  const gestures = analytics.gestures as GestureObservation[] | null;
  const emotionalStates = analytics.emotional_states;
  const notableMoments = analytics.notable_moments as NotableMoment[] | null;

  const hasAppearance = appearance || analytics.appearance_description;
  const hasBehavior = behavior || analytics.behavior_description || gestures || analytics.gesture_observations;
  const hasEmotions = emotionalStates && emotionalStates.length > 0;
  const hasMoments = notableMoments && notableMoments.length > 0;
  const hasPerceptionSummary = analytics.perception_summary;

  const hasAnyData = hasAppearance || hasBehavior || hasEmotions || hasMoments || hasPerceptionSummary;

  if (!hasAnyData) {
    return <EmptyCard message="No perception data captured for this session." />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Perception Summary */}
      {hasPerceptionSummary && (
        <div className="lg:col-span-2">
          <Card>
            <CardHeading>Perception Summary</CardHeading>
            <p className="mt-3 font-sans text-[14px] leading-relaxed text-text-secondary">
              {analytics.perception_summary}
            </p>
          </Card>
        </div>
      )}

      {/* User Appearance */}
      {hasAppearance && (
        <Card>
          <CardHeading>User Appearance</CardHeading>
          {analytics.appearance_description && (
            <p className="mt-3 font-sans text-[14px] leading-relaxed text-text-secondary">
              {analytics.appearance_description}
            </p>
          )}
          {appearance && (
            <dl className="mt-4 space-y-3">
              {appearance.description && (
                <DetailRow label="Description" value={appearance.description} />
              )}
              {appearance.estimated_age_range && (
                <DetailRow label="Estimated Age Range" value={appearance.estimated_age_range} />
              )}
              {appearance.clothing && (
                <DetailRow label="Clothing" value={appearance.clothing} />
              )}
              {appearance.background && (
                <DetailRow label="Background" value={appearance.background} />
              )}
              {appearance.notable_features && appearance.notable_features.length > 0 && (
                <div>
                  <dt className="font-sans text-[12px] text-text-tertiary">Notable Features</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {appearance.notable_features.map((f, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-ink-border bg-ink-surface px-2.5 py-1 font-sans text-[12px] text-text-primary"
                      >
                        {f}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </Card>
      )}

      {/* Behavior & Gestures */}
      {hasBehavior && (
        <Card>
          <CardHeading>Behavior &amp; Gestures</CardHeading>
          {analytics.behavior_description && (
            <p className="mt-3 font-sans text-[14px] leading-relaxed text-text-secondary">
              {analytics.behavior_description}
            </p>
          )}
          {behavior && (
            <dl className="mt-4 space-y-3">
              {behavior.eye_contact && (
                <DetailRow label="Eye Contact" value={behavior.eye_contact} />
              )}
              {behavior.posture && <DetailRow label="Posture" value={behavior.posture} />}
              {behavior.engagement_level && (
                <DetailRow label="Engagement" value={behavior.engagement_level} />
              )}
              {behavior.speaking_style && (
                <DetailRow label="Speaking Style" value={behavior.speaking_style} />
              )}
              {behavior.notable_patterns && behavior.notable_patterns.length > 0 && (
                <div>
                  <dt className="font-sans text-[12px] text-text-tertiary">Notable Patterns</dt>
                  <dd className="mt-1">
                    <ul className="space-y-1">
                      {behavior.notable_patterns.map((p, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                          <span className="font-sans text-[13px] text-text-primary">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
          )}

          {/* Gesture observations (string[]) */}
          {analytics.gesture_observations && analytics.gesture_observations.length > 0 && (
            <div className="mt-4">
              <p className="font-sans text-[12px] font-medium text-text-tertiary">Gestures Observed</p>
              <ul className="mt-2 space-y-1">
                {analytics.gesture_observations.map((g, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                    <span className="font-sans text-[13px] text-text-primary">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Structured gestures */}
          {gestures && gestures.length > 0 && (
            <div className="mt-4">
              <p className="font-sans text-[12px] font-medium text-text-tertiary">Gesture Details</p>
              <div className="mt-2 space-y-2">
                {gestures.map((g, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-ink-border bg-ink px-3 py-2"
                  >
                    <p className="font-sans text-[13px] font-medium text-text-primary">
                      {g.gesture}
                    </p>
                    <p className="mt-0.5 font-sans text-[12px] text-text-secondary">
                      {g.frequency} &middot; {g.context}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Emotional States */}
      {hasEmotions && (
        <Card>
          <CardHeading>Emotional States</CardHeading>
          <div className="mt-4 space-y-3">
            {emotionalStates!.map((state, i) => (
              <EmotionRow key={i} state={state} />
            ))}
          </div>
        </Card>
      )}

      {/* Notable Moments */}
      {hasMoments && (
        <Card>
          <CardHeading>Notable Moments</CardHeading>
          <div className="mt-4 space-y-3">
            {notableMoments!.map((moment, i) => (
              <div
                key={i}
                className="rounded-lg border border-ink-border bg-ink px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-ink-border bg-ink-surface px-2 py-0.5 font-mono text-[10px] tracking-label text-accent">
                    {moment.type.toUpperCase()}
                  </span>
                  <span className="font-mono text-[11px] text-text-tertiary">
                    {formatSeconds(moment.timestamp_seconds)}
                  </span>
                </div>
                <p className="mt-2 font-sans text-[13px] text-text-primary">
                  {moment.description}
                </p>
                {moment.significance && (
                  <p className="mt-1 font-sans text-[12px] text-text-secondary">
                    {moment.significance}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ==========================================================================
// Transcript Tab
// ==========================================================================

function TranscriptTab({
  turns,
  personaFirstName,
}: {
  turns: TranscriptTurn[];
  personaFirstName: string;
}) {
  if (turns.length === 0) {
    return <EmptyCard message="No transcript available for this session." />;
  }

  return (
    <div className="space-y-1">
      {turns.map((turn) => (
        <div
          key={turn.id}
          className={[
            "flex gap-4 rounded-lg px-4 py-3",
            turn.speaker === "interviewer" ? "bg-ink-surface" : "",
          ].join(" ")}
        >
          <div className="w-20 flex-shrink-0 pt-0.5">
            <p className="font-mono text-[11px] text-text-tertiary">
              {formatSeconds(turn.started_at_seconds)}
            </p>
            <p
              className={[
                "mt-0.5 font-sans text-[12px] font-medium",
                turn.speaker === "interviewer" ? "text-accent" : "text-text-primary",
              ].join(" ")}
            >
              {turn.speaker === "interviewer" ? personaFirstName : "You"}
            </p>
          </div>
          <p className="flex-1 font-sans text-[14px] leading-relaxed text-text-primary">
            {turn.text}
          </p>
        </div>
      ))}
    </div>
  );
}

// ==========================================================================
// Emotional Tab
// ==========================================================================

function EmotionalTab({ analytics }: { analytics: SessionAnalytics | null }) {
  if (!analytics) return <LoadingState />;

  const hasEmotionalSummary = analytics.emotional_summary;
  const hasToneShifts = analytics.tone_shifts && analytics.tone_shifts.length > 0;
  const hasConfidence = analytics.confidence_level !== null;
  const hasEngagement = analytics.engagement_score !== null;
  const hasDiscussionPoints =
    analytics.key_discussion_points && analytics.key_discussion_points.length > 0;
  const hasSentiment = analytics.overall_sentiment;

  const hasAnyData =
    hasEmotionalSummary ||
    hasToneShifts ||
    hasConfidence ||
    hasEngagement ||
    hasDiscussionPoints ||
    hasSentiment;

  if (!hasAnyData) {
    return <EmptyCard message="No emotional data captured for this session." />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Emotional Summary */}
      {(hasEmotionalSummary || hasSentiment) && (
        <div className="lg:col-span-2">
          <Card>
            <CardHeading>Emotional Overview</CardHeading>
            {hasEmotionalSummary && (
              <p className="mt-3 font-sans text-[14px] leading-relaxed text-text-secondary">
                {analytics.emotional_summary}
              </p>
            )}
            {hasSentiment && (
              <div className="mt-3">
                <span className="font-sans text-[12px] text-text-tertiary">Overall Sentiment: </span>
                <span className="font-sans text-[14px] italic text-text-primary">
                  {analytics.overall_sentiment}
                </span>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Confidence Meter */}
      {hasConfidence && (
        <Card>
          <MeterDisplay label="Confidence" value={analytics.confidence_level!} />
        </Card>
      )}

      {/* Engagement Meter */}
      {hasEngagement && (
        <Card>
          <MeterDisplay label="Engagement" value={analytics.engagement_score!} />
        </Card>
      )}

      {/* Tone Shifts */}
      {hasToneShifts && (
        <div className="lg:col-span-2">
          <Card>
            <CardHeading>Tone Shifts Timeline</CardHeading>
            <div className="mt-4 space-y-2">
              {analytics.tone_shifts!.map((shift, i) => (
                <ToneShiftItem key={i} shift={shift} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Key Discussion Points */}
      {hasDiscussionPoints && (
        <div className="lg:col-span-2">
          <Card>
            <CardHeading>Key Discussion Points</CardHeading>
            <div className="mt-4 space-y-3">
              {analytics.key_discussion_points!.map((point, i) => (
                <DiscussionPointRow key={i} point={point} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Network Tab
// ==========================================================================

function NetworkTab({ analytics }: { analytics: SessionAnalytics | null }) {
  if (!analytics) return <LoadingState />;

  const network = analytics.network_diagnostics as NetworkDiagnostics | null;
  const screenActivities = analytics.screen_activities as ScreenActivity[] | null;

  const hasNetwork = network;
  const hasScreenActivities = screenActivities && screenActivities.length > 0;

  if (!hasNetwork && !hasScreenActivities) {
    return <EmptyCard message="No network or screen activity data captured for this session." />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Network Diagnostics */}
      {hasNetwork && (
        <Card>
          <CardHeading>Connection Quality</CardHeading>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="font-sans text-[12px] text-text-tertiary">Quality</dt>
              <dd className="mt-1">
                <span
                  className={[
                    "inline-flex rounded-full border px-3 py-1 font-sans text-[13px] font-medium",
                    connectionQualityStyle(network.connection_quality),
                  ].join(" ")}
                >
                  {network.connection_quality}
                </span>
              </dd>
            </div>
            {network.latency_ms !== null && (
              <div>
                <dt className="font-sans text-[12px] text-text-tertiary">Latency</dt>
                <dd className="mt-1 font-display text-[28px] font-bold tracking-[-0.03em] tabular-nums text-text-primary">
                  {network.latency_ms}
                  <span className="font-mono text-[12px] font-normal tracking-normal text-text-secondary"> ms</span>
                </dd>
              </div>
            )}
            {network.packet_loss_pct !== null && (
              <div>
                <dt className="font-sans text-[12px] text-text-tertiary">Packet Loss</dt>
                <dd className="mt-1 font-display text-[28px] font-bold tracking-[-0.03em] tabular-nums text-text-primary">
                  {network.packet_loss_pct}
                  <span className="font-mono text-[12px] font-normal tracking-normal text-text-secondary">%</span>
                </dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {/* Screen Activities */}
      {hasScreenActivities && (
        <Card>
          <CardHeading>Screen Activities</CardHeading>
          <div className="mt-4 space-y-2">
            {screenActivities!.map((activity, i) => (
              <div
                key={i}
                className="rounded-lg border border-ink-border bg-ink px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans text-[13px] font-medium text-text-primary">
                    {activity.activity}
                  </span>
                  <span className="font-mono text-[11px] text-text-tertiary">
                    {formatSeconds(activity.timestamp_seconds)}
                  </span>
                </div>
                {activity.description && (
                  <p className="mt-1 font-sans text-[12px] text-text-secondary">
                    {activity.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ==========================================================================
// Shared components
// ==========================================================================

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-border bg-ink-surface p-6">{children}</div>
  );
}

function CardHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[11px] uppercase tracking-label text-text-tertiary">{children}</h3>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-border bg-ink-surface/50 p-10 text-center">
      <p className="font-sans text-[14px] text-text-secondary">{message}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-[12px] text-text-tertiary">{label}</dt>
      <dd className="mt-0.5 font-sans text-[13px] text-text-primary">{value}</dd>
    </div>
  );
}

function EmotionRow({ state }: { state: EmotionalState }) {
  const pct = Math.round(state.intensity * 100);
  return (
    <div className="rounded-lg border border-ink-border bg-ink px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-sans text-[13px] font-medium text-text-primary">
          {state.emotion}
        </span>
        <div className="flex items-center gap-2">
          {state.timestamp_seconds !== undefined && (
            <span className="font-mono text-[10px] text-text-tertiary">
              {formatSeconds(state.timestamp_seconds)}
            </span>
          )}
          <span className="font-mono text-[11px] tabular-nums text-text-secondary">{pct}%</span>
        </div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MeterDisplay({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <CardHeading>{label}</CardHeading>
        <span className="font-display text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums text-text-primary">
          {pct}
          <span className="font-mono text-[12px] font-normal tracking-normal text-text-secondary">%</span>
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ToneShiftItem({ shift }: { shift: ToneShift }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-border bg-ink px-4 py-3">
      <span className="rounded-full border border-ink-border bg-ink-surface px-2.5 py-1 font-sans text-[12px] text-text-secondary">
        {shift.from}
      </span>
      <span className="text-text-tertiary">&rarr;</span>
      <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 font-sans text-[12px] text-accent">
        {shift.to}
      </span>
      <span className="ml-auto font-mono text-[11px] text-text-tertiary">
        {formatSeconds(shift.at_seconds)}
      </span>
    </div>
  );
}

function DiscussionPointRow({ point }: { point: KeyDiscussionPoint }) {
  const sentimentStyle =
    point.sentiment === "positive"
      ? "border-accent/30 bg-accent/10 text-accent"
      : point.sentiment === "negative"
        ? "border-rose-300/30 bg-rose-300/5 text-rose-300/90"
        : "border-ink-border bg-ink-surface text-text-secondary";

  return (
    <div className="rounded-lg border border-ink-border bg-ink px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-sans text-[14px] font-medium text-text-primary">{point.topic}</p>
        <span
          className={[
            "flex-shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-label",
            sentimentStyle,
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

// ==========================================================================
// Helpers
// ==========================================================================

function isValidTab(tab: string | undefined): tab is TabId {
  return tab === "perception" || tab === "transcript" || tab === "emotional" || tab === "network";
}

function connectionQualityStyle(quality: string): string {
  const q = quality.toLowerCase();
  if (q === "excellent" || q === "good") {
    return "border-accent/30 bg-accent/10 text-accent";
  }
  if (q === "fair" || q === "moderate") {
    return "border-amber-300/30 bg-amber-300/5 text-amber-300/90";
  }
  return "border-rose-300/30 bg-rose-300/5 text-rose-300/90";
}
