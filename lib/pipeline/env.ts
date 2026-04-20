/**
 * Environment detection for the voice pipeline.
 *
 * Each external service (Claude, Deepgram, ElevenLabs, Simli) falls back to
 * mock mode if its API key is missing — so local dev works without keys and
 * individual services can be brought online one at a time.
 *
 * Can be force-overridden by FOLIO_FORCE_MOCK_PIPELINE=true (useful for
 * testing UX behaviour even when all keys are set).
 */

type ServiceKey = "claude" | "deepgram" | "elevenlabs" | "simli";

function forceMockAll(): boolean {
  return process.env.FOLIO_FORCE_MOCK_PIPELINE === "true";
}

export function shouldMock(service: ServiceKey): boolean {
  if (forceMockAll()) return true;
  switch (service) {
    case "claude":
      return !process.env.ANTHROPIC_API_KEY;
    case "deepgram":
      return !process.env.DEEPGRAM_API_KEY;
    case "elevenlabs":
      return !process.env.ELEVENLABS_API_KEY;
    case "simli":
      return !process.env.SIMLI_API_KEY;
  }
}

/**
 * Client-side services check what the server told them in the route response.
 * This export is the server-authoritative function; the client gets the
 * answer via /api/interview/opening's first frame (mode: 'mock' | 'real').
 */
export const env = {
  interviewModel: () => process.env.ANTHROPIC_MODEL_INTERVIEW ?? "claude-sonnet-4-6",
  feedbackModel: () => process.env.ANTHROPIC_MODEL_FEEDBACK ?? "claude-sonnet-4-6",
  elevenLabsModel: () => process.env.ELEVENLABS_MODEL ?? "eleven_turbo_v2_5",
  deepgramModel: () => process.env.DEEPGRAM_MODEL ?? "nova-3",
};
