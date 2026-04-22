/**
 * Service-role Supabase client.
 *
 * Bypasses RLS — use ONLY on server code where the user isn't authenticated
 * via cookies (webhooks, cron jobs, Tavus callbacks) and you're validating
 * authorization through some other proof (e.g. a conversation_id → session
 * lookup where the session carries user_id).
 *
 * NEVER import this into client components or pass the key to the browser.
 * NEVER expose this behind a user-facing route without explicit authorization
 * checks — it can read and write anyone's data.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL) {
    throw new Error("supabase_url_not_configured");
  }
  if (!key) {
    throw new Error("supabase_service_role_not_configured");
  }

  return createClient(SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
