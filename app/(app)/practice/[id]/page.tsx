import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { DRILL_TYPES, getStoryPolishingPrompt } from "@/lib/practice/drills";
import { shouldMock } from "@/lib/pipeline/env";
import type { DrillType, DrillStatus } from "@/types/supabase";
import { PracticeView } from "./practice-view";

interface PageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function DrillRoomPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: drillRaw } = await (supabase.from("drills") as any)
    .select("id, user_id, drill_type, prompt_id, prompt_text, config, status, started_at")
    .eq("id", params.id)
    .single();

  const drill = drillRaw as
    | {
        id: string;
        user_id: string;
        drill_type: DrillType;
        prompt_id: string;
        prompt_text: string;
        config: Record<string, unknown>;
        status: DrillStatus;
        started_at: string | null;
      }
    | null;

  if (!drill || drill.user_id !== user.id) notFound();

  // Terminal drills — send to the completion screen within practice-view
  // (practice-view handles the "drill done" state via prior attempts)

  // Load prior attempts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: attemptsRaw } = await (supabase.from("drill_attempts") as any)
    .select("*")
    .eq("drill_id", drill.id)
    .order("attempt_number", { ascending: true });

  const attempts = (attemptsRaw as Array<{
    id: string;
    drill_id: string;
    attempt_number: number;
    transcript: string;
    duration_seconds: number;
    overall_score: number | null;
    sub_scores: Record<string, number>;
    summary: string | null;
    strengths: string[] | null;
    improvements: string[] | null;
    filler_words: Record<string, number> | null;
    filler_count: number | null;
    words_per_minute: number | null;
    created_at: string;
  }> | null) ?? [];

  const drillConfig = DRILL_TYPES[drill.drill_type];
  if (!drillConfig) notFound();

  // Story polishing specific — load prompt metadata for "what it's looking for" guidance
  const promptMeta =
    drill.drill_type === "story_polishing" ? getStoryPolishingPrompt(drill.prompt_id) : null;

  return (
    <PracticeView
      drill={{
        id: drill.id,
        drillType: drill.drill_type,
        promptId: drill.prompt_id,
        promptText: drill.prompt_text,
        status: drill.status,
        targetAttempts: drillConfig.targetAttempts,
        maxAttemptSeconds: drillConfig.maxAttemptSeconds,
        whatItsLookingFor: promptMeta?.whatItsLookingFor ?? null,
      }}
      attempts={attempts}
      mockMode={shouldMock("deepgram") || shouldMock("claude")}
    />
  );
}
