import { notFound, redirect } from "next/navigation";
import { requireUser, getUserTier } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { PERSONAS } from "@/lib/personas";
import { resolveRuntimeFeatures } from "@/lib/gates/session";
import { shouldMock } from "@/lib/pipeline/env";
import { tavusConfigured } from "@/lib/pipeline/tavus-registry";
import type { Session } from "@/types/supabase";
import { SessionView, type SessionViewPersona } from "./session-view";
import { TavusSessionView } from "./tavus-session-view";

interface PageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = createServerClient();

  // ---- 1. Load the session
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

  // ---- 2b. Overage sessions are inserted before payment; only let the user
  // in once Stripe's payment_intent.succeeded webhook has actually recorded
  // a succeeded purchase for this session. Without this, anyone could start
  // an overage session and skip paying for it entirely.
  if (session.is_overage) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: purchase } = await (supabase.from("overage_purchases") as any)
      .select("status")
      .eq("session_id", session.id)
      .eq("status", "succeeded")
      .maybeSingle();
    if (!purchase) {
      redirect("/session/new?overage=pending");
    }
  }

  // ---- 3. Terminal-status redirect — go to feedback page (it handles each status)
  if (session.status === "completed" || session.status === "failed" || session.status === "abandoned") {
    redirect(`/session/${session.id}/feedback`);
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

  // ---- 5. If Tavus is configured, use the new CVI pipeline
  if (tavusConfigured()) {
    return (
      <TavusSessionView
        session={{
          id: session.id,
          persona: session.persona,
          interview_type: session.interview_type,
          mode: session.mode,
          target_firm: session.target_firm,
          target_role: session.target_role,
          duration_seconds: session.duration_seconds,
        }}
        persona={personaView}
      />
    );
  }

  // ---- 6. Fallback: legacy Simli/ElevenLabs/Deepgram pipeline from Phases C.1–C.3
  const tier = await getUserTier();
  const runtime = resolveRuntimeFeatures(tier?.effective_tier ?? "free");
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
