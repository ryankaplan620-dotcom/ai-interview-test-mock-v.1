"use client";

import Link from "next/link";

export function Hero() {
  return (
    <section className="relative px-6 pb-8 pt-12 sm:px-12 sm:pt-16 lg:px-20 lg:pt-20" aria-label="Hero">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-12 lg:gap-8">
          {/* Copy */}
          <div className="flex flex-col">
            {/* Eyebrow */}
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00DC82]" aria-hidden />
              <span className="font-mono text-[11px] font-medium tracking-[0.22em] text-[#00DC82]">
                INTERVIEW PRACTICE PLATFORM
              </span>
            </div>

            {/* Primary tagline */}
            <h1 className="mt-16 font-display text-[48px] font-semibold leading-[1.02] tracking-[-0.035em] text-[#F0F6FC] sm:text-[56px] lg:text-[64px]">
              The interview{" "}
              <span className="block">
                <em className="font-serif font-normal italic text-[#00DC82]">
                  before
                </em>
              </span>
              <span className="block">the interview.</span>
            </h1>

            {/* Description */}
            <p className="mt-14 max-w-[560px] text-[18px] leading-[1.55] text-[#A8B0BA] sm:text-[20px]">
              Live voice interview practice, indistinguishable from the real thing.
            </p>

            {/* CTAs */}
            <div className="mt-14 flex flex-wrap items-center gap-6">
              <Link
                href="/signup"
                className="btn-shimmer inline-flex h-[52px] items-center rounded-full bg-gradient-to-b from-[#33FAA6] to-[#00DC82] px-8 text-[15px] font-semibold text-[#0D1117] transition-all duration-200 hover:shadow-[0_0_40px_rgba(0,220,130,0.2)]"
              >
                Start free →
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center text-[15px] font-medium text-[#F0F6FC] transition-colors hover:text-[#00DC82]"
              >
                See how it works &nbsp;→
              </Link>
            </div>

            {/* Proof row */}
            <div className="mt-24">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-[#6E7681]">
                Trusted across industries
              </span>
              <div className="mt-2 h-px w-full max-w-[720px] bg-[#21262D]/50" />
              <div className="mt-8 flex flex-wrap items-baseline gap-x-10 gap-y-6 text-[#8B949E]">
                <span className="text-[22px] font-bold tracking-[0.08em]">TECH</span>
                <span className="text-[26px] font-semibold tracking-[-0.01em]">Finance</span>
                <span className="text-[24px] font-medium tracking-[0.01em]">Healthcare</span>
                <span className="text-[25px] font-bold tracking-[-0.03em]">Consulting</span>
                <span className="text-[25px] italic tracking-[-0.005em]">Government</span>
                <span className="text-[26px] font-medium tracking-[-0.005em]">Startups</span>
                <span className="text-[13px] font-medium text-[#6E7681]">+200 more</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
