import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

const tiers = [
  {
    name: "Free",
    tagline: "See what Folio feels like.",
    price: "$0",
    period: "",
    periodLabel: "",
    cta: "Start free",
    highlighted: false,
    preamble: null,
    features: [
      "1 interview session (10 min)",
      "Single persona (Priya)",
      "Folio Score with basic feedback",
      "Limited session replay",
    ],
  },
  {
    name: "Basic",
    tagline: "A full recruiting cycle of practice.",
    price: "$49",
    period: "/90 days",
    periodLabel: "per cycle",
    cta: "Get Basic",
    highlighted: false,
    preamble: "Everything in Free, and:",
    features: [
      "3 interview sessions (30 min each)",
      "All 5 interviewer personas",
      "4 comms training sessions",
      "5 outreach sends",
      "Full Folio Score + detailed feedback",
      "Quote-based coaching",
    ],
  },
  {
    name: "Pro",
    tagline: "Serious prep for serious interviews.",
    price: "$149",
    period: "/year",
    periodLabel: "per year",
    cta: "Get Pro",
    highlighted: true,
    preamble: "Everything in Basic, and:",
    features: [
      "8 interview sessions",
      "Unlimited comms training",
      "20 outreach sends",
      "Firm-specific calibration",
      "Cross-session memory",
      "Panel simulation",
      "Session memory across personas",
      "Priority feedback",
    ],
  },
  {
    name: "Max",
    tagline: "Every feature. Maximum volume.",
    price: "$249",
    period: "/year",
    periodLabel: "per year",
    cta: "Get Max",
    highlighted: false,
    preamble: "Everything in Pro, and:",
    features: [
      "16 interview sessions",
      "50 outreach sends",
      "Superday mode",
      "Hard mode",
      "Non-verbal feedback",
      "Question intelligence engine",
      "Voice acoustic analysis",
      "$15 overage sessions (vs $20)",
    ],
  },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
      <circle cx="8" cy="8" r="7" stroke="#00DC82" strokeWidth="1" fill="none" opacity="0.2" />
      <path d="M5 8.5L7 10.5L11 5.5" stroke="#00DC82" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PricingPreview() {
  return (
    <section id="pricing" className="bg-[#0D1117] px-6 py-24 sm:px-8 md:py-32" aria-label="Pricing">
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal>
          <div className="text-center">
            <span className="font-mono text-[13px] font-medium tracking-[0.1em] uppercase text-[#00DC82]">
              PRICING
            </span>
            <h2 className="mt-4 text-[36px] font-bold tracking-[-0.03em] text-[#F0F6FC] sm:text-[44px]">
              Start free. Scale when it&apos;s real.
            </h2>
            <p className="mt-4 text-[#8B949E]">
              Try your first interview free. No credit card required.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 items-start">
          {tiers.map((tier, i) => (
            <ScrollReveal key={tier.name} delay={i * 100}>
              <div
                className={`relative flex flex-col rounded-xl border p-6 transition-all duration-300 ${
                  tier.highlighted
                    ? "scale-[1.02] bg-gradient-to-b from-[#161B22] to-[#0D2818] border-[#00DC82]/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)] shadow-[#00DC82]/10 order-first sm:order-none"
                    : "border-[#21262D] bg-[#161B22] shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-1"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00DC82] px-4 py-1 font-mono text-[9px] font-semibold tracking-[0.15em] text-white">
                    MOST POPULAR
                  </span>
                )}

                {/* Tier name + tagline */}
                <h3 className="text-[22px] font-semibold text-[#F0F6FC]">
                  {tier.name}
                </h3>
                <p className="mt-1 text-[13px] text-[#8B949E]">
                  {tier.tagline}
                </p>

                {/* Price */}
                <div className="mt-5">
                  <span className="text-[40px] font-bold tracking-tight text-[#F0F6FC]">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-[14px] text-[#6E7681]">{tier.period}</span>
                  )}
                  {tier.periodLabel && (
                    <p className="mt-0.5 text-[12px] text-[#6E7681]">{tier.periodLabel}</p>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href="/signup"
                  className={`mt-5 flex h-10 items-center justify-center rounded-lg text-[14px] font-medium transition-all duration-200 ${
                    tier.highlighted
                      ? "bg-[#00DC82] text-white hover:bg-[#00C574]"
                      : "bg-[#21262D] text-[#F0F6FC] hover:bg-[#30363D]"
                  }`}
                >
                  {tier.cta}
                </Link>

                {/* Feature list */}
                <div className="mt-6 border-t border-[#21262D] pt-5">
                  {tier.preamble && (
                    <p className="mb-3 text-[13px] font-medium text-[#F0F6FC]">
                      {tier.preamble}
                    </p>
                  )}
                  <ul className="flex flex-col gap-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-[#8B949E]">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <p className="mt-10 text-center text-[13px] text-[#6E7681]">
            First interview is free. Paid plans include a 15-day trial.{" "}
            <Link href="/pricing" className="text-[#00DC82] transition-opacity hover:opacity-80">
              See full comparison
              <span aria-hidden> &rarr;</span>
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
