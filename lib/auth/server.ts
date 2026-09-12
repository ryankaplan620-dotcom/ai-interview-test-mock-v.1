import { redirect } from "next/navigation";
import { cache } from "react";
import { createServerClient } from "@/lib/db/server";
import type { UserProfile, UserTier } from "@/types/supabase";

/**
 * Returns the authenticated user or null.
 * Cached per-request via React.cache so multiple calls in the same render hit Supabase once.
 */
export const getUser = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Returns the authenticated user or redirects to /login.
 * Use in protected Server Components / Route Handlers.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Returns the user's profile row, or null if not signed in.
 * Cached per-request.
 */
export const getProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const { data } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();

  return data;
});

/**
 * Returns the user's effective tier (subscription or trial) and verification status.
 * Cached per-request.
 */
export const getUserTier = cache(async (): Promise<UserTier | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const { data } = await supabase.from("user_tiers").select("*").eq("user_id", user.id).single();

  if (data) return data;

  // Dev fallback: no subscription row → simulate Max tier
  if (process.env.NODE_ENV === "development") {
    return {
      user_id: user.id,
      email: user.email ?? "",
      effective_tier: "max",
      status: "active",
      current_period_end: null,
      trial_end: null,
      cancel_at_period_end: false,
      is_verified_student: false,
      cycle_start: new Date().toISOString(),
      cycle_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      sessions_used_this_cycle: 0,
      overages_used_this_cycle: 0,
      included_sessions: 40,
      sessions_remaining_this_cycle: 40,
      auto_renew: true,
    } satisfies UserTier;
  }

  return null;
});

/**
 * Protects a Server Action or Route Handler — throws if user is not authenticated.
 * Returns the user object.
 */
export async function protect() {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
