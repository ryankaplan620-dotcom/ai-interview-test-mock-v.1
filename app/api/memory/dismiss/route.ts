import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Input = z.object({
  memoryId: z.string().uuid(),
  dismissed: z.boolean(),
});

/**
 * POST /api/memory/dismiss
 *
 * Toggle the dismissed flag on a single memory row. RLS ensures the user
 * can only update their own memories — the WHERE user_id = auth.uid()
 * check happens inside the policy, so we don't need to repeat it here.
 *
 * We do NOT allow editing memory_text from this route — only flipping
 * dismissed. Letting users rewrite what an interviewer "remembered" would
 * break the illusion and create an obvious gaming surface.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = createServerClient();

  const updatePayload = {
    dismissed: parsed.data.dismissed,
    dismissed_at: parsed.data.dismissed ? new Date().toISOString() : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("user_session_memory") as any)
    .update(updatePayload)
    .eq("id", parsed.data.memoryId)
    .eq("user_id", user.id) // belt-and-braces; RLS already enforces
    .select("id, dismissed")
    .maybeSingle();

  if (error) {
    console.error("[memory.dismiss] update failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  if (!data) {
    // Row either doesn't exist or isn't owned by this user — RLS hides which
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ id: data.id, dismissed: data.dismissed });
}
