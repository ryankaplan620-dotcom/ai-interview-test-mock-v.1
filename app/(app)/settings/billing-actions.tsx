"use client";

import { useState } from "react";
import Link from "next/link";
import type { SubscriptionTier } from "@/types/supabase";

export function BillingActions({
  tier: _tier,
  hasSubscription,
}: {
  tier: SubscriptionTier;
  hasSubscription: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to open portal");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  // No active subscription — offer a purchase
  if (!hasSubscription) {
    return (
      <div>
        <Link
          href="/pricing"
          className="inline-flex h-10 items-center rounded-full bg-cta-gradient px-5 font-sans text-[13px] font-semibold text-text-onAccent transition-all hover:shadow-accent-glow-lg"
        >
          Choose a plan →
        </Link>
      </div>
    );
  }

  // Active subscription — portal + change plan
  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={openPortal}
        disabled={loading}
        className="inline-flex h-10 items-center rounded-full border border-ink-border bg-ink-raised px-5 font-sans text-[13px] font-medium text-text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
      >
        {loading ? "Opening..." : "Manage billing →"}
      </button>
      <Link
        href="/pricing"
        className="inline-flex h-10 items-center rounded-full border border-ink-border bg-ink-raised px-5 font-sans text-[13px] font-medium text-text-primary transition-colors hover:border-accent hover:text-accent"
      >
        Change plan
      </Link>
      {error && (
        <p className="w-full font-sans text-[13px] text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
