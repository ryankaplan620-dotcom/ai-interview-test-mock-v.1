import { ScrollReveal } from "./ScrollReveal";

const companies = [
  { name: "McKinsey", count: 62 },
  { name: "BCG", count: 55 },
  { name: "Bain", count: 48 },
  { name: "Goldman Sachs", count: 71 },
  { name: "JP Morgan", count: 58 },
  { name: "Stripe", count: 42 },
  { name: "Google", count: 67 },
  { name: "Amazon", count: 73 },
  { name: "Meta", count: 51 },
];

export function CompanyPreview() {
  return (
    <section
      className="border-t border-ink-border/40 px-6 py-24 sm:px-12 sm:py-32 lg:px-20"
      aria-label="Company intelligence"
    >
      <div className="mx-auto max-w-[1440px]">
        <ScrollReveal>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            <span className="font-mono text-[11px] font-medium tracking-label text-accent">
              COMPANY INTELLIGENCE
            </span>
          </div>

          <h2 className="mt-6 font-display text-[36px] font-semibold tracking-heading text-text-primary sm:text-[44px]">
            We&apos;ve done your homework.
          </h2>

          <p className="mt-4 max-w-[600px] font-sans text-[16px] text-text-secondary">
            50+ target firms. 500+ verified questions. Calibrated to how they actually interview.
          </p>
        </ScrollReveal>

        {/* Company grid */}
        <div className="mt-16 grid gap-3 md:grid-cols-3">
          {companies.map((company, i) => (
            <ScrollReveal key={company.name} delay={i * 60}>
              <div className="flex items-center justify-between rounded-2xl border border-ink-border bg-ink-surface px-5 py-4 transition-all duration-300 ease-out hover:-translate-y-[2px] hover:border-accent/30 hover:shadow-accent-glow">
                <span className="font-sans text-[14px] font-medium text-text-primary">
                  {company.name}
                </span>
                <span className="font-mono text-[11px] text-text-tertiary">
                  {company.count} questions
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-8">
          <a
            href="#waitlist"
            className="inline-flex items-center font-sans text-[15px] font-medium text-accent transition-colors hover:text-accent-highlight"
          >
            Explore all companies &rarr;
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
