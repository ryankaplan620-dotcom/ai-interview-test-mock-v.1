"use client";

import Link from "next/link";
import { Suspense, lazy, useState, useEffect } from "react";

const HeroScene = lazy(() => import("@/components/3d/HeroScene"));

const exchanges = [
  {
    speaker: "PRIYA",
    text: "Walk me through a time you led a team through a difficult change.",
  },
  {
    speaker: "YOU",
    text: "Last year I was leading a product migration and our main stakeholder wanted to delay by a quarter...",
  },
  {
    speaker: "PRIYA",
    text: "What made you push back instead of agreeing to delay?",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero noise-overlay min-h-screen flex items-center px-6 pt-16 pb-12 sm:px-8 sm:pt-24 sm:pb-16" aria-label="Hero">
      {/* 3D particle background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px]">
        {/* Centered copy */}
        <div className="mx-auto max-w-[800px] text-center">
          {/* Eyebrow */}
          <span className="font-mono text-[13px] font-medium tracking-[0.1em] uppercase text-[#00DC82]">
            INTERVIEW PRACTICE PLATFORM
          </span>

          {/* Massive heading */}
          <h1 className="mt-6 text-[clamp(40px,6vw,72px)] font-bold leading-[1.05] tracking-[-0.03em] text-gray-900">
            Practice interviews that feel{" "}
            <span className="bg-gradient-to-r from-[#00DC82] to-emerald-400 bg-clip-text text-transparent">real</span>.
            Get hired.
          </h1>

          {/* Sub-copy */}
          <p className="mx-auto mt-6 max-w-[640px] text-[18px] leading-relaxed text-gray-500 md:text-[20px]">
            Folio runs voice interviews with distinct personas calibrated to your
            target role. Get scored feedback, track your improvement, and show up
            unmistakable.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center rounded-lg bg-[#00DC82] px-6 text-[15px] font-medium text-white transition-all duration-200 hover:bg-[#00C574]"
            >
              Start free
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center text-[15px] font-medium text-gray-900 transition-colors hover:text-[#00DC82]"
            >
              See how it works
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-1.5" aria-hidden>
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Product preview mockup */}
        <div className="mt-16 sm:mt-20">
          <div
            className="animate-float"
            style={{ perspective: '1200px', transform: 'rotateX(2deg) rotateY(-1deg)' }}
          >
            <div className="relative shadow-[0_20px_60px_rgba(0,220,130,0.15)] rounded-2xl">
              <HeroMockup />
              {/* Glass reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-2xl pointer-events-none" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMockup() {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= exchanges.length) return;
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, 2400);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  return (
    <div className="mx-auto max-w-[900px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-2xl">
      {/* Title bar */}
      <div className="flex h-10 items-center bg-gray-950 px-4">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[10px] w-[10px] rounded-full" style={{ background: "#FF5F57" }} />
          <span className="inline-block h-[10px] w-[10px] rounded-full" style={{ background: "#FEBC2E" }} />
          <span className="inline-block h-[10px] w-[10px] rounded-full" style={{ background: "#28C840" }} />
        </div>
        <span className="mx-auto font-mono text-[11px] text-gray-500">
          Folio Session — Priya Patel
        </span>
      </div>

      {/* Main area */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: transcript */}
        <div className="bg-gray-900 p-6">
          <div className="space-y-4">
            {exchanges.slice(0, visibleCount).map((line, i) => (
              <div
                key={i}
                className="transition-opacity duration-[400ms]"
                style={{ opacity: i < visibleCount ? 1 : 0 }}
              >
                <span
                  className={`font-mono text-[10px] tracking-[0.15em] ${
                    line.speaker === "PRIYA" ? "text-[#00DC82]" : "text-gray-500"
                  }`}
                >
                  {line.speaker}
                </span>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-200">
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: avatar */}
        <div className="flex flex-col items-center justify-center bg-gray-950 px-8 py-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#00DC82] to-[#00A863]">
            <span className="text-3xl font-bold text-white/80">P</span>
          </div>
          <p className="mt-4 text-[15px] font-semibold text-gray-200">
            Priya Patel
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.15em] text-gray-500">
            SENIOR RECRUITER
          </p>

          {/* Waveform */}
          <div className="mt-5 flex items-center gap-[2px]" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="w-0.5 rounded-full bg-[#00DC82]"
                style={{
                  height: `${8 + Math.sin(i * 1.2) * 8}px`,
                  animation: `waveform 0.8s ease-in-out ${i * 80}ms infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex h-11 items-center justify-between border-t border-gray-800 bg-gray-950 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#00DC82]" />
          <span className="font-mono text-[10px] tracking-[0.1em] text-gray-500">
            PRIYA IS SPEAKING
          </span>
        </div>
        <span className="font-mono text-[11px] text-gray-500">0:32 / 1:30</span>
      </div>
    </div>
  );
}
