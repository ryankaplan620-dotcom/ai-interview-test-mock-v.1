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
    <section className="bg-[#161B22] px-6 py-24 sm:px-8 md:py-32" aria-label="The feedback loop">
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal>
          <div className="text-center">
            <span className="font-mono text-[13px] font-medium tracking-[0.1em] uppercase text-[#00DC82]">
              THE FEEDBACK LOOP
            </span>
            <h2 className="mt-4 text-[36px] font-bold tracking-[-0.03em] text-[#F0F6FC] sm:text-[44px]">
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
    <div className="mx-auto max-w-[680px] rounded-xl border border-[#21262D] bg-[#0D1117] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      {/* Before */}
      <div>
        <span className="font-mono text-[10px] tracking-[0.15em] text-[#6E7681]">
          WHAT YOU SAID
        </span>
        <p
          key={`before-${activeIndex}`}
          className="mt-2 italic text-[#8B949E] transition-opacity duration-500"
        >
          &ldquo;{quote.before}&rdquo;
        </p>
      </div>

      {/* Divider */}
      <div className="my-6 h-px bg-[#21262D]" />

      {/* After */}
      <div>
        <span className="font-mono text-[10px] tracking-[0.15em] text-[#00DC82]">
          THE STRONGER VERSION
        </span>
        <p
          key={`after-${activeIndex}`}
          className="mt-2 font-medium text-[#F0F6FC] transition-opacity duration-500"
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
                ? "w-6 bg-[#00DC82]"
                : "w-1.5 bg-[#30363D]"
            }`}
            aria-label={`View quote ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
