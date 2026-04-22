import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { PERSONAS } from "@/lib/personas";
import { getTavusPersonaId, getTavusReplicaId, tavusConfigured } from "@/lib/pipeline/tavus-registry";
import { createTavusConversation } from "@/lib/pipeline/tavus-client";
import {
  formatMemoriesForContext,
  loadMemoriesForSession,
  markMemoriesSurfaced,
  type MemoryNote,
} from "@/lib/pipeline/memory";
import { renderQaOverlay } from "@/lib/personas/qa-overlay";
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
 * Context composition (in order):
 *   1. Persona base: "You are <name>..." + mode + interview-type
 *   2. Memory block (Phase I.1 / Upgrade 07) — prior-session notes for
 *      this (user, persona) pair, if any
 *   3. Q&A overlay (Phase I.2 / Upgrade 08) — universal end-of-interview
 *      Q&A period instructions
 *   4. Opening instruction — greeting + resume walk
 *
 * Idempotent re-entry (session already has a tavus_conversation_url) skips
 * memory surfacing entirely — the first call owns that state.
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

  // Already have a Tavus conversation for this session — return it, skip memory
  if (session.tavus_conversation_url && session.tavus_conversation_id) {
    return NextResponse.json({
      conversationUrl: session.tavus_conversation_url,
      conversationId: session.tavus_conversation_id,
      cached: true,
    });
  }

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
  const persona = PERSONAS[session.persona];

  // Phase I.1: pull memories
  const memories: MemoryNote[] = await loadMemoriesForSession({
    userId: session.user_id,
    personaId: session.persona,
  });

  // Build context
  const conversationalContext = buildSessionContext({
    personaName: persona.name,
    personaFirstName: persona.firstName,
    personaFirm: persona.firm,
    mode: session.mode,
    interviewType: session.interview_type,
    targetFirm: session.target_firm,
    targetRole: session.target_role,
    durationSeconds: session.duration_seconds,
    memories,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("sessions") as any)
    .update({
      tavus_conversation_id: tavusRes.conversation_id,
      tavus_conversation_url: tavusRes.conversation_url,
      started_at: new Date().toISOString(),
      status: "in_progress",
    })
    .eq("id", session.id);

  // Phase I.1: bump surfaced_count
  if (memories.length > 0) {
    await markMemoriesSurfaced(memories.map((m) => m.id));
  }

  return NextResponse.json({
    conversationUrl: tavusRes.conversation_url,
    conversationId: tavusRes.conversation_id,
    cached: false,
  });
}

// --------------------------------------------------------------------------
// Context builder — memory-aware (I.1) and Q&A-aware (I.2)
// --------------------------------------------------------------------------

function buildSessionContext(args: {
  personaName: string;
  personaFirstName: string;
  personaFirm: string;
  mode: SessionMode;
  interviewType: InterviewType;
  targetFirm: string | null;
  targetRole: string | null;
  durationSeconds: number;
  memories: MemoryNote[];
}): string {
  const sections: string[] = [];

  // --- 1. Base framing ---
  const basePieces: string[] = [];
  basePieces.push(
    `You are ${args.personaName}. This is a practice interview with a candidate preparing for real interviews.`,
  );

  if (args.targetFirm) {
    basePieces.push(
      `The candidate is targeting ${args.targetFirm}${args.targetRole ? ` for a ${args.targetRole} role` : ""}. You are at ${args.personaFirm}, but for this session, interview them as if you were at ${args.targetFirm}.`,
    );
  }

  const modeDescriptions: Record<SessionMode, string> = {
    easy: "Run the interview at an encouraging pace. Give the candidate space to recover if they stumble. This is a confidence-building session.",
    standard:
      "Run the interview as you normally would — realistic, fair, with appropriate follow-ups and challenge.",
    hard: "Run the interview at top-tier difficulty. Pause after weak answers. Push back when claims are generic. Interrupt if they're rambling. This is real finals-round intensity.",
  };
  basePieces.push(modeDescriptions[args.mode]);

  const typeDescriptions: Record<InterviewType, string> = {
    behavioral: "Focus on behavioral questions: leadership, conflict, failure, achievement.",
    case: "Focus on case interview content — business problem, structured thinking, quantitative reasoning.",
    technical: "Focus on technical fundamentals appropriate to your firm.",
    product_sense: "Focus on product sense: critique, design, prioritization.",
    superday: "This is a superday-style session — move through multiple question types.",
    hard_mode: "This is the hardest difficulty tier. Top-firm finals-round intensity.",
  };
  basePieces.push(typeDescriptions[args.interviewType]);

  // Session-length hint so persona knows how to pace
  const minutes = Math.round(args.durationSeconds / 60);
  basePieces.push(`The session is scheduled for approximately ${minutes} minutes.`);

  sections.push(basePieces.join(" "));

  // --- 2. Memory block (Phase I.1) ---
  const memoryBlock = formatMemoriesForContext(args.memories, args.personaFirstName);
  if (memoryBlock) {
    sections.push(memoryBlock);
  }

  // --- 3. Q&A overlay (Phase I.2) ---
  sections.push(renderQaOverlay(args.personaName));

  // --- 4. Opening instruction ---
  sections.push(
    "Begin by greeting the candidate briefly and asking them to walk you through their resume. Stay in character throughout. Do not break the interview frame, do not mention that you are an AI.",
  );

  return sections.join("\n\n");
}
