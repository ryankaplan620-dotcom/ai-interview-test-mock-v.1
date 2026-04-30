import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

export function ClosingCTA() {
  return (
    <section className="bg-gray-900 px-6 py-32 sm:py-40" aria-label="Final call to action">
      <div className="mx-auto max-w-[1200px] text-center">
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
              className="inline-flex h-12 items-center rounded-lg bg-[#00DC82] px-8 text-[15px] font-medium text-white transition-all duration-200 hover:bg-[#00C574]"
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
