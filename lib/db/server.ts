import { createServerClient as createServerClientSSR, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Supabase server client for use in Server Components and Route Handlers.
 *
 * This client reads auth state from cookies and can write to cookies
 * for session refresh. Use this in any server-side context where you
 * need to identify the user.
 */
export function createServerClient() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are not set. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    );
  }

  return createServerClientSSR<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component; set is a no-op there.
          // Middleware handles session refresh.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Ignore in Server Components.
        }
      },
    },
  }) as unknown as SupabaseClient<Database>;
}

/**
 * Supabase admin client using the service role key.
 * Bypasses RLS. ONLY use in server-side code where you know it's safe.
 * Never expose service role key to client.
 *
 * Returns an any-typed client to work around @supabase/ssr's strict generics
 * on inserts/upserts with hand-rolled Database types. In production, replace
 * the hand-rolled types in types/supabase.ts with generated types via:
 *   npx supabase gen types typescript --project-id <id> > types/supabase.ts
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServiceRoleClient(): SupabaseClient<any, "public", any> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Service role environment variables missing. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClientSSR<any>(supabaseUrl, serviceRoleKey, {
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
