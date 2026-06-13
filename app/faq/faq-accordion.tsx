"use client";

import { useState } from "react";

export interface FaqItem {
  q: string;
  a: string;
}
export interface FaqCategory {
  title: string;
  items: FaqItem[];
}

export function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  // Track open item by a stable "cat:idx" key so each category is independent.
  const [open, setOpen] = useState<string | null>("0:0");

  return (
    <div className="space-y-12">
      {categories.map((cat, ci) => (
        <div key={cat.title}>
          <h2 className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-700">
            {cat.title}
          </h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-card">
            {cat.items.map((item, ii) => {
              const key = `${ci}:${ii}`;
              const isOpen = open === key;
              return (
                <div key={item.q} className={ii !== 0 ? "border-t border-gray-100" : ""}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-gray-50/60"
                    onClick={() => setOpen(isOpen ? null : key)}
                    aria-expanded={isOpen}
                  >
                    <span className="text-[15.5px] font-medium text-gray-900">{item.q}</span>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        isOpen ? "rotate-45 border-brand bg-brand text-brand-ink" : "border-gray-200 text-gray-400"
                      }`}
                      aria-hidden
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{ maxHeight: isOpen ? "1200px" : "0px", opacity: isOpen ? 1 : 0 }}
                  >
                    <p className="px-6 pb-6 pr-14 text-[14.5px] leading-relaxed text-gray-600">{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
