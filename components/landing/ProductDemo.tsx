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
    <section className="px-6 py-24 sm:px-12 lg:px-20" aria-label="Live preview">
      <div className="mx-auto max-w-[1440px]">
        <ScrollReveal>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              <span className="font-mono text-[11px] font-medium tracking-label text-accent">
                LIVE PREVIEW
              </span>
            </div>
            <h2 className="mt-6 font-display text-[36px] font-semibold tracking-heading text-text-primary sm:text-[44px]">
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
    <div className="mx-auto max-w-[1000px] overflow-hidden rounded-2xl border border-ink-border bg-ink-surface shadow-2xl">
      {/* Title bar */}
      <div className="flex h-10 items-center bg-ink-deeper px-4">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: "#FF5F57" }} />
          <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: "#FEBC2E" }} />
          <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: "#28C840" }} />
        </div>
        <span className="mx-auto font-mono text-[10px] text-text-tertiary">
          Folio Session &mdash; Priya Patel
        </span>
      </div>

      {/* Main area */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: transcript */}
        <div className="bg-ink-raised p-6">
          <div className="space-y-4">
            {exchanges.slice(0, visibleCount).map((line, i) => (
              <div
                key={i}
                className="transition-opacity duration-[400ms]"
                style={{
                  opacity: i < visibleCount ? 1 : 0,
                }}
              >
                <span
                  className={`font-mono text-[9px] tracking-label ${
                    line.speaker === "PRIYA" ? "text-accent" : "text-text-tertiary"
                  }`}
                >
                  {line.speaker}
                </span>
                <p className="mt-1 font-sans text-[13px] leading-relaxed text-text-primary">
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: avatar */}
        <div className="flex flex-col items-center justify-center bg-ink-deeper py-8 px-8 md:p-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep">
            <span className="font-display text-4xl font-bold text-ink/30">P</span>
          </div>
          <p className="mt-4 font-sans text-base font-semibold text-text-primary">
            Priya Patel
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-label text-text-tertiary">
            SENIOR RECRUITER
          </p>

          {/* Waveform */}
          <div className="mt-6 flex items-center gap-[2px]" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-0.5 rounded-full bg-accent"
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
      <div className="flex h-12 items-center justify-between border-t border-ink-border bg-ink-deeper px-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            <div className="absolute inset-0 h-1.5 w-1.5 animate-pulse-ring rounded-full border border-accent" />
          </div>
          <span className="font-mono text-[10px] tracking-label text-text-tertiary">
            PRIYA IS SPEAKING
          </span>
        </div>
        <span className="font-mono text-[11px] text-text-tertiary">0:32 / 1:30</span>
      </div>
    </div>
  );
}
