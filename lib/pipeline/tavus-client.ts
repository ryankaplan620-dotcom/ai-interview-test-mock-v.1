/**
 * Tavus CVI client.
 *
 * Thin wrapper around the handful of Tavus REST endpoints we actually use:
 *   - POST /v2/conversations     → start a session
 *   - POST /v2/conversations/:id/end → explicit end
 *
 * Persona creation (POST /v2/personas) is a one-time setup task handled by
 * `scripts/bootstrap-tavus-personas.ts` — the running app assumes persona IDs
 * already exist and are in env vars.
 */

const TAVUS_API_BASE = "https://tavusapi.com/v2";

export interface CreateConversationInput {
  personaId: string;
  replicaId: string;
  /** Our internal session ID. Used as conversation_name for traceability. */
  sessionId: string;
  /** Extra context layered on top of persona's system_prompt. */
  conversationalContext: string;
  /** Where Tavus posts transcript + shutdown webhooks. */
  callbackUrl: string;
  /** Max call duration in seconds. Tavus caps conversation length. */
  maxDurationSeconds?: number;
  /** First line the replica speaks. */
  customGreeting?: string;
}

export interface CreateConversationResponse {
  conversation_id: string;
  conversation_url: string;
  status: string;
}

export async function createTavusConversation(
  input: CreateConversationInput,
): Promise<CreateConversationResponse> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) throw new Error("tavus_not_configured");

  const payload = {
    persona_id: input.personaId,
    replica_id: input.replicaId,
    conversation_name: `folio-${input.sessionId.slice(0, 8)}`,
    conversational_context: input.conversationalContext,
    callback_url: input.callbackUrl,
    custom_greeting: input.customGreeting,
    properties: {
      enable_recording: false,
      max_call_duration: input.maxDurationSeconds ?? 1800,
      // Tavus shuts the room down if the user never joins within this window
      participant_absent_timeout: 90,
      // Shuts down if the user leaves and doesn't return
      participant_left_timeout: 30,
    },
  };

  const res = await fetch(`${TAVUS_API_BASE}/conversations`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`tavus_create_conversation_failed_${res.status}_${text.slice(0, 200)}`);
  }

  return (await res.json()) as CreateConversationResponse;
}

export async function endTavusConversation(conversationId: string): Promise<void> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) throw new Error("tavus_not_configured");

  const res = await fetch(`${TAVUS_API_BASE}/conversations/${conversationId}/end`, {
    method: "POST",
    headers: { "x-api-key": apiKey },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Swallow idempotent end errors — room may already be gone
    if (res.status === 404 || res.status === 409) return;
    throw new Error(`tavus_end_conversation_failed_${res.status}_${text.slice(0, 200)}`);
  }
}
