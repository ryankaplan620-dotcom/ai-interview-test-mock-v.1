import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Section, Container, Eyebrow, SectionHeading, Lede, Button, ArrowLink, Card, CheckIcon } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Folio works: configure a session, talk to a calibrated interviewer in real time, and get a scored, quote-level breakdown the moment you finish.",
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  {
    n: "01",
    title: "Set the room",
    body: "Pick your target role, seniority, and interview type, then choose one of three interviewer personas. Drop in a job description or résumé and the session calibrates to it.",
    points: ["Role + seniority + format", "Three distinct personas", "Optional JD / résumé context"],
  },
  {
    n: "02",
    title: "Talk, for real",
    body: "It’s voice-only and live. The interviewer listens, follows up on what you actually said, and pushes back when an answer doesn’t hold — with live captions and a running timer.",
    points: ["Real-time voice, no scripts", "Adaptive follow-ups", "Live captions + end-early control"],
  },
  {
    n: "03",
    title: "Get the verdict",
    body: "The moment you finish, Folio scores you across three dimensions and pulls the exact sentences that cost you the round — each paired with a stronger version.",
    points: ["A single Folio Score", "Quote-level feedback", "Strengths, gaps, next steps"],
  },
  {
    n: "04",
    title: "Come back sharper",
    body: "Every session is remembered. Personas reference what you said last time, your score trends over weeks, and daily drills keep the reps up between full interviews.",
    points: ["Cross-session memory", "Trend over time", "Daily communication drills"],
  },
];

const loop = [
  { label: "You speak", sub: "Voice in, real time" },
  { label: "Transcribed live", sub: "On-screen captions" },
  { label: "Persona adapts", sub: "Follows up on your answer" },
  { label: "Scored after", sub: "Quote-level feedback" },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <Nav />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-brand-wash" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-grid-faint [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_70%)]"
          aria-hidden
        />
        <Container className="py-20 text-center sm:py-28 lg:py-32">
          <ScrollReveal>
            <Eyebrow>How it works</Eyebrow>
            <SectionHeading as="h1" className="mx-auto mt-5 max-w-[760px] font-extrabold">
              The interview, before the interview.
            </SectionHeading>
            <Lede className="mx-auto mt-6 max-w-[600px]">
              Folio turns interview prep into reps that feel real — a live voice conversation
              with a calibrated interviewer, then a scored breakdown of every answer.
            </Lede>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
              <Button href="/signup" size="lg" withArrow>
                Start free
              </Button>
              <ArrowLink href="/pricing">See pricing</ArrowLink>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* The loop */}
      <Section tone="tint" className="py-16 sm:py-20">
        <ScrollReveal>
          <div className="text-center">
            <Eyebrow>The live loop</Eyebrow>
            <SectionHeading className="mt-4 font-bold">One conversation. Four moving parts.</SectionHeading>
          </div>
        </ScrollReveal>
        <ScrollReveal className="mt-12">
          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {loop.map((node, i) => (
              <div key={node.label} className="relative">
                <div className="flex h-full flex-col rounded-2xl border border-gray-200/70 bg-white p-6 shadow-card">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                    Step {i + 1}
                  </span>
                  <p className="mt-2 text-[17px] font-semibold text-gray-900">{node.label}</p>
                  <p className="mt-1 text-[13.5px] text-gray-500">{node.sub}</p>
                </div>
                {i < loop.length - 1 && (
                  <span className="absolute right-[-14px] top-1/2 z-10 hidden -translate-y-1/2 text-gray-300 lg:block" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10h11M11 5.5 15.5 10 11 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[13px] text-gray-400">
            The loop runs continuously until you end the session — just like the real thing.
          </p>
        </ScrollReveal>
      </Section>

      {/* Steps — alternating */}
      <Section tone="white">
        <div className="space-y-16 sm:space-y-24">
          {steps.map((step, i) => (
            <ScrollReveal key={step.n}>
              <div className="grid items-center gap-8 md:grid-cols-2 lg:gap-16">
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  <span className="font-mono text-[13px] font-semibold tracking-[0.12em] text-brand-600">{step.n}</span>
                  <h3 className="mt-2 text-balance font-display text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-gray-900 sm:text-[34px]">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-gray-600">{step.body}</p>
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : ""}>
                  <Card className="p-7 sm:p-8">
                    <ul className="space-y-px">
                      {step.points.map((p, j) => (
                        <li
                          key={p}
                          className={`flex items-center gap-3 py-3.5 ${j !== step.points.length - 1 ? "border-b border-gray-100" : ""}`}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                            <CheckIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-[15px] font-medium text-gray-800">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section tone="tint">
        <Container className="text-center">
          <ScrollReveal>
            <SectionHeading className="font-bold">Run your first session free.</SectionHeading>
            <Lede className="mx-auto mt-5 max-w-[460px]">
              Under 90 seconds to your first Folio Score. No credit card required.
            </Lede>
            <div className="mt-9 flex justify-center">
              <Button href="/signup" size="lg" withArrow>
                Start free
              </Button>
            </div>
          </ScrollReveal>
        </Container>
      </Section>

      <Footer />
    </main>
  );
}
