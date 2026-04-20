import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

export function ClosingCTA() {
  return (
    <section className="px-6 py-32 sm:py-40" aria-label="Final call to action">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-[1440px] text-center">
        {/* Radial glow behind heading */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 bg-accent/[0.08] blur-3xl"
          aria-hidden
        />

        <ScrollReveal>
          <h2 className="relative z-10 font-display text-[44px] font-semibold tracking-display text-text-primary sm:text-[56px] lg:text-[72px]">
            Show up
            <br />
            <em className="font-serif font-normal italic text-accent">unmistakable.</em>
          </h2>

          <p className="mt-8 font-sans text-[18px] text-text-secondary">
            Under 90 seconds to your first Folio Score. No credit card.
          </p>

          <div className="mt-10">
            <Link
              href="#waitlist"
              className="btn-shimmer inline-flex h-[52px] items-center rounded-full bg-cta-gradient px-8 font-sans text-[15px] font-semibold tracking-body text-text-onAccent transition-all duration-200 ease-brand hover:shadow-accent-glow-lg"
            >
              Start free &rarr;
            </Link>
          </div>

          <p className="mt-8 font-mono text-[10px] tracking-label text-text-tertiary">
            BUILT TO GET YOU HIRED.
          </p>
        </ScrollReveal>
      </div>

      {/* Bottom accent line */}
      <div className="mt-32 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent sm:mt-40" aria-hidden />
    </section>
  );
}
