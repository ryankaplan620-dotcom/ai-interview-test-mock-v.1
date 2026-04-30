import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

export function ClosingCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-dark noise-overlay px-6 py-32 sm:py-40" aria-label="Final call to action">
      {/* Decorative floating shapes */}
      <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#00DC82]/15 blur-3xl animate-float" aria-hidden />
      <div className="absolute -bottom-40 -left-20 w-[250px] h-[250px] rounded-full bg-[#00DC82]/10 blur-3xl animate-float [animation-delay:2s]" aria-hidden />
      <div className="absolute top-1/2 right-1/4 w-[200px] h-[200px] rounded-full bg-emerald-500/8 blur-3xl animate-float [animation-delay:4s]" aria-hidden />

      <div className="relative z-10 mx-auto max-w-[1200px] text-center">
        <ScrollReveal>
          <h2 className="text-[44px] font-bold tracking-[-0.03em] text-white sm:text-[56px] lg:text-[72px]">
            Show up
            <br />
            <span className="text-[#00DC82]">unmistakable.</span>
          </h2>

          <p className="mt-8 text-[18px] text-gray-400">
            Under 90 seconds to your first Folio Score. No credit card.
          </p>

          <div className="mt-10">
            <Link
              href="/signup"
              className="btn-shimmer inline-flex h-12 items-center rounded-lg bg-[#00DC82] px-8 text-[15px] font-medium text-white transition-all duration-200 hover:bg-[#00C574]"
            >
              Start free
              <span aria-hidden> &rarr;</span>
            </Link>
          </div>

          <p className="mt-8 font-mono text-[10px] tracking-[0.15em] text-gray-500">
            BUILT TO GET YOU HIRED.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
