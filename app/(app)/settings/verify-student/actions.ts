"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import { initiateVerification } from "@/lib/verification/student";
import { createServerClient } from "@/lib/db/server";

export async function startVerification() {
  const user = await requireUser();

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("users") as any)
    .select("email")
    .eq("id", user.id)
    .single();

  const email = (profile as { email?: string } | null)?.email ?? user.email ?? "";

  const result = await initiateVerification({ userId: user.id, email });

  if (result.mode === "sheerid") {
    redirect(result.redirectUrl);
  }

  // edu_email mode
  if (result.status === "already_verified") {
    redirect("/pricing?verified=1");
  }

  // pending — user doesn't have a .edu email; page will show instructions
  redirect("/settings/verify-student?status=pending");
}
