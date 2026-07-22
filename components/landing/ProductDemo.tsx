"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";
import { Section, Eyebrow, SectionHeading, Lede } from "@/components/marketing/ui";

const exchanges = [
  { speaker: "interviewer", name: "Sarah", text: "Walk me through a time you led a team through a difficult change." },
  { speaker: "you", name: "You", text: "Last year I was leading a product migration and our main stakeholder wanted to delay by a quarter..." },
  { speaker: "interviewer", name: "Sarah", text: "What made you push back instead of agreeing to delay?" },
  { speaker: "you", name: "You", text: "I had data showing our churn was accelerating — every week of delay cost us roughly 200 users..." },
  { speaker: "interviewer", name: "Sarah", text: "Strong. What did you learn about stakeholder management from that?" },
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
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink shadow-frame">
            {/* Top bar */}
            <div className="flex h-11 items-center border-b border-white/[0.06] bg-ink-surface px-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                <span className="h-3 w-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="mx-auto flex items-center gap-2 rounded-md border border-ink-border bg-ink-raised px-3 py-1">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-text-tertiary" aria-hidden>
                  <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
                  <path d="M4 5.5V4a2 2 0 014 0v1.5" stroke="currentColor" strokeWidth="1" />
                </svg>
                <span className="font-mono text-[11px] text-text-tertiary">prepspace.example/session</span>
              </div>
            </div>

            {/* App content */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px]">
              {/* Conversation */}
              <div className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-accent">LIVE SESSION</span>
                  <span className="text-white/20">·</span>
                  <span className="font-mono text-[11px] text-text-tertiary">Behavioral · Standard</span>
                </div>
                <ConversationThread />
              </div>

              {/* Interviewer panel */}
              <div className="border-t border-white/[0.06] bg-ink-surface p-6 md:border-l md:border-t-0 md:p-8">
                <div className="text-center">
                  <div className="relative mx-auto h-20 w-20">
                    <Image
                      src="/images/agents/sarah.png"
                      alt="Sarah Chen, AI interviewer"
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full object-cover ring-1 ring-white/10"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink-surface bg-accent text-brand-ink">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                        <rect x="3.5" y="1.5" width="3" height="4.5" rx="1.5" fill="currentColor" />
                        <path d="M2.5 5a2.5 2.5 0 005 0M5 7.5V8.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-[17px] font-bold tracking-[-0.02em] text-text-primary">Sarah Chen</h3>
                  <p className="mt-0.5 text-[13px] text-text-secondary">Senior Recruiter</p>
                  <span className="mt-2.5 inline-flex items-center rounded-full border border-ink-border bg-ink-raised px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-accent">
                    Sarah v.2
                  </span>

                  <div className="mt-6 rounded-xl border border-ink-border bg-ink-raised p-4">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-text-tertiary">Elapsed</span>
                      <span className="font-mono font-medium text-text-primary">4:32</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                      <div className="h-full rounded-full bg-accent" style={{ width: "15%" }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-text-tertiary">
                      <span>0:00</span>
                      <span>30:00</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-ink-border bg-ink-raised p-4 text-left">
                    <p className="text-[12px] font-medium text-text-secondary">Session focus</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-medium text-accent">Leadership</span>
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-text-tertiary">Conflict</span>
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-text-tertiary">Decisions</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-border bg-ink-raised text-text-secondary transition-colors hover:bg-ink-border/60 hover:text-text-primary" aria-label="Mute">
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
          {line.speaker === "interviewer" ? (
            <Image
              src="/images/agents/sarah.png"
              alt=""
              width={28}
              height={28}
              className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-text-secondary">
              Y
            </div>
          )}
          <div>
            <p className={`text-[12px] font-medium ${line.speaker === "interviewer" ? "text-accent" : "text-text-tertiary"}`}>
              {line.name}
            </p>
            <p className="mt-0.5 text-[14px] leading-relaxed text-text-primary/90">{line.text}</p>
          </div>
        </div>
      ))}

      {visibleCount < exchanges.length && (
        <div className="flex items-center gap-2 pl-10">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/25 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/25 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/25 [animation-delay:300ms]" />
          </div>
          <span className="text-[12px] text-text-tertiary">Sarah is speaking…</span>
        </div>
      )}
    </div>
  );
}
