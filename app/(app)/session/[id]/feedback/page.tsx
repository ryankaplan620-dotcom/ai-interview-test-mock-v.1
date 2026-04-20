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
  // Abandoned or failed sessions have no feedback
  if (session.status !== "completed") {
    return <NoFeedbackState status={session.status} sessionId={session.id} />;
  }

  // Check for existing feedback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from("session_feedback") as any)
    .select("*")
    .eq("session_id", session.id)
    .maybeSingle();

  const persona = PERSONAS[session.persona];
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

function NoFeedbackState({ status, sessionId }: { status: string; sessionId: string }) {
  const label =
    status === "abandoned"
      ? "This session ended early, so there's no feedback to generate."
      : status === "failed"
        ? "This session had a technical issue and couldn't be completed."
        : "This session isn't eligible for feedback yet.";

  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:px-10">
      <p className="font-mono text-[11px] tracking-label text-text-tertiary">
        SESSION · {sessionId.slice(0, 8).toUpperCase()}
      </p>
      <h1 className="mt-3 font-display text-[28px] font-semibold text-text-primary">
        No feedback available.
      </h1>
      <p className="mt-3 font-sans text-[15px] leading-relaxed text-text-secondary">{label}</p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/session/new"
          className="rounded-full bg-accent px-5 py-2.5 font-sans text-[13px] font-semibold text-ink transition-all hover:bg-accent-light"
        >
          Start a new session →
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-ink-border bg-ink-surface px-5 py-2.5 font-sans text-[13px] text-text-primary transition-all hover:border-accent/60"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
