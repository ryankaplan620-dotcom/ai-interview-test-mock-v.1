import { ScrollReveal } from "./ScrollReveal";
import { Section, SectionHeading, Lede, ArrowLink } from "@/components/marketing/ui";

const companies = [
  { name: "Google", count: 67 },
  { name: "Amazon", count: 73 },
  { name: "Microsoft", count: 58 },
  { name: "Stripe", count: 42 },
  { name: "Deloitte", count: 44 },
  { name: "Salesforce", count: 38 },
  { name: "HCA Healthcare", count: 25 },
  { name: "Target", count: 31 },
  { name: "US Government", count: 29 },
];

export function CompanyPreview() {
  return (
    <Section tone="white">
      <ScrollReveal>
        {/* Violet is reserved for "intelligence" statements — this is one. */}
        <span className="text-gradient-violet font-mono text-[12px] font-semibold uppercase tracking-[0.18em]">
          Company intelligence
        </span>
        <SectionHeading className="mt-4">Prepared for any room.</SectionHeading>
        <Lede className="mt-5 max-w-[600px]">
          200+ companies across every industry. Behavioral, technical, case, and general
          interviews — calibrated to how each organization actually hires.
        </Lede>
      </ScrollReveal>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((company, i) => (
          <ScrollReveal key={company.name} delay={i * 50}>
            <div className="group flex items-center gap-4 rounded-2xl border border-gray-200/70 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 font-display text-[16px] font-semibold text-gray-500 ring-1 ring-inset ring-gray-100 transition-colors group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:ring-brand-100">
                {company.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold tracking-[-0.01em] text-gray-900">
                  {company.name}
                </span>
                <p className="mt-0.5 font-mono text-[11px] text-gray-400">{company.count} questions</p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600"
                aria-hidden
              >
                <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal className="mt-10">
        <ArrowLink href="/signup">Explore all companies</ArrowLink>
      </ScrollReveal>
    </Section>
  );
}
