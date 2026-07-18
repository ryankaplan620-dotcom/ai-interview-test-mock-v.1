"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleSignOut() {
    setPending(true);
    setError(false);
    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("[SignOutButton] sign out failed:", err);
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={handleSignOut}
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-9 items-center rounded-full px-3 font-sans text-[13px] font-medium tracking-body text-text-tertiary transition-colors hover:bg-white/[0.06] hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing out..." : "Sign out"}
      </button>
      {error && (
        <p className="font-sans text-[11px] text-red-400" role="alert">
          Couldn&apos;t sign out. Try again.
        </p>
      )}
    </div>
  );
}
