import { ScrollReveal } from "./ScrollReveal";
import { Section, Eyebrow, SectionHeading, Lede, Card } from "@/components/marketing/ui";

const steps = [
  {
    number: "01",
    title: "Practice under real conditions",
    body: "Three distinct interviewer personalities, each calibrated to your target firm. Voice-only, real-time, adaptive — no scripts, no safety net.",
  },
  {
    number: "02",
    title: "See your exact words, made stronger",
    body: "After every session, Folio pulls the sentences that cost you the round and shows you the stronger version, side by side.",
  },
  {
    number: "03",
    title: "Open doors while you sleep",
    body: "Folio finds the recruiters who can open the door, drafts in your voice, and waits for your review before anything sends.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="white">
      <ScrollReveal>
        <Eyebrow>How it works</Eyebrow>
        <SectionHeading className="mt-4">Three engines. One career.</SectionHeading>
        <Lede className="mt-5 max-w-[560px]">
          Simulate the interview, sharpen every answer, and reach the people who decide —
          all in one place.
        </Lede>
      </ScrollReveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <ScrollReveal key={step.number} delay={i * 120}>
            <Card interactive className="h-full p-8">
              <span className="card-crown" aria-hidden />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 font-mono text-[15px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
                {step.number}
              </div>
              <h3 className="mt-6 font-display text-[20px] font-bold leading-snug tracking-[-0.02em] text-gray-900">
                {step.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{step.body}</p>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}
