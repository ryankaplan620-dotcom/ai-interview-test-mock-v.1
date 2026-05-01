import { ScrollReveal } from "./ScrollReveal";

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
    <section
      className="bg-[#0D1117] px-6 py-24 sm:px-8 md:py-32"
      aria-label="Company intelligence"
    >
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal>
          <span className="font-mono text-[13px] font-medium tracking-[0.1em] uppercase text-[#00DC82]">
            COMPANY INTELLIGENCE
          </span>

          <h2 className="mt-4 text-[36px] font-bold tracking-[-0.03em] text-[#F0F6FC] sm:text-[44px]">
            Prepared for any room.
          </h2>

          <p className="mt-4 max-w-[600px] text-[16px] text-[#8B949E]">
            200+ companies across every industry. Behavioral, technical, case, and general interviews — calibrated to how each organization actually hires.
          </p>
        </ScrollReveal>

        {/* Company grid */}
        <div className="mt-16 grid gap-3 md:grid-cols-3">
          {companies.map((company, i) => (
            <ScrollReveal key={company.name} delay={i * 60}>
              <div className="group flex items-center justify-between rounded-lg border border-[#21262D] bg-[#161B22] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:border-[#00DC82]/20 hover:shadow-[0_4px_20px_rgba(0,220,130,0.1)]">
                <div>
                  <span className="text-[14px] font-medium text-[#F0F6FC]">
                    {company.name}
                  </span>
                  <p className="mt-1 font-mono text-[11px] text-[#6E7681]">
                    {company.count} questions
                  </p>
                </div>
                {/* Arrow that appears on hover */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="shrink-0 text-[#6E7681] opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:text-[#00DC82] group-hover:translate-x-0.5"
                  aria-hidden
                >
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-8">
          <a
            href="/signup"
            className="inline-flex items-center text-[15px] font-medium text-[#00DC82] transition-opacity hover:opacity-80"
          >
            Explore all companies
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-1" aria-hidden>
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
