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
      className="inline-flex h-9 items-center rounded-full px-3 font-sans text-[13px] font-medium tracking-body text-text-tertiary transition-colors hover:bg-white/[0.06] hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
    >
      Sign out
    </button>
  );
}
