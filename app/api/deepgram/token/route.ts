import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mint a short-lived Deepgram API key for browser streaming.
 *
 * Flow:
 *   1. Authenticate the user.
 *   2. Verify DEEPGRAM_API_KEY is set (otherwise caller is in mock mode and
 *      should never hit this route — we still 503 defensively).
 *   3. Discover the Deepgram project ID (cached in-module after first call).
 *   4. Create a temp key with minimal scope (`usage:write`) and 60s TTL.
 *   5. Return `{ token, expires_at }`.
 *
 * The browser opens the WebSocket with:
 *   new WebSocket(url, ["token", token])
 */

let cachedProjectId: string | null = null;

async function getProjectId(apiKey: string): Promise<string> {
  if (cachedProjectId) return cachedProjectId;

  const res = await fetch("https://api.deepgram.com/v1/projects", {
    headers: { Authorization: `Token ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`deepgram_projects_list_failed_${res.status}`);
  }
  const data = (await res.json()) as { projects?: Array<{ project_id: string }> };
  const projectId = data.projects?.[0]?.project_id;
  if (!projectId) {
    throw new Error("deepgram_no_projects");
  }
  cachedProjectId = projectId;
  return projectId;
}

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    // Caller should only hit this route when the server advertises Deepgram
    // capability. 503 rather than 500 so client can fall back cleanly.
    return NextResponse.json({ error: "deepgram_not_configured" }, { status: 503 });
  }

  try {
    const projectId = await getProjectId(apiKey);

    const keyRes = await fetch(
      `https://api.deepgram.com/v1/projects/${projectId}/keys`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: `folio-streaming-${user.id.slice(0, 8)}-${Date.now()}`,
          scopes: ["usage:write"],
          time_to_live_in_seconds: 60,
          tags: ["folio", "streaming"],
        }),
      },
    );

    if (!keyRes.ok) {
      const text = await keyRes.text().catch(() => "");
      console.error(`[deepgram.token] key mint failed (${keyRes.status}): ${text.slice(0, 500)}`);
      return NextResponse.json(
        { error: "deepgram_key_mint_failed" },
        { status: 502 },
      );
    }

    const key = (await keyRes.json()) as { key: string; api_key_id: string };
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    return NextResponse.json({
      token: key.key,
      expires_at: expiresAt,
      model: process.env.DEEPGRAM_MODEL ?? "nova-3",
    });
  } catch (err) {
    console.error("[deepgram.token] error:", err);
    return NextResponse.json({ error: "deepgram_unavailable" }, { status: 502 });
  }
}
