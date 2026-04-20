import { notFound, redirect } from "next/navigation";
import { requireUser, getUserTier } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { PERSONAS } from "@/lib/personas";
import { resolveRuntimeFeatures } from "@/lib/gates/session";
import { shouldMock } from "@/lib/pipeline/env";
import type { Session } from "@/types/supabase";
import { SessionView, type SessionViewPersona } from "./session-view";

interface PageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = createServerClient();

  // ---- 1. Load the session
  // Cast: hand-rolled Database types don't flow through select generics. Same pattern as dashboard.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionRaw, error } = await (supabase.from("sessions") as any)
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !sessionRaw) {
    notFound();
  }
  const session = sessionRaw as Session;

  // ---- 2. Ownership check (belt-and-braces alongside RLS)
  if (session.user_id !== user.id) {
    notFound();
  }

  // ---- 3. Terminal-status redirect — completed sessions go to feedback (stubbed to dashboard for now)
  if (session.status === "completed") {
    // Phase D will point this at /session/[id]/feedback. For now, back to dashboard.
    redirect(`/dashboard?session=${session.id}`);
  }
  if (session.status === "failed" || session.status === "abandoned") {
    redirect(`/dashboard?session=${session.id}&state=${session.status}`);
  }

  // ---- 4. Build client-safe persona view
  const persona = PERSONAS[session.persona];
  const personaView: SessionViewPersona = {
    id: persona.id,
    name: persona.name,
    firstName: persona.firstName,
    firm: persona.firm,
    title: persona.title,
  };

  // ---- 5. Runtime feature flags for this tier — the orchestrator (Phase C)
  // will read these to decide whether to inject session memory, firm calibration, etc.
  const tier = await getUserTier();
  const runtime = resolveRuntimeFeatures(tier?.effective_tier ?? "trial");

  // ---- 6. Pipeline capabilities — which real voice services are online?
  // The client mirrors mock-vs-real logic from the server by reading these flags.
  const pipelineCapabilities = {
    deepgram: !shouldMock("deepgram"),
    elevenlabs: !shouldMock("elevenlabs"),
    tavus: !shouldMock("tavus"),
  };

  return (
    <SessionView
      session={toClientSession(session)}
      persona={personaView}
      runtimeFeatures={{
        firmCalibration: runtime.firmCalibration,
        sessionMemory: runtime.sessionMemory,
        questionIntelligenceEngine: runtime.questionIntelligenceEngine,
        nonVerbalFeedback: runtime.nonVerbalFeedback,
        voiceAcousticAnalysis: runtime.voiceAcousticAnalysis,
      }}
      pipelineCapabilities={pipelineCapabilities}
    />
  );
}

// --------------------------------------------------------------------------
// Client-safe session shape — strip any server-only fields if we add them later.
// For now, just a re-expose of the Row type minus nothing.
// --------------------------------------------------------------------------

function toClientSession(s: Session) {
  return {
    id: s.id,
    persona: s.persona,
    interview_type: s.interview_type,
    mode: s.mode,
    is_panel: s.is_panel,
    target_firm: s.target_firm,
    target_role: s.target_role,
    duration_seconds: s.duration_seconds,
    status: s.status,
    started_at: s.started_at,
  };
}
