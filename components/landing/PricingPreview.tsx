import { ScrollReveal } from "./ScrollReveal";
import { Section, Eyebrow, SectionHeading, Lede, Button, ArrowLink, CheckIcon } from "@/components/marketing/ui";

const tiers = [
  {
    name: "Free",
    tagline: "See what Folio feels like.",
    price: "$0",
    period: "",
    cta: "Start free",
    highlighted: false,
    preamble: null as string | null,
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
    highlighted: false,
    preamble: "Everything in Free, and:",
    features: [
      "3 interview sessions (30 min each)",
      "All 5 interviewer personas",
      "4 comms training sessions",
      "5 outreach sends",
      "Quote-based coaching",
    ],
  },
  {
    name: "Pro",
    tagline: "Serious prep for serious interviews.",
    price: "$149",
    period: "/year",
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
    ],
  },
  {
    name: "Max",
    tagline: "Every feature. Maximum volume.",
    price: "$249",
    period: "/year",
    cta: "Get Max",
    highlighted: false,
    preamble: "Everything in Pro, and:",
    features: [
      "Unlimited interviews",
      "50 outreach sends",
      "Superday mode",
      "Hard mode",
      "Question intelligence engine",
      "Voice acoustic analysis",
    ],
  },
];

export function PricingPreview() {
  return (
    <Section id="pricing" tone="white">
      <ScrollReveal>
        <div className="text-center">
          <Eyebrow>Pricing</Eyebrow>
          <SectionHeading className="mt-4">Start free. Scale when it&apos;s real.</SectionHeading>
          <Lede className="mx-auto mt-5 max-w-[480px]">
            Try your first interview free. No credit card required.
          </Lede>
        </div>
      </ScrollReveal>

      <div className="mt-14 grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier, i) => (
          <ScrollReveal key={tier.name} delay={i * 80}>
            <div
              className={`relative flex h-full flex-col rounded-2xl p-6 ${
                tier.highlighted
                  ? "border-2 border-brand bg-white shadow-card-hover lg:-mt-3 lg:pb-9"
                  : "border border-gray-200/70 bg-white shadow-card"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.12em] text-brand-ink">
                  MOST POPULAR
                </span>
              )}

              <h3 className="text-[20px] font-semibold text-gray-900">{tier.name}</h3>
              <p className="mt-1 text-[13px] text-gray-500">{tier.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-[38px] font-semibold tracking-[-0.03em] text-gray-900">
                  {tier.price}
                </span>
                {tier.period && <span className="text-[14px] text-gray-400">{tier.period}</span>}
              </div>

              <Button
                href="/signup"
                variant={tier.highlighted ? "primary" : "secondary"}
                className="mt-5 w-full"
              >
                {tier.cta}
              </Button>

              <div className="mt-6 border-t border-gray-100 pt-5">
                {tier.preamble && (
                  <p className="mb-3 text-[13px] font-medium text-gray-900">{tier.preamble}</p>
                )}
                <ul className="flex flex-col gap-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug text-gray-600">
                      <CheckIcon className="mt-0.5 h-4 w-4 text-brand-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal className="mt-10 text-center">
        <p className="text-[13px] text-gray-400">
          First interview is free. Paid plans include a 15-day trial.
        </p>
        <ArrowLink href="/pricing" className="mt-3 justify-center">
          See full comparison
        </ArrowLink>
      </ScrollReveal>
    </Section>
  );
}
