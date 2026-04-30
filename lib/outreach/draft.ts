/**
 * Draft generation — Engine 3, Step 2.
 *
 * Uses Claude to write a personalized cold outreach email. Falls back to
 * mock data when ANTHROPIC_API_KEY is not configured.
 */

import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftParams {
  contactName: string;
  contactTitle: string;
  contactCompany: string;
  userProfile: { name: string; background: string; targetRole: string };
  tone: "professional" | "warm" | "direct";
  requestId: string;
}

export interface GeneratedDraft {
  subject: string;
  body: string;
  wordCount: number;
}

// ---------------------------------------------------------------------------
// Claude tool definition
// ---------------------------------------------------------------------------

const DRAFT_TOOL: Anthropic.Tool = {
  name: "compose_email",
  description:
    "Compose a cold outreach email with a subject line and body. Keep it under 150 words.",
  input_schema: {
    type: "object" as const,
    properties: {
      subject: {
        type: "string" as const,
        description: "Email subject line — concise, specific, no clickbait",
      },
      body: {
        type: "string" as const,
        description: "Email body — under 150 words, no buzzwords, straight to the point",
      },
    },
    required: ["subject", "body"],
  },
};

const SYSTEM_PROMPT =
  "Write a brief, authentic cold outreach email. No buzzwords. No 'I hope this finds you well.' Get to the point in 3 sentences. Be specific about why you're reaching out to THIS person.";

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function generateDraft(params: DraftParams): Promise<GeneratedDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log(`[draft] No ANTHROPIC_API_KEY — returning mock draft (requestId=${params.requestId})`);
    return mockDraft(params);
  }

  const client = new Anthropic({ apiKey });

  const toneInstruction =
    params.tone === "warm"
      ? "Use a warm, conversational tone."
      : params.tone === "direct"
        ? "Be direct and concise — no small talk."
        : "Maintain a professional but approachable tone.";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: `${SYSTEM_PROMPT} ${toneInstruction}`,
    tools: [DRAFT_TOOL],
    tool_choice: { type: "tool", name: "compose_email" },
    messages: [
      {
        role: "user",
        content: [
          `Write a cold outreach email from me to ${params.contactName} (${params.contactTitle} at ${params.contactCompany}).`,
          `About me: My name is ${params.userProfile.name}. Background: ${params.userProfile.background}. I'm targeting: ${params.userProfile.targetRole}.`,
          `Keep it under 150 words. Be specific about why I'm reaching out to this person in this role.`,
        ].join("\n\n"),
      },
    ],
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );

  if (!toolBlock) {
    console.error("[draft] Claude did not return a tool_use block — falling back to mock");
    return mockDraft(params);
  }

  const input = toolBlock.input as { subject: string; body: string };
  const wordCount = input.body.split(/\s+/).filter(Boolean).length;

  return {
    subject: input.subject,
    body: input.body,
    wordCount,
  };
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

function mockDraft(params: DraftParams): GeneratedDraft {
  const body = `Hi ${params.contactName},

I'm ${params.userProfile.name} — ${params.userProfile.background}. I'm reaching out because your work as ${params.contactTitle} at ${params.contactCompany} aligns directly with what I'm building toward as a ${params.userProfile.targetRole}.

I'd love to hear how you think about the role and what the team looks for. Would you have 15 minutes for a quick call this week?

Best,
${params.userProfile.name}`;

  return {
    subject: `Quick question about ${params.contactCompany}'s ${params.contactTitle} team`,
    body,
    wordCount: body.split(/\s+/).filter(Boolean).length,
  };
}
