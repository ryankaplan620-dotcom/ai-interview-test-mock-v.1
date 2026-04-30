/**
 * Contact scouting — Engine 3, Step 1.
 *
 * Uses Claude to generate relevant contact suggestions based on the user's
 * target company, role, and city. Falls back to mock data when ANTHROPIC_API_KEY
 * is not configured.
 */

import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoutParams {
  targetCompany: string;
  targetRole: string;
  targetCity?: string;
  userId: string;
  requestId: string;
}

export interface ScoutedContact {
  name: string;
  title: string;
  company: string;
  city: string;
  relevanceReason: string;
  suggestedApproach: string;
}

// ---------------------------------------------------------------------------
// Claude tool definition
// ---------------------------------------------------------------------------

const SCOUT_TOOL: Anthropic.Tool = {
  name: "suggest_contacts",
  description:
    "Return 5 suggested contacts the candidate should reach out to at the target company.",
  input_schema: {
    type: "object" as const,
    properties: {
      contacts: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            title: { type: "string" as const },
            company: { type: "string" as const },
            city: { type: "string" as const },
            relevanceReason: { type: "string" as const },
            suggestedApproach: { type: "string" as const },
          },
          required: ["name", "title", "company", "city", "relevanceReason", "suggestedApproach"],
        },
      },
    },
    required: ["contacts"],
  },
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function scoutContacts(params: ScoutParams): Promise<ScoutedContact[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log(`[scout] No ANTHROPIC_API_KEY — returning mock contacts (rid=${params.requestId})`);
    return mockContacts(params);
  }

  try {
    const client = new Anthropic({ apiKey });

    const cityContext = params.targetCity ? ` in the ${params.targetCity} office` : "";

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are a career networking advisor. Given a target company, role, and optionally a city/office, suggest 5 specific people (realistic names and titles) the candidate should reach out to. Include a reason why each person is relevant and a concrete approach for reaching out. Make the names realistic and diverse.",
      tools: [SCOUT_TOOL],
      tool_choice: { type: "tool", name: "suggest_contacts" },
      messages: [
        {
          role: "user",
          content: `I'm targeting a ${params.targetRole} position at ${params.targetCompany}${cityContext}. Who should I reach out to?`,
        },
      ],
    });

    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (!toolBlock) {
      console.warn("[scout] Claude did not return tool_use — falling back to mock");
      return mockContacts(params);
    }

    const input = toolBlock.input as { contacts: ScoutedContact[] };
    return input.contacts;
  } catch (err) {
    console.error("[scout] Claude call failed — falling back to mock:", err instanceof Error ? err.message : err);
    return mockContacts(params);
  }
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

function mockContacts(params: ScoutParams): ScoutedContact[] {
  const city = params.targetCity || "New York";
  return [
    {
      name: "Alex Chen",
      title: "Senior Recruiter",
      company: params.targetCompany,
      city,
      relevanceReason: "Handles hiring for the team you're targeting",
      suggestedApproach: "Connect on LinkedIn with a short note referencing the role",
    },
    {
      name: "Jordan Rivera",
      title: "Hiring Manager",
      company: params.targetCompany,
      city,
      relevanceReason: "Manages the team for the open position",
      suggestedApproach: "Send a brief email highlighting a relevant project",
    },
    {
      name: "Sam Patel",
      title: "Director",
      company: params.targetCompany,
      city,
      relevanceReason: "Cross-functional leader who influences hiring decisions",
      suggestedApproach: "Comment on their recent LinkedIn post, then follow up",
    },
    {
      name: "Taylor Kim",
      title: params.targetRole,
      company: params.targetCompany,
      city,
      relevanceReason: "Currently in the role — can share what the team looks for",
      suggestedApproach: "Request an informational chat about their experience",
    },
    {
      name: "Morgan Williams",
      title: "VP of Talent",
      company: params.targetCompany,
      city,
      relevanceReason: "Oversees the recruiting pipeline for your target division",
      suggestedApproach: "Attend a company event they're hosting and introduce yourself",
    },
  ];
}
