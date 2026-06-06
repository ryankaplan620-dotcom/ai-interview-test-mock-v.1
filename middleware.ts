import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

/**
 * Routes that require authentication.
 * Unauthenticated users are redirected to /login.
 */
const PROTECTED_ROUTES = ["/dashboard", "/session", "/settings", "/account", "/outreach", "/practice"];

/**
 * Routes that should only be shown to unauthenticated users.
 * Authenticated users visiting these are redirected to /dashboard.
 */
const AUTH_ONLY_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured — skip auth checks, let pages handle gracefully
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  // Refresh session — this writes new cookies if the session expired but is refreshable
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthOnly = AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthOnly && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - Static files (.png, .jpg, .svg, .ico, etc.)
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - api/stripe/webhook (Stripe webhooks don't have user sessions)
     * - api/tavus/webhook  (Tavus webhooks don't have user sessions; the
     *     middleware's auth-refresh reads request.body, which breaks webhook
     *     payload handling in the route. Must be excluded for the same reason
     *     as Stripe's webhook.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/tavus/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
