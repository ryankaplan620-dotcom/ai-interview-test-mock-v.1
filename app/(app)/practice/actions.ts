"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import {
  DRILL_TYPES,
  getPitch60sPrompt,
  getPushbackPrompt,
  isDrillTypeAvailable,
} from "@/lib/practice/drills";

const StartDrillInput = z.object({
  drillType: z.enum(["pitch_60s", "pause_drill", "pushback_drill"]),
  promptId: z.string().min(1).max(100),
});

type StartDrillResult =
  | { ok: true; drillId: string }
  | { ok: false; error: string };

export async function startDrill(input: z.infer<typeof StartDrillInput>): Promise<StartDrillResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = StartDrillInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "bad_request" };

  const { drillType, promptId } = parsed.data;

  if (!isDrillTypeAvailable(drillType)) {
    return { ok: false, error: "drill_type_not_available" };
  }

  const drillConfig = DRILL_TYPES[drillType];

  // Resolve the prompt text from the registry based on drill type.
  // For pushback drills, prompt_text stores the initial question; the pushback
  // line lives in the prompt registry and is re-resolved at render time.
  let promptText: string;
  if (drillType === "pitch_60s") {
    const prompt = getPitch60sPrompt(promptId);
    if (!prompt) return { ok: false, error: "unknown_prompt" };
    promptText = prompt.text;
  } else if (drillType === "pushback_drill") {
    const prompt = getPushbackPrompt(promptId);
    if (!prompt) return { ok: false, error: "unknown_prompt" };
    promptText = prompt.initial;
  } else {
    return { ok: false, error: "drill_type_not_implemented" };
  }

  const supabase = await createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase.from("drills") as any)
    .insert({
      user_id: user.id,
      drill_type: drillType,
      prompt_id: promptId,
      prompt_text: promptText,
      config: { target_attempts: drillConfig.targetAttempts },
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[startDrill] insert failed:", error);
    return { ok: false, error: "Failed to create drill. Please try again." };
  }

  return { ok: true, drillId: (inserted as { id: string }).id };
}

/**
 * Server action wrapper that starts the drill and redirects. Used from the
 * picker where we don't want to expose the intermediate drill ID to the client.
 */
export async function startDrillAndRedirect(input: z.infer<typeof StartDrillInput>) {
  const result = await startDrill(input);
  if (!result.ok) {
    redirect(`/practice?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/practice/${result.drillId}`);
}

/**
 * Abandon a drill in progress. Called from practice-view on explicit abandon
 * or from a pagehide beacon.
 */
export async function abandonDrill(drillId: string): Promise<{ ok: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false };

  const supabase = await createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: drillRaw } = await (supabase.from("drills") as any)
    .select("id, user_id, status")
    .eq("id", drillId)
    .single();

  const drill = drillRaw as { id: string; user_id: string; status: string } | null;
  if (!drill || drill.user_id !== user.id) return { ok: false };
  if (drill.status !== "in_progress") return { ok: true };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("drills") as any)
    .update({ status: "abandoned", ended_at: new Date().toISOString() })
    .eq("id", drillId);

  return { ok: true };
}
