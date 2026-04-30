/**
 * Contact scouting — Engine 3, Step 1.
 *
 * Uses Claude to generate relevant contact suggestions based on the user's
 * target company and role. Falls back to mock data when ANTHROPIC_API_KEY
 * is not configured.
 */

import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoutParams {
  targetCompany: string;
  targetRole: string;
  userId: string;
  requestId: string;
}

export interface ScoutedContact {
  name: string;
  title: string;
  company: string;
  relevanceReason: string;
  suggestedApproach: string;
}

// ---------------------------------------------------------------------------
// Claude tool definition
// ---------------------------------------------------------------------------

const SCOUT_TOOL: Anthropic.Tool = {
  name: "suggest_contacts",
  description:
    "Return 5 suggested contacts the candidate should reach out to at the target company, each with a relevance reason and suggested approach.",
  input_schema: {
    type: "object" as const,
    properties: {
      contacts: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const, description: "Full name of the contact" },
            title: { type: "string" as const, description: "Job title" },
            company: { type: "string" as const, description: "Company name" },
            relevanceReason: {
              type: "string" as const,
              description: "Why this person is relevant for the candidate's goal",
            },
            suggestedApproach: {
              type: "string" as const,
              description: "A concrete suggestion for how to reach out",
            },
          },
          required: ["name", "title", "company", "relevanceReason", "suggestedApproach"],
        },
        minItems: 5,
        maxItems: 5,
      },
    },
    required: ["contacts"],
  },
};

const SYSTEM_PROMPT =
  "You are a career networking advisor. Given a target company and role, suggest 5 specific people (realistic names and titles) the candidate should reach out to, with a reason why and a suggested approach.";

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function scoutContacts(params: ScoutParams): Promise<ScoutedContact[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log(`[scout] No ANTHROPIC_API_KEY — returning mock contacts (requestId=${params.requestId})`);
    return mockContacts(params);
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [SCOUT_TOOL],
    tool_choice: { type: "tool", name: "suggest_contacts" },
    messages: [
      {
        role: "user",
        content: `I'm targeting a ${params.targetRole} position at ${params.targetCompany}. Who should I reach out to?`,
      },
    ],
  });

  // Extract the tool use block
  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );

  if (!toolBlock) {
    console.error("[scout] Claude did not return a tool_use block — falling back to mock");
    return mockContacts(params);
  }

  const input = toolBlock.input as { contacts: ScoutedContact[] };
  return input.contacts;
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

function mockContacts(params: ScoutParams): ScoutedContact[] {
  return [
    {
      name: "Alex Chen",
      title: "Senior Recruiter",
      company: params.targetCompany,
      relevanceReason: "Handles hiring for the team you're targeting",
      suggestedApproach: "Connect on LinkedIn with a short note referencing the role",
    },
    {
      name: "Jordan Rivera",
      title: "Engineering Manager",
      company: params.targetCompany,
      relevanceReason: "Manages the team for the open position",
      suggestedApproach: "Send a brief email highlighting a relevant project you've built",
    },
    {
      name: "Sam Patel",
      title: "Director of Product",
      company: params.targetCompany,
      relevanceReason: "Cross-functional leader who influences hiring decisions",
      suggestedApproach: "Comment thoughtfully on their recent blog post, then follow up via DM",
    },
    {
      name: "Taylor Kim",
      title: `${params.targetRole}`,
      company: params.targetCompany,
      relevanceReason: "Currently in the role — can share what the team looks for",
      suggestedApproach: "Request an informational chat about their experience on the team",
    },
    {
      name: "Morgan Williams",
      title: "VP of Talent Acquisition",
      company: params.targetCompany,
      relevanceReason: "Oversees the recruiting pipeline for your target division",
      suggestedApproach: "Attend a company recruiting event they're hosting and introduce yourself",
    },
  ];
}
