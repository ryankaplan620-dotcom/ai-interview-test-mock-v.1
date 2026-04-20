import { redirect } from "next/navigation";
import { cache } from "react";
import { createServerClient } from "@/lib/db/server";
import type { Profile, UserTier } from "@/types/supabase";

/**
 * Returns the authenticated user or null.
 * Cached per-request via React.cache so multiple calls in the same render hit Supabase once.
 */
export const getUser = cache(async () => {
  const supabase = createServerClient();
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
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = createServerClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return data;
});

/**
 * Returns the user's effective tier (subscription or trial) and verification status.
 * Cached per-request.
 */
export const getUserTier = cache(async (): Promise<UserTier | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = createServerClient();
  const { data } = await supabase.from("user_tiers").select("*").eq("user_id", user.id).single();

  return data;
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
