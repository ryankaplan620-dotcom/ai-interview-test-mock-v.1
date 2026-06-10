import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { PERSONAS } from "@/lib/personas";
import type { PersonaId, InterviewType, SessionMode } from "@/types/supabase";
import type { FeedbackPayload } from "@/lib/pipeline/feedback-types";
import { FeedbackView } from "./feedback-view";
import { FeedbackGenerating } from "./generating";

interface PageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function FeedbackPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = createServerClient();

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

  // If the session is still live, redirect back to the call room
  if (session.status === "in_progress" || session.status === "scheduled") {
    redirect(`/session/${session.id}`);
  }

  const persona = PERSONAS[session.persona];

  // Abandoned or failed sessions have no feedback
  if (session.status !== "completed") {
    return (
      <NoFeedbackState
        status={session.status}
        sessionId={session.id}
        personaFirstName={persona.firstName}
        personaFirm={persona.firm}
      />
    );
  }

  // Check for existing feedback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from("session_feedback") as any)
    .select("*")
    .eq("session_id", session.id)
    .maybeSingle();

  const sessionMeta = {
    id: session.id,
    personaName: persona.name,
    personaFirstName: persona.firstName,
    personaFirm: persona.firm,
    interviewType: session.interview_type,
    mode: session.mode,
    targetFirm: session.target_firm,
    targetRole: session.target_role,
    durationSeconds: session.duration_seconds,
    actualDurationSeconds: session.actual_duration_seconds,
    endedAt: session.ended_at,
  };

  if (!existing) {
    // Client triggers generation on mount, polls, shows final view when ready
    return <FeedbackGenerating sessionId={session.id} sessionMeta={sessionMeta} />;
  }

  const feedback: FeedbackPayload = {
    overall_score: existing.overall_score ?? 0,
    structure_score: existing.structure_score ?? 0,
    specificity_score: existing.specificity_score ?? 0,
    delivery_score: existing.delivery_score ?? 0,
    summary: existing.summary ?? "",
    strengths: existing.strengths ?? [],
    improvements: existing.improvements ?? [],
    feedback_quotes: existing.feedback_quotes ?? [],
  };

  return <FeedbackView feedback={feedback} sessionMeta={sessionMeta} />;
}

function NoFeedbackState({
  status,
  sessionId,
  personaFirstName,
  personaFirm,
}: {
  status: string;
  sessionId: string;
  personaFirstName: string;
  personaFirm: string;
}) {
  const config =
    status === "abandoned"
      ? {
          chipLabel: "ABANDONED",
          chipClass: "text-amber-300/90 border-amber-300/30 bg-amber-300/5",
          headline: "This one didn't finish.",
          body: `You ended the session with ${personaFirstName} early, so there's no full transcript to analyze. No shame in it — sometimes you know you're not ready and it's better to restart fresh.`,
          primaryCta: "Run it back",
        }
      : status === "failed"
        ? {
            chipLabel: "FAILED",
            chipClass: "text-rose-300/90 border-rose-300/30 bg-rose-300/5",
            headline: "Something went wrong.",
            body: `We hit a technical issue during your session with ${personaFirstName} and couldn't complete it. Not on you — try starting a fresh one.`,
            primaryCta: "Start a new session",
          }
        : {
            chipLabel: status.toUpperCase(),
            chipClass: "text-text-tertiary border-ink-border bg-ink-surface",
            headline: "No feedback available.",
            body: `This session isn't eligible for feedback.`,
            primaryCta: "Start a new session",
          };

  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:px-10">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="font-sans text-[12px] text-text-tertiary transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Cosmos empty-state card */}
      <div className="bg-gradient-dark relative overflow-hidden rounded-2xl border border-white/[0.08] px-8 py-12 sm:px-12 sm:py-14">
        {/* Status chip */}
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium tracking-label",
            config.chipClass,
          ].join(" ")}
        >
          {config.chipLabel}
        </span>

        {/* Headline */}
        <h1 className="mt-5 font-display text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-text-primary sm:text-[36px]">
          {config.headline}
        </h1>

        {/* Session context */}
        <p className="mt-3 font-sans text-[13px] text-text-tertiary">
          {personaFirstName} at {personaFirm} ·{" "}
          <span className="font-mono text-[11px] tracking-label">
            {sessionId.slice(0, 8).toUpperCase()}
          </span>
        </p>

        {/* Body */}
        <p className="mt-6 max-w-[52ch] font-sans text-[15px] leading-[1.65] text-text-secondary">
          {config.body}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/session/new"
            className="rounded-full bg-cta-gradient px-5 py-2.5 font-sans text-[13px] font-semibold text-brand-ink transition-all hover:shadow-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            {config.primaryCta} →
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 font-sans text-[13px] text-text-primary transition-all hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
