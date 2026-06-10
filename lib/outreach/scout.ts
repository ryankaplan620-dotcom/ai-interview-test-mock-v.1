/**
 * Contact scouting — Engine 3, Step 1.
 *
 * Uses Claude's built-in web_search server tool to find REAL people on
 * LinkedIn matching the target company / role / city. Returns enriched
 * mini-profile data: actual name + title from public profile, LinkedIn URL,
 * an inferred email (pattern-guessed, never claimed as verified), and a
 * public-signal hook the user can reference when reaching out.
 *
 * Falls back to a clearly-labeled mock when ANTHROPIC_API_KEY is missing —
 * the mock contacts have null linkedin_url and email_confidence="unknown" so
 * the UI can render them as placeholder data.
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

export type EmailConfidence = "guessed" | "verified" | "unknown";

export interface ScoutedContact {
  name: string;
  title: string;
  company: string;
  city: string;
  /** LinkedIn profile URL pulled from web_search. Null when not found. */
  linkedin_url: string | null;
  /** Email guess from common B2B patterns. Never claim verified unless we actually verified. */
  inferred_email: string | null;
  email_confidence: EmailConfidence;
  /** Their actual current title/focus from public profile, more specific than `title`. */
  role_signal: string | null;
  /** A public-fact hook from the search results — tenure, prior firm, group focus. */
  tenure_signal: string | null;
  /** Why this specific person — grounded in role_signal + tenure_signal, not generic. */
  relevance_reason: string;
  /** Specific opener referencing the public signal. */
  suggested_approach: string;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

// Anthropic web_search server tool. SDK at 0.32.x doesn't type it; cast at the call site.
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 6,
};

