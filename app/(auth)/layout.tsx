import { FolioMark } from "@/components/FolioMark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="flex min-h-screen flex-col bg-ink lg:flex-row">
      {/* Brand panel — cosmos cover moment */}
      <section className="bg-gradient-dark relative flex flex-col overflow-hidden px-6 py-10 sm:px-10 lg:w-[44%] lg:justify-between lg:px-14 lg:py-12">
        <div className="flex items-center gap-2.5">
          <FolioMark className="h-8 w-8" color="#63D88A" />
          <span className="font-display text-xl font-semibold tracking-heading text-text-primary">
            Folio
          </span>
        </div>

        <div className="mt-10 lg:mt-0">
          <p className="font-mono text-[11px] uppercase tracking-label text-text-tertiary">
            Folio Labs
          </p>
          <p className="mt-4 max-w-[420px] font-display text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] text-text-primary sm:text-[38px] lg:text-[44px]">
            Practice like it&apos;s <span className="text-gradient-mint">real</span>.
          </p>
          <p className="mt-5 hidden max-w-[360px] font-sans text-[15px] leading-relaxed text-text-secondary lg:block">
            Simulated interviews, live voice practice, and feedback that compounds with every rep.
          </p>
        </div>

        <div className="hidden lg:block">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 font-mono text-[11px] tracking-[0.12em] text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            SIMULATE · TRAIN · OUTREACH
          </span>
        </div>
      </section>

      {/* Form side */}
      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:py-16">
        {children}
      </section>
    </main>
  );
}
