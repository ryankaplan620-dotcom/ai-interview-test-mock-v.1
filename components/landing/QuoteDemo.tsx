"use client";

import { useState, useEffect } from "react";
import { ScrollReveal } from "./ScrollReveal";

const quotes = [
  {
    before:
      "I kind of led a team that did some data stuff.",
    after:
      "I led a four-person analytics team that shipped three dashboards used by the executive team to make weekly hiring decisions.",
  },
  {
    before:
      "I think I\u2019m pretty good at communicating.",
    after:
      "I present quarterly results to our 200-person org and have been asked to coach two junior analysts on their delivery.",
  },
  {
    before:
      "We had this problem and I figured out a fix.",
    after:
      "Our pipeline was dropping 12% of records. I identified the root cause in our ETL logic and shipped a fix that brought loss to under 0.5%.",
  },
];

export function QuoteDemo() {
  return (
    <section className="px-6 py-24 sm:px-12 sm:py-32 lg:px-20" aria-label="The feedback loop">
      <div className="mx-auto max-w-[1440px]">
        <ScrollReveal>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              <span className="font-mono text-[11px] font-medium tracking-label text-accent">
                THE FEEDBACK LOOP
              </span>
            </div>
            <h2 className="mt-6 font-display text-[36px] font-semibold tracking-heading text-text-primary sm:text-[44px]">
              Every word gets stronger.
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal className="mt-16">
          <QuoteCard />
        </ScrollReveal>
      </div>
    </section>
  );
}

function QuoteCard() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const quote = quotes[activeIndex];

  return (
    <div className="mx-auto max-w-[680px] rounded-2xl border border-ink-border bg-ink-surface p-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          <div className="absolute inset-0 h-1.5 w-1.5 animate-pulse-ring rounded-full border border-accent" />
        </div>
        <span className="font-mono text-[10px] tracking-label text-accent">
          EXTRACT &rarr; REPHRASE
        </span>
      </div>

      {/* Before */}
      <div className="mt-6">
        <span className="font-mono text-[9px] tracking-label text-text-tertiary">
          WHAT YOU SAID
        </span>
        <p
          key={`before-${activeIndex}`}
          className="mt-2 font-serif italic text-text-secondary transition-opacity duration-500"
        >
          &ldquo;{quote.before}&rdquo;
        </p>
      </div>

      {/* Divider */}
      <div className="my-6 h-px bg-ink-border" />

      {/* After */}
      <div>
        <span className="font-mono text-[9px] tracking-label text-accent">
          THE STRONGER VERSION
        </span>
        <p
          key={`after-${activeIndex}`}
          className="mt-2 font-sans font-medium text-text-primary transition-opacity duration-500"
        >
          &ldquo;{quote.after}&rdquo;
        </p>
      </div>

      {/* Navigation dots */}
      <div className="mt-8 flex items-center justify-center gap-2">
        {quotes.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-6 bg-accent"
                : "w-1.5 bg-ink-border"
            }`}
            aria-label={`View quote ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
