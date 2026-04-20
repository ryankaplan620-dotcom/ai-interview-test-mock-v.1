import { ScrollReveal } from "./ScrollReveal";

const tiers = [
  {
    name: "STUDENT",
    price: "$5.99",
    features: "3 sessions/week, 1 persona, Basic score",
    highlighted: false,
  },
  {
    name: "GENERAL",
    price: "$9.99",
    features: "5 sessions/week, All personas, Full score",
    highlighted: false,
  },
  {
    name: "PRO",
    price: "$19.99",
    features: "Unlimited sessions, Outreach, All drills",
    highlighted: true,
  },
  {
    name: "MAX",
    price: "$30",
    features: "Everything + Priority, Custom calibration",
    highlighted: false,
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
              15-day free trial. No credit card.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-16 grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {tiers.map((tier, i) => (
            <ScrollReveal key={tier.name} delay={i * 100}>
              <div
                className={`relative rounded-2xl border bg-ink-surface p-6 transition-all duration-300 ease-out hover:-translate-y-[2px] ${
                  tier.highlighted
                    ? "border-accent/40 shadow-accent-glow order-first md:order-none"
                    : "border-ink-border hover:border-accent/30 hover:shadow-accent-glow"
                }`}
              >
                {tier.highlighted && (
                  <>
                    <div
                      className="pointer-events-none absolute -inset-2 -z-10 rounded-3xl bg-accent/5 blur-xl"
                      aria-hidden
                    />
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 font-mono text-[9px] font-semibold tracking-[0.15em] text-ink">
                      MOST POPULAR
                    </span>
                  </>
                )}
                <span className="font-mono text-[10px] tracking-label text-text-tertiary">
                  {tier.name}
                </span>
                <p className="mt-3 font-display text-[36px] font-bold text-text-primary">
                  {tier.price}
                  <span className="font-sans text-[14px] font-normal text-text-tertiary">/mo</span>
                </p>
                <p className="mt-4 font-sans text-[13px] leading-relaxed text-text-secondary">
                  {tier.features}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <p className="mt-12 text-center font-sans text-sm text-text-tertiary">
            All plans include a 15-day free trial
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
