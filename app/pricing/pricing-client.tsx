"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIERS, formatPrice, pricePerSessionAtFullUse, tierHasFeature, hasUnlimitedInterviews, type LegacyFeatureKey } from "@/lib/tiers";
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
    <section className="px-6 pb-16 sm:px-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DISPLAY_ORDER.map((tierId) => {
            const tier = TIERS[tierId];
            const isCurrent = currentTier === tierId;
            const isRecommended = tierId === "pro";
            const perSession = pricePerSessionAtFullUse(tierId);
            const unlimited = hasUnlimitedInterviews(tierId);
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
                className={`relative flex flex-col rounded-2xl p-6 ${
                  isRecommended
                    ? "border-2 border-brand bg-white shadow-card-hover lg:-mt-3 lg:pb-9"
                    : "border border-gray-200/70 bg-white shadow-card"
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.12em] text-brand-ink">
                    MOST POPULAR
                  </span>
                )}

                <div>
                  <h3 className="text-[20px] font-semibold text-gray-900">{tier.label}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">{tier.features[0]}</p>
                </div>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-[38px] font-semibold tracking-[-0.03em] text-gray-900">
                      {formatPrice(tier.priceUsd)}
                    </span>
                    <span className="text-[13px] text-gray-400">/ {tier.billing.label.toLowerCase()}</span>
                  </div>
                  {!unlimited && (
                    <p className="mt-2 font-mono text-[11px] tracking-[0.1em] text-gray-400">
                      AS LOW AS ${perSession.toFixed(2)} / SESSION
                    </p>
                  )}
                  {tier.requiresStudentVerification && (
                    <p className="mt-2 font-mono text-[10px] font-semibold tracking-[0.1em] text-brand-700">
                      VERIFIED STUDENTS ONLY
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handlePurchase(tierId)}
                  disabled={isCurrent || loadingTier === tierId}
                  className={`mt-6 inline-flex h-11 items-center justify-center rounded-xl text-[14px] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isRecommended
                      ? "bg-brand text-brand-ink shadow-brand-glow hover:bg-brand-600"
                      : isCurrent
                        ? "border border-gray-200 bg-white text-gray-400"
                        : "border border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {buttonLabel}
                </button>

                {/* Included sessions block */}
                <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5">
                  <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-gray-400">INCLUDED</p>
                  <p className="mt-1 font-display text-[20px] font-semibold text-gray-900">
                    {unlimited ? "Unlimited interviews" : `${tier.allotments.interviewSessions} full interviews`}
                  </p>
                  <p className="mt-1 text-[12px] text-gray-500">+ unlimited drill practice</p>
                  {!unlimited && (
                    <p className="mt-2 text-[11.5px] leading-relaxed text-gray-400">
                      Need more? ${tier.overage.sessionPriceUsd} per overage session.
                    </p>
                  )}
                </div>

                <ul className="mt-6 space-y-2.5 border-t border-gray-100 pt-5">
                  {FEATURE_ROWS.map((row) => {
                    const included = tierHasFeature(tierId, row.feature);
                    return (
                      <li key={row.feature} className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center ${
                            included ? "text-brand-600" : "text-gray-300"
                          }`}
                          aria-hidden
                        >
                          {included ? <CheckIcon /> : <DashIcon />}
                        </span>
                        <span
                          className={`text-[12.5px] leading-relaxed ${
                            included ? "text-gray-800" : "text-gray-400"
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
          <p className="mt-6 text-center text-[13px] text-rose-500" role="alert">
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
  return "Start free trial →";
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
