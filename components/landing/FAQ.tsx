"use client";

import { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";

const faqs = [
  {
    question: "What exactly is Folio?",
    answer:
      "Folio runs live voice interview practice sessions with distinct interviewer personas, each calibrated to your target firm. After each session, you get quote-based feedback showing your exact words alongside stronger versions. A separate outreach engine finds and drafts personalized messages to recruiters in your voice.",
  },
  {
    question: "How realistic are the interviews?",
    answer:
      "The interviewers remember what you said, catch contradictions, and adapt their questions based on your answers \u2014 the same way a real interviewer would. The practice is voice-only, under real time pressure, with no text prompts or coaching during the session.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. Every plan includes a 15-day free trial with no credit card required. You can run sessions, get feedback, and see your Folio Score before deciding.",
  },
  {
    question: "How is this different from practicing with ChatGPT?",
    answer:
      "ChatGPT is text-based, un-calibrated, and coaches you during the conversation. Folio is voice-only, calibrated to specific firms and rounds, uses distinct interviewer personalities, and only gives feedback after the session ends \u2014 the way real interviews work.",
  },
  {
    question: "What firms does Folio cover?",
    answer:
      "Folio covers all types of interviews \u2014 from Fortune 500 companies to startups, government agencies to healthcare systems. Our question banks span behavioral, technical, case, product, and general professional interviews. Whether you\u2019re interviewing at Google or your local hospital, Folio adapts.",
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
    question: "What if I don\u2019t improve?",
    answer:
      "94% of users who practice three or more times in their first week reach a Folio Score of 70 by day 14. If you don\u2019t see improvement after consistent use, email us \u2014 we\u2019ll work with you directly.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      className="bg-[#0D1117] px-6 py-24 sm:px-8 md:py-32"
      aria-label="Frequently asked questions"
    >
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal>
          <span className="font-mono text-[13px] font-medium tracking-[0.1em] uppercase text-[#00DC82]">
            QUESTIONS
          </span>

          <h2 className="mt-4 text-[36px] font-bold tracking-[-0.03em] text-[#F0F6FC] sm:text-[44px]">
            Everything you need to know.
          </h2>
        </ScrollReveal>

        <div className="mx-auto mt-16 max-w-[800px]">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;

            return (
              <ScrollReveal key={i} delay={i * 50}>
                <div className="border-b border-[#21262D]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-5 text-left"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="text-[15px] font-medium text-[#F0F6FC]">
                      {faq.question}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`ml-4 shrink-0 text-[#6E7681] transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    >
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{
                      maxHeight: isOpen ? "400px" : "0px",
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <p className="pt-2 pb-6 text-[14px] leading-relaxed text-[#8B949E]">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
