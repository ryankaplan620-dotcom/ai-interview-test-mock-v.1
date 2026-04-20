import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { PERSONAS } from "@/lib/personas";
import { getTavusPersonaId, getTavusReplicaId, tavusConfigured } from "@/lib/pipeline/tavus-registry";
import { createTavusConversation } from "@/lib/pipeline/tavus-client";
import type { PersonaId, InterviewType, SessionMode } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Input = z.object({
  sessionId: z.string().uuid(),
});

/**
 * Create (or fetch) a Tavus conversation for this Folio session.
 *
 * Idempotent: if the session already has a tavus_conversation_url, return it.
 * Otherwise create a new Tavus conversation and persist the URL + conversation_id
 * on the session row.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!tavusConfigured()) {
    return NextResponse.json({ error: "tavus_not_configured" }, { status: 503 });
  }

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select(
      "id, user_id, persona, interview_type, mode, target_firm, target_role, duration_seconds, status, tavus_conversation_id, tavus_conversation_url",
    )
    .eq("id", parsed.data.sessionId)
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
        status: string;
        tavus_conversation_id: string | null;
        tavus_conversation_url: string | null;
      }
    | null;

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (["completed", "abandoned", "failed"].includes(session.status)) {
    return NextResponse.json({ error: "session_ended" }, { status: 409 });
  }

  // Already have a Tavus conversation for this session — return it
  if (session.tavus_conversation_url && session.tavus_conversation_id) {
    return NextResponse.json({
      conversationUrl: session.tavus_conversation_url,
      conversationId: session.tavus_conversation_id,
      cached: true,
    });
  }

  // Look up persona ID — fail loud if not registered
  const tavusPersonaId = getTavusPersonaId(session.persona);
  if (!tavusPersonaId) {
    return NextResponse.json(
      {
        error: "persona_not_registered",
        detail: `Run scripts/bootstrap-tavus-personas.ts and set TAVUS_PERSONA_ID_${session.persona.toUpperCase()}`,
      },
      { status: 503 },
    );
  }
  const replicaId = getTavusReplicaId(session.persona);

  // Build per-session conversational context. Persona's system_prompt is
  // already set at persona-creation time (standard mode). Here we layer on
  // the specific firm/role/mode overlay for this individual session.
  const persona = PERSONAS[session.persona];
  const conversationalContext = buildSessionContext({
    personaName: persona.name,
    personaFirm: persona.firm,
    mode: session.mode,
    interviewType: session.interview_type,
    targetFirm: session.target_firm,
    targetRole: session.target_role,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callbackUrl = `${baseUrl}/api/tavus/webhook`;

  let tavusRes;
  try {
    tavusRes = await createTavusConversation({
      personaId: tavusPersonaId,
      replicaId,
      sessionId: session.id,
      conversationalContext,
      callbackUrl,
      maxDurationSeconds: session.duration_seconds + 300, // +5 min grace
    });
  } catch (err) {
    console.error("[tavus.conversation] create failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "tavus_create_failed" },
      { status: 502 },
    );
  }

  // Persist back to the session row (also stamps started_at if not set)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("sessions") as any)
    .update({
      tavus_conversation_id: tavusRes.conversation_id,
      tavus_conversation_url: tavusRes.conversation_url,
      started_at: new Date().toISOString(),
      status: "in_progress",
    })
    .eq("id", session.id);

  return NextResponse.json({
    conversationUrl: tavusRes.conversation_url,
    conversationId: tavusRes.conversation_id,
    cached: false,
  });
}

function buildSessionContext(args: {
  personaName: string;
  personaFirm: string;
  mode: SessionMode;
  interviewType: InterviewType;
  targetFirm: string | null;
  targetRole: string | null;
}): string {
  const lines: string[] = [];

  lines.push(
    `You are ${args.personaName}. This is a practice interview with a candidate preparing for real interviews.`,
  );

  if (args.targetFirm) {
    lines.push(
      `The candidate is targeting ${args.targetFirm}${args.targetRole ? ` for a ${args.targetRole} role` : ""}. You are at ${args.personaFirm}, but for this session, interview them as if you were at ${args.targetFirm}.`,
    );
  }

  const modeDescriptions: Record<SessionMode, string> = {
    easy: "Run the interview at an encouraging pace. Give the candidate space to recover if they stumble. This is a confidence-building session.",
    standard: "Run the interview as you normally would — realistic, fair, with appropriate follow-ups and challenge.",
    hard: "Run the interview at top-tier difficulty. Pause after weak answers. Push back when claims are generic. Interrupt if they're rambling. This is real finals-round intensity.",
  };
  lines.push(modeDescriptions[args.mode]);

  const typeDescriptions: Record<InterviewType, string> = {
    behavioral: "Focus on behavioral questions: leadership, conflict, failure, achievement.",
    case: "Focus on case interview content — business problem, structured thinking, quantitative reasoning.",
    technical: "Focus on technical fundamentals appropriate to your firm.",
    product_sense: "Focus on product sense: critique, design, prioritization.",
    superday: "This is a superday-style session — move through multiple question types.",
    hard_mode: "This is the hardest difficulty tier. Top-firm finals-round intensity.",
  };
  lines.push(typeDescriptions[args.interviewType]);

  lines.push(
    "Begin by greeting the candidate briefly and asking them to walk you through their resume. Stay in character throughout. Do not break the interview frame, do not mention that you are an AI.",
  );

  return lines.join(" ");
}
