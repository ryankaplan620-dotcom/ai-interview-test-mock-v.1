"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="font-sans text-[13.5px] font-medium tracking-body text-text-tertiary transition-colors hover:text-accent"
    >
      Sign out
    </button>
  );
}
