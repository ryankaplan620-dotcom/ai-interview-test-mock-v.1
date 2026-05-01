"use client";

import { useState, useEffect } from "react";
import { ScrollReveal } from "./ScrollReveal";

const exchanges = [
  { speaker: "interviewer", name: "Priya", text: "Walk me through a time you led a team through a difficult change." },
  { speaker: "you", name: "You", text: "Last year I was leading a product migration and our main stakeholder wanted to delay by a quarter..." },
  { speaker: "interviewer", name: "Priya", text: "What made you push back instead of agreeing to delay?" },
  { speaker: "you", name: "You", text: "I had data showing our churn was accelerating — every week of delay cost us roughly 200 users..." },
  { speaker: "interviewer", name: "Priya", text: "Strong. What did you learn about stakeholder management from that?" },
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
            <p className="mx-auto mt-4 max-w-[520px] text-[17px] leading-relaxed text-gray-500">
              Real-time voice interview with adaptive follow-ups, live transcript, and scored feedback.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal className="mt-16">
          <div className="mx-auto max-w-[900px]">
            {/* Browser chrome wrapper */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden">
              {/* Browser top bar */}
              <div className="flex h-11 items-center border-b border-gray-100 bg-gray-50 px-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                  <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                  <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                </div>
                <div className="mx-auto flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-400">
                    <path d="M6 1L6 11M1 6L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="font-mono text-[11px] text-gray-400">folio.io/session</span>
                </div>
              </div>

              {/* App content */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_340px]">
                {/* Left: Conversation */}
                <div className="p-6 md:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-2 w-2 items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-[#00DC82] animate-pulse" />
                    </div>
                    <span className="font-mono text-[11px] tracking-[0.08em] text-[#00DC82] font-medium">LIVE SESSION</span>
                    <span className="text-[11px] text-gray-300">·</span>
                    <span className="font-mono text-[11px] text-gray-400">Behavioral · Standard</span>
                  </div>

                  <ConversationThread />
                </div>

                {/* Right: Interviewer panel */}
                <div className="border-l border-gray-100 bg-gray-50 p-6 md:p-8">
                  <div className="text-center">
                    {/* Photo placeholder — professional avatar circle */}
                    <div className="relative mx-auto h-20 w-20">
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#00DC82] to-emerald-600 flex items-center justify-center shadow-lg shadow-[#00DC82]/20">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-white">
                          <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill="currentColor" />
                          <path d="M12 14C7.58172 14 4 16.0147 4 18.5V20H20V18.5C20 16.0147 16.4183 14 12 14Z" fill="currentColor" />
                        </svg>
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-[#00DC82] flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M5 2V5M5 5V8M5 5H2M5 5H8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>

                    <h3 className="mt-4 text-[16px] font-semibold text-gray-900">Priya Patel</h3>
                    <p className="mt-1 text-[13px] text-gray-500">Senior Recruiter</p>

                    <div className="mt-6 rounded-lg bg-white border border-gray-200 p-4">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-gray-500">Elapsed</span>
                        <span className="font-mono font-medium text-gray-900">4:32</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full bg-[#00DC82]" style={{ width: "15%" }} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                        <span>0:00</span>
                        <span>30:00</span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-white border border-gray-200 p-4">
                      <p className="text-[12px] font-medium text-gray-700 text-left">Session focus</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-[#00DC82]/10 px-2 py-0.5 text-[11px] font-medium text-[#00DC82]">Leadership</span>
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">Conflict</span>
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">Decision-making</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm hover:shadow-md transition-shadow">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="5" y="4" width="6" height="8" rx="3" /><path d="M3 8a5 5 0 0010 0M8 13v1.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" /></svg>
                      </button>
                      <button className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5L7 1L13 5V13H1V5Z" fill="currentColor" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function ConversationThread() {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= exchanges.length) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), 2500);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  return (
    <div className="space-y-5">
      {exchanges.slice(0, visibleCount).map((line, i) => (
        <div
          key={i}
          className={`flex gap-3 transition-all duration-500 ${i < visibleCount ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          <div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
            line.speaker === "interviewer"
              ? "bg-[#00DC82]/10 text-[#00DC82]"
              : "bg-gray-100 text-gray-500"
          }`}>
            {line.speaker === "interviewer" ? "P" : "Y"}
          </div>
          <div>
            <p className={`text-[12px] font-medium ${
              line.speaker === "interviewer" ? "text-[#00DC82]" : "text-gray-400"
            }`}>
              {line.name}
            </p>
            <p className="mt-0.5 text-[14px] leading-relaxed text-gray-700">
              {line.text}
            </p>
          </div>
        </div>
      ))}

      {visibleCount < exchanges.length && (
        <div className="flex items-center gap-2 pl-10">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-[12px] text-gray-400">Priya is typing...</span>
        </div>
      )}
    </div>
  );
}
