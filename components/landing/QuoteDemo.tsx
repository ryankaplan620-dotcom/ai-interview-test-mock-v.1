"use client";

import { useState, useEffect } from "react";
import { ScrollReveal } from "./ScrollReveal";
import { Section, Eyebrow, SectionHeading } from "@/components/marketing/ui";

const quotes = [
  {
    before: "I kind of led a team that did some data stuff.",
    after:
      "I led a four-person analytics team that shipped three dashboards used by the executive team to make weekly hiring decisions.",
  },
  {
    before: "I think I’m pretty good at communicating.",
    after:
      "I present quarterly results to our 200-person org and have been asked to coach two junior analysts on their delivery.",
  },
  {
    before: "We had this problem and I figured out a fix.",
    after:
      "Our pipeline was dropping 12% of records. I traced it to our ETL logic and shipped a fix that brought loss under 0.5%.",
  },
];

export function QuoteDemo() {
  return (
    <Section tone="tint">
      <ScrollReveal>
        <div className="text-center">
          <Eyebrow>The feedback loop</Eyebrow>
          <SectionHeading className="mt-4">Every word gets stronger.</SectionHeading>
        </div>
      </ScrollReveal>

      <ScrollReveal className="mt-14">
        <QuoteCard />
      </ScrollReveal>
    </Section>
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
    <div className="mx-auto max-w-[720px] overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-card">
      {/* Before */}
      <div className="p-8 sm:p-10">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
          What you said
        </span>
        <p key={`before-${activeIndex}`} className="mt-3 text-[18px] italic leading-relaxed text-gray-400 transition-opacity duration-500">
          “{quote.before}”
        </p>
      </div>

      {/* Connector */}
      <div className="relative flex items-center justify-center border-y border-gray-100 bg-gray-50/60 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-ink shadow-brand-glow">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 3v10M8 13l-3.5-3.5M8 13l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {/* After */}
      <div className="bg-gradient-to-b from-brand-50/50 to-white p-8 sm:p-10">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">
          The stronger version
        </span>
        <p key={`after-${activeIndex}`} className="mt-3 text-[18px] font-medium leading-relaxed text-gray-900 transition-opacity duration-500">
          “{quote.after}”
        </p>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 border-t border-gray-100 py-5">
        {quotes.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? "w-6 bg-brand" : "w-1.5 bg-gray-200 hover:bg-gray-300"
            }`}
            aria-label={`View example ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
