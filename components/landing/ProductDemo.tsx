"use client";

import { useState, useEffect } from "react";
import { ScrollReveal } from "./ScrollReveal";
import { Section, Eyebrow, SectionHeading, Lede } from "@/components/marketing/ui";

const exchanges = [
  { speaker: "interviewer", name: "Priya", text: "Walk me through a time you led a team through a difficult change." },
  { speaker: "you", name: "You", text: "Last year I was leading a product migration and our main stakeholder wanted to delay by a quarter..." },
  { speaker: "interviewer", name: "Priya", text: "What made you push back instead of agreeing to delay?" },
  { speaker: "you", name: "You", text: "I had data showing our churn was accelerating — every week of delay cost us roughly 200 users..." },
  { speaker: "interviewer", name: "Priya", text: "Strong. What did you learn about stakeholder management from that?" },
];

export function ProductDemo() {
  return (
    <Section tone="tint">
      <ScrollReveal>
        <div className="text-center">
          <Eyebrow>Live preview</Eyebrow>
          <SectionHeading className="mt-4">See what a session looks like.</SectionHeading>
          <Lede className="mx-auto mt-5 max-w-[540px]">
            A real-time voice interview with adaptive follow-ups, a live transcript, and scored
            feedback the moment you finish.
          </Lede>
        </div>
      </ScrollReveal>

      <ScrollReveal className="mt-14">
        <div className="mx-auto max-w-[940px]">
          {/* Browser frame */}
          <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-frame">
            {/* Top bar */}
            <div className="flex h-11 items-center border-b border-gray-100 bg-gray-50/80 px-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                <span className="h-3 w-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="mx-auto flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-gray-400" aria-hidden>
                  <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
                  <path d="M4 5.5V4a2 2 0 014 0v1.5" stroke="currentColor" strokeWidth="1" />
                </svg>
                <span className="font-mono text-[11px] text-gray-400">folio.io/session</span>
              </div>
            </div>

            {/* App content */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px]">
              {/* Conversation */}
              <div className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                  </span>
                  <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-brand-700">LIVE SESSION</span>
                  <span className="text-gray-300">·</span>
                  <span className="font-mono text-[11px] text-gray-400">Behavioral · Standard</span>
                </div>
                <ConversationThread />
              </div>

              {/* Interviewer panel */}
              <div className="border-t border-gray-100 bg-gray-50/60 p-6 md:border-l md:border-t-0 md:p-8">
                <div className="text-center">
                  <div className="relative mx-auto h-20 w-20">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 shadow-brand-glow">
                      <span className="font-display text-[26px] font-semibold text-white">P</span>
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-brand">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                        <rect x="3.5" y="1.5" width="3" height="4.5" rx="1.5" fill="white" />
                        <path d="M2.5 5a2.5 2.5 0 005 0M5 7.5V8.5" stroke="white" strokeWidth="0.9" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>

                  <h3 className="mt-4 text-[16px] font-semibold text-gray-900">Priya Patel</h3>
                  <p className="mt-0.5 text-[13px] text-gray-500">Senior Recruiter</p>

                  <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-500">Elapsed</span>
                      <span className="font-mono font-medium text-gray-900">4:32</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-brand" style={{ width: "15%" }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-gray-400">
                      <span>0:00</span>
                      <span>30:00</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-left">
                    <p className="text-[12px] font-medium text-gray-700">Session focus</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">Leadership</span>
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">Conflict</span>
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">Decisions</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-shadow hover:shadow-md" aria-label="Mute">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><rect x="6" y="3" width="4" height="6" rx="2" fill="currentColor" /><path d="M4 8a4 4 0 008 0M8 12v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    </button>
                    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600" aria-label="End session">
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden><rect x="2" y="2" width="10" height="10" rx="2.5" fill="currentColor" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </Section>
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
        <div key={i} className="flex gap-3 transition-all duration-500">
          <div
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
              line.speaker === "interviewer"
                ? "bg-brand-50 text-brand-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {line.speaker === "interviewer" ? "P" : "Y"}
          </div>
          <div>
            <p
              className={`text-[12px] font-medium ${
                line.speaker === "interviewer" ? "text-brand-700" : "text-gray-400"
              }`}
            >
              {line.name}
            </p>
            <p className="mt-0.5 text-[14px] leading-relaxed text-gray-700">{line.text}</p>
          </div>
        </div>
      ))}

      {visibleCount < exchanges.length && (
        <div className="flex items-center gap-2 pl-10">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms]" />
          </div>
          <span className="text-[12px] text-gray-400">Priya is speaking…</span>
        </div>
      )}
    </div>
  );
}
