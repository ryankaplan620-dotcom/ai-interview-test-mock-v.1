import { createServerClient as createServerClientSSR, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qgygwvpruscjuxfhfefd.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneWd3dnBydXNjanV4ZmhmZWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzU3NTIsImV4cCI6MjA5MTcxMTc1Mn0.Male9fY7ZJptkcH0VAzq_k_wUbLod2Kd-VNK8KIdPoA";

export function createServerClient() {
  const cookieStore = cookies();

  return createServerClientSSR<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {}
      },
    },
  }) as unknown as SupabaseClient<Database>;
}

export function createServiceRoleClient(): SupabaseClient<any, "public", any> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  return createServerClientSSR<any>(SUPABASE_URL, serviceRoleKey, {
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
