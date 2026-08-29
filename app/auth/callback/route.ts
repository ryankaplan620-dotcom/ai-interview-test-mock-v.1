import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/db/server";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";

/**
 * GET /auth/callback
 *
 * Handles both magic link sign-ins and signup email confirmations.
 * Exchanges the code in the URL for a session, then redirects.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "";
  // Only allow local paths to prevent open redirect attacks
  const next = safeRedirectPath(rawNext);

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[Auth Callback] Code exchange failed:", error);
    return NextResponse.redirect(new URL("/login?error=auth_failed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
