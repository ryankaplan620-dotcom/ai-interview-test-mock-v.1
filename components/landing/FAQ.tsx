"use client";

import { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";
import { Section, Eyebrow, SectionHeading } from "@/components/marketing/ui";

const faqs = [
  {
    question: "What exactly is Folio?",
    answer:
      "Folio runs live voice interview practice sessions with distinct interviewer personas, each calibrated to your target firm. After each session, you get quote-based feedback showing your exact words alongside stronger versions. A separate outreach engine finds and drafts personalized messages to recruiters in your voice.",
  },
  {
    question: "How realistic are the interviews?",
    answer:
      "The interviewers remember what you said, catch contradictions, and adapt their questions based on your answers — the same way a real interviewer would. The practice is voice-only, under real time pressure, with no text prompts or coaching during the session.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. Every plan includes a 15-day free trial with no credit card required. You can run sessions, get feedback, and see your Folio Score before deciding.",
  },
  {
    question: "How is this different from practicing with a chatbot?",
    answer:
      "A chatbot is text-based, un-calibrated, and coaches you during the conversation. Folio is voice-only, calibrated to specific firms and rounds, uses distinct interviewer personalities, and only gives feedback after the session ends — the way real interviews work.",
  },
  {
    question: "What firms does Folio cover?",
    answer:
      "Folio covers all types of interviews — from Fortune 500 companies to startups, government agencies to healthcare systems. Our question banks span behavioral, technical, case, product, and general professional interviews. Whether you’re interviewing at Google or your local hospital, Folio adapts.",
  },
  {
    question: "Is my data private?",
    answer:
      "Sessions are encrypted at rest and in transit. Folio never uses your practice sessions for training. You can export or delete all your data at any time.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel from your account settings with one click. No cancellation fees, no retention calls, no friction.",
  },
  {
    question: "What if I don’t improve?",
    answer:
      "94% of users who practice three or more times in their first week reach a Folio Score of 70 by day 14. If you don’t see improvement after consistent use, email us — we’ll work with you directly.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section tone="tint">
      <ScrollReveal>
        <div className="text-center">
          <Eyebrow>Questions</Eyebrow>
          <SectionHeading className="mt-4">Everything you need to know.</SectionHeading>
        </div>
      </ScrollReveal>

      <ScrollReveal className="mx-auto mt-14 max-w-[820px]">
        <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-card">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className={i !== 0 ? "border-t border-gray-100" : ""}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-gray-50/60"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="text-[15.5px] font-medium text-gray-900">{faq.question}</span>
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
                  style={{ maxHeight: isOpen ? "420px" : "0px", opacity: isOpen ? 1 : 0 }}
                >
                  <p className="px-6 pb-6 pr-14 text-[14.5px] leading-relaxed text-gray-600">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollReveal>
    </Section>
  );
}
