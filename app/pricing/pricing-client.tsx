"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIERS, formatPrice, type TierConfig } from "@/lib/tiers";
import type { SubscriptionTier, BillingCycle } from "@/types/supabase";

interface PricingClientProps {
  currentTier: SubscriptionTier | null;
  isSignedIn: boolean;
  isVerifiedStudent: boolean;
}

const DISPLAY_ORDER: SubscriptionTier[] = ["student", "general", "pro", "max"];

const FEATURE_ROWS: { label: string; feature: keyof TierConfig["features"] }[] = [
  { label: "Unlimited practice sessions", feature: "unlimitedSessions" },
  { label: "All 5 recruiter personas", feature: "allPersonas" },
  { label: "Quote-based feedback", feature: "quoteFeedback" },
  { label: "Firm calibration", feature: "firmCalibration" },
  { label: "Panel simulation", feature: "panelSimulation" },
  { label: "End-of-interview Q&A", feature: "endOfInterviewQA" },
  { label: "Pause coaching", feature: "pauseCoaching" },
  { label: "Voice acoustic analysis", feature: "voiceAcousticAnalysis" },
  { label: "Cross-session memory", feature: "sessionMemory" },
  { label: "Superday mode", feature: "superdayMode" },
  { label: "True Hard Mode", feature: "hardMode" },
  { label: "Non-verbal feedback", feature: "nonVerbalFeedback" },
  { label: "Question intelligence engine", feature: "questionIntelligenceEngine" },
  { label: "Interviewer callback", feature: "callback" },
];

export function PricingClient({ currentTier, isSignedIn, isVerifiedStudent }: PricingClientProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleUpgrade(tier: SubscriptionTier) {
    setError(null);

    if (!isSignedIn) {
      router.push(`/signup?redirect=/pricing`);
      return;
    }

    if (tier === "student" && !isVerifiedStudent) {
      router.push("/settings/verify-student");
      return;
    }

    setLoadingTier(tier);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", tier, billingCycle }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <section className="relative px-6 pb-16 sm:px-10">
      <div className="mx-auto max-w-[1200px]">
        {/* Billing cycle toggle */}
        <div className="mb-10 flex justify-center">
          <div className="inline-flex rounded-full border border-ink-border bg-ink-surface p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-4 py-2 font-sans text-[13px] font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-accent text-text-onAccent"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-full px-4 py-2 font-sans text-[13px] font-medium transition-colors ${
                billingCycle === "yearly"
                  ? "bg-accent text-text-onAccent"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Yearly <span className="ml-1 text-[11px] opacity-80">—20%</span>
            </button>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid gap-5 lg:grid-cols-4">
          {DISPLAY_ORDER.map((tierId) => {
            const tier = TIERS[tierId];
            const isCurrent = currentTier === tierId;
            const isRecommended = tierId === "pro";
            const price = billingCycle === "monthly" ? tier.monthlyPrice : tier.yearlyMonthlyEquivalent;
            const totalBilled = billingCycle === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;

            return (
              <div
                key={tierId}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  isRecommended
                    ? "border-accent bg-gradient-to-br from-ink-surface to-ink-raised shadow-accent-glow"
                    : "border-ink-border bg-ink-surface"
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 font-mono text-[10px] font-semibold tracking-label text-text-onAccent">
                    MOST POPULAR
                  </span>
                )}

                <div>
                  <h3 className="font-display text-[20px] font-semibold text-text-primary">
                    {tier.name}
                  </h3>
                  <p className="mt-1 font-sans text-[13px] leading-relaxed text-text-secondary">
                    {tier.tagline}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-[36px] font-semibold text-text-primary">
                      {formatPrice(price)}
                    </span>
                    <span className="font-sans text-[13px] text-text-tertiary">/mo</span>
                  </div>
                  {billingCycle === "yearly" && tier.monthlyPrice > 0 && (
                    <p className="mt-1 font-sans text-[11px] text-text-tertiary">
                      {formatPrice(totalBilled)} billed yearly
                    </p>
                  )}
                  {tier.requiresVerification && (
                    <p className="mt-1 font-mono text-[10px] font-medium tracking-label text-accent">
                      VERIFIED STUDENTS ONLY
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleUpgrade(tierId)}
                  disabled={isCurrent || loadingTier === tierId}
                  className={`mt-6 inline-flex h-10 items-center justify-center rounded-full font-sans text-[13px] font-semibold transition-all ${
                    isRecommended
                      ? "bg-cta-gradient text-text-onAccent hover:shadow-accent-glow-lg"
                      : isCurrent
                        ? "border border-ink-border bg-transparent text-text-tertiary"
                        : "border border-ink-border bg-ink-raised text-text-primary hover:border-accent hover:text-accent"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {loadingTier === tierId
                    ? "Loading..."
                    : isCurrent
                      ? "Current plan"
                      : tier.requiresVerification && !isVerifiedStudent
                        ? "Verify to continue →"
                        : isSignedIn
                          ? "Upgrade →"
                          : "Start free →"}
                </button>

                <ul className="mt-8 space-y-3 border-t border-ink-border/40 pt-6">
                  {FEATURE_ROWS.map((row) => {
                    const included = tier.features[row.feature];
                    return (
                      <li key={row.feature} className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center ${
                            included ? "text-accent" : "text-text-tertiary/40"
                          }`}
                          aria-hidden
                        >
                          {included ? <CheckIcon /> : <DashIcon />}
                        </span>
                        <span
                          className={`font-sans text-[12.5px] leading-relaxed ${
                            included ? "text-text-primary" : "text-text-tertiary"
                          }`}
                        >
                          {row.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-6 text-center font-sans text-[13px] text-rose-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path
        d="M3.5 8.5L6.5 11.5L12.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path d="M4 8H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
