import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Section, Container, Eyebrow, SectionHeading, Lede, Button } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "About",
  description:
    "Folio exists because interview prep is broken. We built a practice environment indistinguishable from the real thing.",
};

const stats = [
  { value: "200+", label: "Companies" },
  { value: "3", label: "Interviewer personas" },
  { value: "4", label: "Score dimensions" },
  { value: "90s", label: "To first score" },
];

const paragraphs = [
  "Most candidates prepare by reading lists of questions and rehearsing answers in their head. That is not practice. Real interviews are live, unpredictable, and conversational. The gap between reading about interviews and sitting in one is enormous, and that gap costs people offers.",
  "Practice needs to feel real. That means a voice on the other end that listens, follows up, and pushes back. It means feedback that cites the exact words you said, not generic advice. And it means scoring that tracks your progress across the dimensions interviewers actually evaluate: structure, specificity, self-awareness, communication, and more.",
  "Folio is voice-first because interviews are conversations, not text boxes. Our feedback is quote-based because you need to see what you actually said, not what a summary thinks you said. And our outreach pipeline is human-in-the-loop because automated spam does not land interviews. Every piece of the product exists to close the gap between practice and performance.",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <Nav />

      {/* Hero */}
      <Section tone="white" className="pt-20 sm:pt-28 lg:pt-32">
        <div className="mx-auto max-w-[760px] text-center">
          <ScrollReveal>
            <Eyebrow>About</Eyebrow>
            <SectionHeading as="h1" className="mt-5">
              Built to get you hired.
            </SectionHeading>
            <Lede className="mx-auto mt-6 max-w-[600px]">
              Folio is a live interview practice platform where every session feels
              indistinguishable from the real thing. We combine voice-first interviewers,
              quote-level feedback, and human-calibrated scoring so you walk into the room
              already sharp.
            </Lede>
          </ScrollReveal>
        </div>
      </Section>

      {/* Story */}
      <Section tone="white" className="pt-4 sm:pt-6 lg:pt-8">
        <div className="mx-auto max-w-[700px]">
          <ScrollReveal>
            <Eyebrow>Why we exist</Eyebrow>
            <SectionHeading className="mt-4">Interview prep is broken.</SectionHeading>
          </ScrollReveal>
          <div className="mt-9 space-y-6 text-[16.5px] leading-[1.75] text-gray-600">
            {paragraphs.map((p, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <p>{p}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </Section>

      {/* By the numbers */}
      <Section tone="tint">
        <ScrollReveal>
          <p className="text-center font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            By the numbers
          </p>
        </ScrollReveal>
        <div className="mt-12 grid grid-cols-2 gap-y-10 text-center md:grid-cols-4">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 100}>
              <p className="font-display text-[48px] font-semibold leading-none tracking-[-0.03em] text-gray-900">
                {stat.value}
              </p>
              <div className="mx-auto mt-3 h-[2px] w-10 bg-brand" aria-hidden />
              <p className="mt-3 text-[14px] text-gray-500">{stat.label}</p>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section tone="white">
        <Container className="text-center">
          <ScrollReveal>
            <SectionHeading>Ready to practice?</SectionHeading>
            <Lede className="mx-auto mt-5 max-w-[440px]">
              Under 90 seconds to your first Folio Score. No credit card.
            </Lede>
            <div className="mt-9 flex justify-center">
              <Button href="/signup" size="lg" withArrow>
                Start practicing
              </Button>
            </div>
          </ScrollReveal>
        </Container>
      </Section>

      <Footer />
    </main>
  );
}
