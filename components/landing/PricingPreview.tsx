import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

const tiers = [
  {
    name: "Free",
    tagline: "See what Folio feels like.",
    price: "$0",
    period: "",
    cta: "Start free",
    ctaStyle: "border border-ink-border bg-ink-surface text-text-primary hover:border-accent/40",
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
    cta: "Get Basic",
    ctaStyle: "border border-ink-border bg-ink-surface text-text-primary hover:border-accent/40",
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
    cta: "Get Pro",
    ctaStyle: "bg-accent text-ink hover:brightness-110",
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
    cta: "Get Max",
    ctaStyle: "border border-ink-border bg-ink-surface text-text-primary hover:border-accent/40",
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

export function PricingPreview() {
  return (
    <section id="pricing" className="px-6 py-24 sm:px-12 sm:py-32 lg:px-20" aria-label="Pricing">
      <div className="mx-auto max-w-[1440px]">
        <ScrollReveal>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              <span className="font-mono text-[11px] font-medium tracking-label text-accent">
                PRICING
              </span>
            </div>
            <h2 className="mt-6 font-display text-[36px] font-semibold tracking-heading text-text-primary sm:text-[44px]">
              Start free. Scale when it&apos;s real.
            </h2>
            <p className="mt-4 font-sans text-text-secondary">
              Try your first interview free. No credit card required.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-16 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier, i) => (
            <ScrollReveal key={tier.name} delay={i * 100}>
              <div
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  tier.highlighted
                    ? "border-accent/40 bg-ink-surface shadow-accent-glow order-first sm:order-none"
                    : "border-ink-border bg-ink-surface"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 font-mono text-[9px] font-semibold tracking-[0.15em] text-ink">
                    MOST POPULAR
                  </span>
                )}

                {/* Tier name + tagline */}
                <h3 className="font-display text-[22px] font-semibold text-text-primary">
                  {tier.name}
                </h3>
                <p className="mt-1 font-sans text-[13px] text-text-secondary">
                  {tier.tagline}
                </p>

                {/* Price */}
                <div className="mt-5">
                  <span className="font-display text-[40px] font-bold tracking-tight text-text-primary">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="font-sans text-[14px] text-text-tertiary">{tier.period}</span>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href="/signup"
                  className={`mt-5 flex h-10 items-center justify-center rounded-full font-sans text-[14px] font-semibold transition-all duration-200 ${tier.ctaStyle}`}
                >
                  {tier.cta} →
                </Link>

                {/* Feature list */}
                <div className="mt-6 border-t border-ink-border pt-5">
                  {tier.preamble && (
                    <p className="mb-3 font-sans text-[13px] font-medium text-text-primary">
                      {tier.preamble}
                    </p>
                  )}
                  <ul className="flex flex-col gap-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 font-sans text-[13px] text-text-secondary">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <path d="M3 8.5L6.5 12L13 4" stroke="#00F590" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
          <p className="mt-10 text-center font-sans text-[13px] text-text-tertiary">
            First interview is free. Paid plans include a 15-day trial.{" "}
            <Link href="/pricing" className="text-accent transition-opacity hover:opacity-80">
              See full comparison →
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
