"use client";

import Link from "next/link";
import { Suspense, lazy } from "react";

const HeroScene = lazy(() => import("@/components/3d/HeroScene"));

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero noise-overlay min-h-screen flex items-center px-6 pt-16 pb-12 sm:px-8 sm:pt-24 sm:pb-16" aria-label="Hero">
      {/* 3D particle background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] w-full">
        {/* Left-aligned copy */}
        <div className="max-w-[680px]">
          {/* Eyebrow */}
          <span className="font-mono text-[13px] font-medium tracking-[0.1em] uppercase text-[#00DC82]">
            INTERVIEW PRACTICE PLATFORM
          </span>

          {/* Massive heading */}
          <h1 className="mt-6 font-bold leading-[1.05] tracking-[-0.03em] text-[#F0F6FC]" style={{ fontSize: "clamp(44px, 7vw, 80px)" }}>
            Practice interviews that feel{" "}
            <span className="bg-gradient-to-r from-[#00DC82] to-emerald-400 bg-clip-text text-transparent">real</span>.
            Get hired.
          </h1>

          {/* Sub-copy */}
          <p className="mt-6 max-w-[540px] text-[18px] leading-relaxed text-[#8B949E] md:text-[20px]">
            Folio runs voice interviews with distinct personas calibrated to your
            target role. Get scored feedback, track your improvement, and show up
            unmistakable.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center rounded-lg bg-[#00DC82] px-6 text-[15px] font-medium text-white transition-all duration-200 hover:bg-[#00C574]"
            >
              Start free
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center text-[15px] font-medium text-[#F0F6FC] transition-colors hover:text-[#00DC82]"
            >
              See how it works
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-1.5" aria-hidden>
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* Social proof metric */}
          <p className="mt-8 text-[14px] text-[#6E7681]">
            Join 2,000+ professionals practicing with Folio
          </p>
        </div>
      </div>
    </section>
  );
}