const SUGGEST_CONTACTS_TOOL: Anthropic.Tool = {
  name: "suggest_contacts",
  description:
    "Return real people found via web_search who match the target. Never invent contacts — if you only found 2 real people, return 2. Pull every field directly from the public profile data you saw in web_search results.",
  input_schema: {
    type: "object" as const,
    properties: {
      contacts: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const, description: "Full name exactly as it appears in the LinkedIn profile." },
            title: { type: "string" as const, description: "Their current title from the profile." },
            company: { type: "string" as const, description: "Current employer from the profile." },
            city: { type: "string" as const, description: "Location/city from the profile." },
            linkedin_url: {
              type: "string" as const,
              description: "Full LinkedIn profile URL from the web_search result (e.g. https://www.linkedin.com/in/janedoe/). Null if not in results.",
            },
            inferred_email: {
              type: "string" as const,
              description: "Email guessed from common B2B patterns (first.last@company.com is most common at large firms; firstlast@ for smaller; flast@ for some). Use the actual company domain. Null if you can't make a reasonable guess.",
            },
            email_confidence: {
              type: "string" as const,
              enum: ["guessed", "verified", "unknown"],
              description: "Always 'guessed' unless you actually verified the email. Never 'verified'.",
            },
            role_signal: {
              type: "string" as const,
              description: "Their specific focus / team / sub-discipline from the profile (e.g. 'Industrial & Logistics capital markets', 'Tech recruiting, Series B+'). What makes them distinct from another person with the same title.",
            },
            tenure_signal: {
              type: "string" as const,
              description: "A specific public fact you saw in the search results — tenure, prior firm, recent post, certification, alma mater (only if shared with user). One concrete sentence.",
            },
            relevance_reason: {
              type: "string" as const,
              description: "Why this specific person is worth contacting for THIS target role — must reference role_signal or tenure_signal, not generic 'handles hiring' language.",
            },
            suggested_approach: {
              type: "string" as const,
              description: "Concrete opener referencing the public signal. 'Saw your recent post about [X] — I'm exploring [Y] and would value 15 min.' beats 'connect on LinkedIn'.",
            },
          },
          required: [
            "name",
            "title",
            "company",
            "city",
            "linkedin_url",
            "inferred_email",
            "email_confidence",
            "role_signal",
            "tenure_signal",
            "relevance_reason",
            "suggested_approach",
          ],
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
    console.log(`[scout] No ANTHROPIC_API_KEY — returning mock (rid=${params.requestId})`);
    return mockContacts(params, "no_key");
  }

  try {
    const client = new Anthropic({ apiKey });

    const cityClause = params.targetCity ? ` based in or near ${params.targetCity}` : "";

    const systemPrompt = `You are a networking research assistant. The user is targeting a specific role at a specific company and needs REAL people they could plausibly reach out to.

Your job: use the web_search tool to find real LinkedIn profiles of people who work at the target company in roles relevant to the user's target role (recruiters, hiring managers, current incumbents, adjacent team leads). Then return them via the suggest_contacts tool.

## How to search
- Use queries like: \`site:linkedin.com/in/ "<role>" <company> <city>\` and variations.
- Search for adjacent / relevant roles: the target role itself, recruiters covering it, the hiring manager (one level up), people currently in the target role.
- 3-6 searches is normal; don't over-search.

## What to pull from results
- Name and title EXACTLY as they appear in the LinkedIn snippet.
- Their LinkedIn URL from the result.
- Any concrete public signal in the snippet — their specific team focus, tenure, prior firm, recent activity.

## Hard rules
- NEVER invent a person. If web_search returns 3 real people for the target, return 3 — not 5 padded with hallucinations.
- NEVER mark email_confidence as "verified". You did not verify any email. Always "guessed" for emails you produced from a pattern.
- Email patterns to consider: first.last@domain (most common at large firms), firstlast@ (startups), flast@ (some legacy firms). Pick what's most likely based on the company size/type.
- relevance_reason must reference a real signal from the search results, not a generic "handles hiring."
- suggested_approach must reference something specific (a recent post, a prior firm, a team focus) — not "connect on LinkedIn."

Use the suggest_contacts tool exactly once at the end.`;

    const userPrompt = `Find 4-5 real people I could reach out to about a ${params.targetRole} role at ${params.targetCompany}${cityClause}. Mix of recruiters, hiring managers, and current incumbents if possible. Use web_search to find them and pull data from the actual LinkedIn snippets.`;

    const response = await client.messages.create(
      // Cast: SDK at 0.32 doesn't know about web_search server tool. Runtime accepts it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: [WEB_SEARCH_TOOL, SUGGEST_CONTACTS_TOOL] as unknown as Anthropic.Tool[],
        messages: [{ role: "user", content: userPrompt }],
      },
    );

    // Final response may include server_tool_use + web_search_tool_result + text blocks
    // in addition to the suggest_contacts tool_use. Find the tool_use we care about.
    const toolBlock = response.content.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (b: any) => b.type === "tool_use" && b.name === "suggest_contacts",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as { type: "tool_use"; name: string; input: unknown } | undefined;

    if (!toolBlock) {
      console.warn(`[scout] Claude did not call suggest_contacts (rid=${params.requestId})`);
      return mockContacts(params, "no_tool_block");
    }

    const input = toolBlock.input as { contacts: ScoutedContact[] };
    if (!input.contacts || !Array.isArray(input.contacts)) {
      console.warn(`[scout] suggest_contacts returned no contacts array (rid=${params.requestId})`);
      return mockContacts(params, "empty_contacts");
    }

    return input.contacts.map(normalizeContact).filter((c): c is ScoutedContact => c !== null);
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (err as any)?.status;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[scout] Claude call failed — falling back to mock (rid=${params.requestId}, status=${status}):`,
      msg,
    );
    const reason: MockReason =
      status === 401 ? "invalid_key" : status === 429 ? "rate_limited" : "api_error";
    return mockContacts(params, reason, msg);
  }
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function normalizeContact(c: ScoutedContact): ScoutedContact | null {
  if (!c?.name || !c.title) return null;

  const url = typeof c.linkedin_url === "string" ? c.linkedin_url.trim() : "";
  const linkedin_url = url.startsWith("http") ? url : null;

  const email = typeof c.inferred_email === "string" ? c.inferred_email.trim() : "";
  const inferred_email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;

  // Never trust "verified" from the model — we did not verify anything.
  const confidence: EmailConfidence =
    inferred_email == null ? "unknown" : "guessed";

  return {
    name: c.name.trim(),
    title: c.title.trim(),
    company: (c.company ?? "").trim(),
    city: (c.city ?? "").trim(),
    linkedin_url,
    inferred_email,
    email_confidence: confidence,
    role_signal: c.role_signal?.trim() || null,
    tenure_signal: c.tenure_signal?.trim() || null,
    relevance_reason: (c.relevance_reason ?? "").trim(),
    suggested_approach: (c.suggested_approach ?? "").trim(),
  };
}

// ---------------------------------------------------------------------------
// Mock fallback — distinguishes failure modes so the UI surfaces an actionable
// reason instead of pretending the API key is missing in every case.
// ---------------------------------------------------------------------------

type MockReason =
  | "no_key"
  | "invalid_key"
  | "rate_limited"
  | "api_error"
  | "no_tool_block"
  | "empty_contacts";

function mockContacts(
  params: ScoutParams,
  reason: MockReason,
  detail?: string,
): ScoutedContact[] {
  const city = params.targetCity || "—";

  const messages: Record<MockReason, { headline: string; hint: string }> = {
    no_key: {
      headline: "ANTHROPIC_API_KEY is not set in the server environment.",
      hint: "Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
    },
    invalid_key: {
      headline: "Anthropic rejected the API key (401 invalid x-api-key).",
      hint:
        "Generate a new key at console.anthropic.com → Settings → API Keys, replace it in .env.local, and restart the dev server.",
    },
    rate_limited: {
      headline: "Anthropic rate limit hit (429).",
      hint: "Wait a moment and try again. If this persists, check your account's usage limits.",
    },
    api_error: {
      headline: "The Claude API call failed.",
      hint: detail
        ? `Server log: ${detail.slice(0, 200)}. Check the dev server output for the full stack.`
        : "Check the dev server output for the full error.",
    },
    no_tool_block: {
      headline: "Claude responded without calling suggest_contacts.",
      hint:
        "The model may have refused the search or returned only text. Try again, and if it persists, tighten the system prompt.",
    },
    empty_contacts: {
      headline: "Claude returned a contacts array with no entries.",
      hint: "Web search may have returned no LinkedIn matches for this query — try a broader role or city.",
    },
  };

  const m = messages[reason];

  return [
    {
      name: `[diagnostic: ${reason}]`,
      title: "Scout fallback",
      company: params.targetCompany,
      city,
      linkedin_url: null,
      inferred_email: null,
      email_confidence: "unknown",
      role_signal: null,
      tenure_signal: m.headline,
      relevance_reason: m.hint,
      suggested_approach: "After fixing the underlying issue, click Find contacts again.",
    },
  ];
}
