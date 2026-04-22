"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIERS, formatPrice, pricePerSessionAtFullUse, tierHasFeature, type LegacyFeatureKey } from "@/lib/tiers";
import type { SubscriptionTier } from "@/types/supabase";

interface PricingClientProps {
  currentTier: SubscriptionTier | null;
  isSignedIn: boolean;
  isVerifiedStudent: boolean;
}

const DISPLAY_ORDER: SubscriptionTier[] = ["free", "basic", "pro", "max"];

const FEATURE_ROWS: { label: string; feature: LegacyFeatureKey }[] = [
  { label: "All 5 recruiter personas", feature: "allPersonas" },
  { label: "Unlimited drill practice", feature: "unlimitedDrills" },
  { label: "Quote-based feedback", feature: "quoteFeedback" },
  { label: "Firm-specific calibration", feature: "firmCalibration" },
  { label: "Cross-session memory", feature: "sessionMemory" },
  { label: "End-of-interview Q&A", feature: "endOfInterviewQA" },
  { label: "Panel interviews", feature: "panelSimulation" },
  { label: "Superday mode", feature: "superdayMode" },
  { label: "True Hard Mode", feature: "hardMode" },
  { label: "Priority feedback generation", feature: "priorityFeedback" },
  { label: "Non-verbal feedback", feature: "nonVerbalFeedback" },
  { label: "Question intelligence engine", feature: "questionIntelligenceEngine" },
];

export function PricingClient({ currentTier, isSignedIn, isVerifiedStudent }: PricingClientProps) {
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handlePurchase(tier: SubscriptionTier) {
    setError(null);

    if (!isSignedIn) {
      router.push(`/signup?redirect=/pricing`);
      return;
    }

    if (tier === "basic" && !isVerifiedStudent) {
      router.push("/settings/verify-student");
      return;
    }

    setLoadingTier(tier);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
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
      <div className="mx-auto max-w-[1100px]">
        <div className="grid gap-6 lg:grid-cols-3">
          {DISPLAY_ORDER.map((tierId) => {
            const tier = TIERS[tierId];
            const isCurrent = currentTier === tierId;
            const isRecommended = tierId === "pro";
            const perSession = pricePerSessionAtFullUse(tierId);
            const buttonLabel = getButtonLabel({
              tierId,
              isCurrent,
              isLoading: loadingTier === tierId,
              isSignedIn,
              requiresVerification: tier.requiresStudentVerification,
              isVerifiedStudent,
            });

            return (
              <div
                key={tierId}
                className={`relative flex flex-col rounded-2xl border p-7 ${
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
                  <h3 className="font-display text-[22px] font-semibold text-text-primary">
                    {tier.label}
                  </h3>
                  <p className="mt-2 font-sans text-[13px] leading-relaxed text-text-secondary">
                    {tier.features[0]}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-[40px] font-semibold text-text-primary">
                      {formatPrice(tier.priceUsd)}
                    </span>
                    <span className="font-sans text-[13px] text-text-tertiary">
                      / {tier.billing.label.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[11px] tracking-label text-text-tertiary">
                    AS LOW AS ${perSession.toFixed(2)} / SESSION
                  </p>
                  {tier.requiresStudentVerification && (
                    <p className="mt-2 font-mono text-[10px] font-medium tracking-label text-accent">
                      VERIFIED STUDENTS ONLY
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handlePurchase(tierId)}
                  disabled={isCurrent || loadingTier === tierId}
                  className={`mt-6 inline-flex h-11 items-center justify-center rounded-full font-sans text-[13.5px] font-semibold transition-all ${
                    isRecommended
                      ? "bg-cta-gradient text-text-onAccent hover:shadow-accent-glow-lg"
                      : isCurrent
                        ? "border border-ink-border bg-transparent text-text-tertiary"
                        : "border border-ink-border bg-ink-raised text-text-primary hover:border-accent hover:text-accent"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {buttonLabel}
                </button>

                {/* Included sessions block — lead with this, it's the core value */}
                <div className="mt-6 rounded-xl border border-ink-border/60 bg-ink-raised/40 px-4 py-3">
                  <p className="font-mono text-[10px] tracking-label text-text-tertiary">INCLUDED</p>
                  <p className="mt-1 font-display text-[20px] font-semibold text-text-primary">
                    {tier.allotments.interviewSessions} full interviews
                  </p>
                  <p className="mt-1 font-sans text-[12px] text-text-secondary">
                    + unlimited drill practice
                  </p>
                  <p className="mt-2 font-sans text-[11.5px] leading-relaxed text-text-tertiary">
                    Need more? ${tier.overage.sessionPriceUsd} per overage session.
                  </p>
                </div>

                <ul className="mt-6 space-y-2.5 border-t border-ink-border/40 pt-5">
                  {FEATURE_ROWS.map((row) => {
                    const included = tierHasFeature(tierId, row.feature);
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

function getButtonLabel(args: {
  tierId: SubscriptionTier;
  isCurrent: boolean;
  isLoading: boolean;
  isSignedIn: boolean;
  requiresVerification: boolean;
  isVerifiedStudent: boolean;
}): string {
  if (args.isLoading) return "Loading...";
  if (args.isCurrent) return "Current plan";
  if (args.requiresVerification && !args.isVerifiedStudent) return "Verify to continue →";
  if (!args.isSignedIn) return "Start free trial →";
  return "Start free trial →";
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
