import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import { RATE_LIMITS } from "@/lib/rate-limit";
import { withRateLimit } from "@/lib/rate-limit/middleware";
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
 * Rate limited per-user: 3 per 10 minutes, 20 per 24 hours. The idempotent
 * re-entry path (session already has tavus_conversation_url) is NOT
 * rate-limited — we return cached before the check... well, actually, we
 * can't. The rate-limit wrapper runs before the handler. That's intentional:
 * even cached fetches should be bounded, or a client-side retry loop could
 * hammer the endpoint at >100 QPS. Legitimate cache-hit flows use at most
 * 1-2 calls per session, so the 3/10min limit is comfortably safe.
 *
 * Context composition:
 *   1. Persona base (mode, interview type, length hint)
 *   2. Memory block (Phase I.1) — prior-session notes for (user, persona) pair
 *   3. Q&A overlay (Phase I.2) — universal end-of-interview Q&A instructions
 *   4. Opening instruction — greeting + resume walk
 */
async function handler(req: NextRequest, { user }: { user: { id: string } }) {
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

  // Idempotent re-entry — return cached, skip memory surfacing
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

  // Phase I.1: memory pull
  const memories: MemoryNote[] = await loadMemoriesForSession({
    userId: session.user_id,
    personaId: session.persona,
  });

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
  const webhookSecret = process.env.TAVUS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[tavus.conversation] TAVUS_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }
  // Secret is embedded in the callback URL path. Tavus doesn't support custom
  // webhook headers, so this is the standard workaround. The URL is TLS-
  // encrypted end-to-end. See app/api/tavus/webhook/[secret]/route.ts for
  // the verification side.
  const callbackUrl = `${baseUrl}/api/tavus/webhook/${encodeURIComponent(webhookSecret)}`;

  let tavusRes;
  try {
    tavusRes = await createTavusConversation({
      personaId: tavusPersonaId,
      replicaId,
      sessionId: session.id,
      conversationalContext,
      callbackUrl,
      maxDurationSeconds: session.duration_seconds + 300,
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

  if (memories.length > 0) {
    await markMemoriesSurfaced(memories.map((m) => m.id));
  }

  return NextResponse.json({
    conversationUrl: tavusRes.conversation_url,
    conversationId: tavusRes.conversation_id,
    cached: false,
  });
}

export const POST = withRateLimit(RATE_LIMITS.tavus_conversation, handler);

// --------------------------------------------------------------------------
// Context builder (unchanged from Phase I.2)
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

  const minutes = Math.round(args.durationSeconds / 60);
  basePieces.push(`The session is scheduled for approximately ${minutes} minutes.`);

  sections.push(basePieces.join(" "));

  const memoryBlock = formatMemoriesForContext(args.memories, args.personaFirstName);
  if (memoryBlock) {
    sections.push(memoryBlock);
  }

  sections.push(renderQaOverlay(args.personaName));

  sections.push(
    "Begin by greeting the candidate briefly and asking them to walk you through their resume. Stay in character throughout. Do not break the interview frame, do not mention that you are an AI.",
  );

  return sections.join("\n\n");
}
