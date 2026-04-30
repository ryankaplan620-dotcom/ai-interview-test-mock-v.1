"use client";

import { useState, useEffect } from "react";
import { ScrollReveal } from "./ScrollReveal";

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
  {
    speaker: "YOU",
    text: "I had data showing our churn was accelerating \u2014 every week of delay cost us roughly 200 users...",
  },
  {
    speaker: "PRIYA",
    text: "Strong. What did you learn about stakeholder management from that?",
  },
];

export function ProductDemo() {
  return (
    <section className="bg-white px-6 py-24 sm:px-8 md:py-32" aria-label="Live preview">
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal>
          <div className="text-center">
            <span className="font-mono text-[13px] font-medium tracking-[0.1em] uppercase text-[#00DC82]">
              LIVE PREVIEW
            </span>
            <h2 className="mt-4 text-[36px] font-bold tracking-[-0.03em] text-gray-900 sm:text-[44px]">
              See what a session looks like.
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal className="mt-16">
          <DemoWindow />
        </ScrollReveal>
      </div>
    </section>
  );
}

function DemoWindow() {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= exchanges.length) return;
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, 2500);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  return (
    <div className="mx-auto max-w-[1000px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-2xl">
      {/* Title bar */}
      <div className="flex h-10 items-center bg-gray-950 px-4">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: "#FF5F57" }} />
          <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: "#FEBC2E" }} />
          <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: "#28C840" }} />
        </div>
        <span className="mx-auto font-mono text-[10px] text-gray-500">
          Folio Session &mdash; Priya Patel
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
                  className={`font-mono text-[9px] tracking-[0.15em] ${
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
        <div className="flex flex-col items-center justify-center bg-gray-950 px-8 py-6 md:py-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#00DC82] to-[#00A863]">
            <span className="text-4xl font-bold text-white/80">P</span>
          </div>
          <p className="mt-4 text-base font-semibold text-gray-200">
            Priya Patel
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.15em] text-gray-500">
            SENIOR RECRUITER
          </p>

          {/* Waveform */}
          <div className="mt-6 flex items-center gap-[2px]" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
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
      <div className="flex h-12 items-center justify-between border-t border-gray-800 bg-gray-950 px-4 sm:px-6">
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
