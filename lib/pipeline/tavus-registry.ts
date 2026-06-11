/**
 * Tavus persona registry.
 *
 * Tavus personas live on their side (created via POST /v2/personas) and are
 * referenced by persona_id + replica_id when creating a conversation.
 *
 * For Phase G.1 we use stock replicas and create the three Folio personas
 * programmatically on first use. The resulting IDs are stored in env vars:
 *
 *   TAVUS_PERSONA_ID_SARAH=p...
 *   TAVUS_REPLICA_ID_SARAH=r...  (which stock replica face)
 *   ... for each of the three personas
 *
 * Phase G.2 will migrate to custom-trained replicas per persona.
 *
 * If env vars aren't set, we fall back to a sane default (Tavus stock persona
 * + stock replica) and log — useful for smoke-testing the integration before
 * all 3 personas are registered.
 */

import type { PersonaId } from "@/types/supabase";

// Tavus stock replica IDs — documented defaults, usable without custom training.
// Ref: https://docs.tavus.io/sections/replica/stock-replicas
// These are guesses at sensible matches; verify in the Tavus Developer Portal
// against who you actually want as each persona.
const STOCK_REPLICA_DEFAULTS: Record<PersonaId, string> = {
  sarah: "r12d3eb75ec2", // Helen - Casual (phoenix-4)
  gemma: "r5dc7c7d0bcb", // Gemma Brooks — her real replica (face)
};

// Tavus persona IDs created on Tavus's side (POST /v2/personas). An env var
// overrides the default; the default lets a persona work out of the box.
const TAVUS_PERSONA_DEFAULTS: Record<PersonaId, string | null> = {
  sarah: null,
  gemma: "p2e9f033911b",
};

export function getTavusPersonaId(personaId: PersonaId): string | null {
  const envKey = `TAVUS_PERSONA_ID_${personaId.toUpperCase()}`;
  return process.env[envKey] ?? TAVUS_PERSONA_DEFAULTS[personaId] ?? null;
}

export function getTavusReplicaId(personaId: PersonaId): string {
  const envKey = `TAVUS_REPLICA_ID_${personaId.toUpperCase()}`;
  return process.env[envKey] ?? STOCK_REPLICA_DEFAULTS[personaId];
}

export function tavusConfigured(): boolean {
  return !!process.env.TAVUS_API_KEY;
}
