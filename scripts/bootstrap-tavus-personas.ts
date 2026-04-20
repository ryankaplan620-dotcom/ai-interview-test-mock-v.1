/**
 * Tavus persona bootstrap.
 *
 * One-time setup: creates the 5 Folio personas (Priya, Marcus, Sarah, David,
 * Jennifer) on Tavus using their system prompts from lib/personas. Prints the
 * resulting persona IDs as env var assignments you can paste into .env.local.
 *
 * Usage:
 *   TAVUS_API_KEY=... npx tsx scripts/bootstrap-tavus-personas.ts
 *
 * Re-running is safe — Tavus allows multiple personas with the same name, but
 * you probably only want to run this once and then keep the resulting IDs.
 * If you re-run, delete the old personas in the Tavus dashboard first or you'll
 * accumulate duplicates.
 */

import { PERSONAS, composeSystemPrompt } from "../lib/personas";
import { getTavusReplicaId } from "../lib/pipeline/tavus-registry";
import type { PersonaId } from "../types/supabase";

async function createTavusPersona(personaId: PersonaId): Promise<string> {
  const persona = PERSONAS[personaId];
  // Compose the "standard" mode system prompt — Tavus personas are created
  // once and don't vary per session; difficulty overlays get layered in per
  // conversation via conversational_context instead.
  const composed = composeSystemPrompt(persona, {
    mode: "standard",
    interviewType: "behavioral",
    targetDurationMinutes: 30,
  });
  const systemPrompt = composed.systemPrompt;

  const replicaId = getTavusReplicaId(personaId);

  const payload = {
    persona_name: `Folio — ${persona.name}`,
    pipeline_mode: "full",
    system_prompt: systemPrompt,
    context: `You are ${persona.name}, ${persona.title} at ${persona.firm}. You are conducting a practice interview. Stay in character at all times.`,
    default_replica_id: replicaId,
    layers: {
      llm: {
        // Tavus's default LLM. To route through Claude, set model to an
        // OpenAI-compatible endpoint pointing to our /api/tavus/llm route.
        // Phase G.1 uses Tavus's built-in model for simplicity + latency.
        model: "tavus-claude-haiku-4.5",
      },
      // Tavus will pick a reasonable TTS voice based on the replica.
      // Phase G.2 can bring custom voice IDs via `tts.voice_id`.
    },
  };

  const res = await fetch("https://tavusapi.com/v2/personas", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TAVUS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create ${personaId}: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { persona_id: string; persona_name: string };
  console.log(`  ✓ ${persona.name.padEnd(20)} → ${data.persona_id}`);
  return data.persona_id;
}

async function main() {
  if (!process.env.TAVUS_API_KEY) {
    console.error("❌ TAVUS_API_KEY not set. Export it and re-run.");
    process.exit(1);
  }

  console.log("Creating Folio personas on Tavus...\n");

  const ids: Record<PersonaId, string> = {} as Record<PersonaId, string>;
  const personaIds: PersonaId[] = ["priya", "marcus", "sarah", "david", "jennifer"];

  for (const pid of personaIds) {
    try {
      ids[pid] = await createTavusPersona(pid);
    } catch (err) {
      console.error(`  ✗ ${pid}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Paste these into .env.local:\n");
  for (const pid of personaIds) {
    if (ids[pid]) {
      console.log(`TAVUS_PERSONA_ID_${pid.toUpperCase()}=${ids[pid]}`);
    }
  }
  console.log("\nReplicas (verify these are the faces you want — swap in Tavus portal):");
  for (const pid of personaIds) {
    console.log(`TAVUS_REPLICA_ID_${pid.toUpperCase()}=${getTavusReplicaId(pid)}`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
