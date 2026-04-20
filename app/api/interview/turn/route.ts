import { NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { shouldMock } from "@/lib/pipeline/env";
import { streamClaudeTurn } from "@/lib/pipeline/claude";
import { mockClaudeResponse, streamMockChunks } from "@/lib/pipeline/mock-claude";
import type { StreamEvent, ConversationContext, ConversationTurn } from "@/lib/pipeline/types";
import type { PersonaId, InterviewType, SessionMode } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --------------------------------------------------------------------------
// Input
// --------------------------------------------------------------------------

const TurnInput = z.object({
  sessionId: z.string().uuid(),
  isOpening: z.boolean().default(false),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        startedAtMs: z.number().int().nonnegative(),
        endedAtMs: z.number().int().nullable(),
      }),
    )
    .default([]),
});

// --------------------------------------------------------------------------
// Route — POST streams SSE back
// --------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = TurnInput.safeParse(json);
  if (!parsed.success) return new Response("bad_request", { status: 400 });

  // Load the session to rebuild ConversationContext server-side (don't trust client)
  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select(
      "id, user_id, persona, interview_type, mode, target_firm, target_role, duration_seconds, status",
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
      }
    | null;

  if (!session || session.user_id !== user.id) {
    return new Response("not_found", { status: 404 });
  }
  if (["completed", "abandoned", "failed"].includes(session.status)) {
    return new Response("session_ended", { status: 409 });
  }

  // Fetch profile for candidate first name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("full_name")
    .eq("id", user.id)
    .single();
  const firstName =
    (profile as { full_name: string | null } | null)?.full_name?.split(" ")[0] ?? null;

  const ctx: ConversationContext = {
    sessionId: session.id,
    personaId: session.persona,
    interviewType: session.interview_type,
    mode: session.mode,
    targetFirm: session.target_firm,
    targetRole: session.target_role,
    candidateFirstName: firstName,
    targetDurationMinutes: Math.round(session.duration_seconds / 60),
  };

  const history = parsed.data.history as ConversationTurn[];
  const isOpening = parsed.data.isOpening;
  const turnStartedAtMs = Date.now();

  // --------------------------------------------------------------------
  // SSE stream
  // --------------------------------------------------------------------

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        const line = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      try {
        if (shouldMock("claude")) {
          await runMock(ctx, history, isOpening, turnStartedAtMs, emit);
        } else {
          await streamClaudeTurn({
            ctx,
            history,
            isOpening,
            emit,
            turnStartedAtMs,
            signal: req.signal,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "stream_failed";
        emit({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// --------------------------------------------------------------------------
// Mock driver
// --------------------------------------------------------------------------

async function runMock(
  ctx: ConversationContext,
  history: ConversationTurn[],
  isOpening: boolean,
  turnStartedAtMs: number,
  emit: (e: StreamEvent) => void,
) {
  emit({ type: "start", turnStartedAtMs });

  const turnIndex = isOpening ? 0 : Math.ceil(history.length / 2);
  const lastUser = [...history].reverse().find((t) => t.role === "user")?.content ?? "";
  const fullText = mockClaudeResponse({ ctx, turnIndex, lastUserTurn: lastUser });

  // Stream chunks with realistic pacing
  let sentenceIndex = 0;
  let sentenceBuffer = "";
  for (const delta of streamMockChunks(fullText)) {
    await sleep(40 + Math.random() * 40);
    emit({ type: "text", delta });
    sentenceBuffer += delta;
    const match = sentenceBuffer.match(/^(.*?[.!?]+)(\s+|$)/);
    if (match) {
      const sentence = match[1].trim();
      if (sentence.length > 3) {
        emit({ type: "sentence", sentence, sentenceIndex });
        sentenceIndex += 1;
      }
      sentenceBuffer = sentenceBuffer.slice(match[0].length);
    }
  }
  if (sentenceBuffer.trim().length > 0) {
    emit({ type: "sentence", sentence: sentenceBuffer.trim(), sentenceIndex });
  }

  emit({ type: "done", fullText, turnEndedAtMs: Date.now() });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
