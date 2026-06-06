import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Section, Container, Eyebrow, SectionHeading, Lede, Button } from "@/components/marketing/ui";
import { FaqAccordion, type FaqCategory } from "./faq-accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about Folio — how the live voice interviews work, what's included in each plan, the free trial, and how your data is handled.",
  alternates: { canonical: "/faq" },
};

const categories: FaqCategory[] = [
  {
    title: "General",
    items: [
      {
        q: "What exactly is Folio?",
        a: "Folio runs live voice interview practice with distinct interviewer personas, each calibrated to your target firm and role. After every session you get a Folio Score and quote-level feedback showing your exact words next to a stronger version.",
      },
      {
        q: "How is this different from practicing with a chatbot?",
        a: "A chatbot is text-based, un-calibrated, and coaches you mid-conversation. Folio is voice-only, calibrated to specific firms and rounds, uses distinct interviewer personalities, and only gives feedback after the session ends — the way real interviews actually work.",
      },
      {
        q: "What kinds of interviews does Folio cover?",
        a: "Behavioral, technical, case, product, and general professional interviews — across Fortune 500 companies, startups, consulting, finance, healthcare, and government. Sessions calibrate to how each organization tends to interview.",
      },
    ],
  },
  {
    title: "The interview",
    items: [
      {
        q: "How realistic are the interviews?",
        a: "The interviewer remembers what you said, catches contradictions, and adapts its questions based on your answers — just like a real interviewer. There are no text prompts or coaching during the session, and you're under real time pressure.",
      },
      {
        q: "Is it really voice-only?",
        a: "Yes. You speak, the interviewer responds out loud, and live captions track the conversation. Interviews are spoken performances, so the practice is too — no typing your answers.",
      },
      {
        q: "Can I focus on a specific role or company?",
        a: "Set your target role, seniority, and interview type when you start a session, and optionally add a job description or résumé. The questions and follow-ups calibrate to that context.",
      },
    ],
  },
  {
    title: "Plans & billing",
    items: [
      {
        q: "Is there a free trial?",
        a: "Your first interview is free with no credit card. Paid plans add a 15-day free trial on your first purchase — run sessions and see your Folio Score before you're charged.",
      },
      {
        q: "Why cycles instead of monthly billing?",
        a: "Recruiting is seasonal. The Basic plan (90 days) matches a real recruiting season; Pro and Max run annually. You pay for a prep season, not dead months.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes — one click from account settings. No cancellation fees, no retention calls. You keep access through the end of the period you've already paid for.",
      },
    ],
  },
  {
    title: "Privacy & data",
    items: [
      {
        q: "Is my data private?",
        a: "Your sessions are visible only to you. Data is encrypted in transit and at rest, and we never sell it. See the Security page for the specifics.",
      },
      {
        q: "Do you train models on my sessions?",
        a: "No. Your transcripts, feedback, and memory notes are never used to train models, and our provider agreements prohibit it. You can export or delete all your data at any time.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: categories.flatMap((c) =>
              c.items.map((it) => ({
                "@type": "Question",
                name: it.q,
                acceptedAnswer: { "@type": "Answer", text: it.a },
              })),
            ),
          }),
        }}
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-brand-wash" aria-hidden />
        <Container className="py-20 text-center sm:py-24 lg:py-28">
          <ScrollReveal>
            <Eyebrow>FAQ</Eyebrow>
            <SectionHeading as="h1" className="mt-5">
              Questions, answered.
            </SectionHeading>
            <Lede className="mx-auto mt-6 max-w-[520px]">
              Everything about how Folio works, what's included, and how your data is handled.
            </Lede>
          </ScrollReveal>
        </Container>
      </section>

      {/* Accordion */}
      <Section tone="white" className="pt-0 sm:pt-0 lg:pt-0">
        <div className="mx-auto max-w-[820px]">
          <ScrollReveal>
            <FaqAccordion categories={categories} />
          </ScrollReveal>
        </div>
      </Section>

      {/* Still have questions */}
      <Section tone="tint">
        <Container className="text-center">
          <ScrollReveal>
            <SectionHeading>Still have a question?</SectionHeading>
            <Lede className="mx-auto mt-5 max-w-[460px]">
              We're happy to help. Reach the team directly and we'll get back to you.
            </Lede>
            <div className="mt-9 flex flex-wrap justify-center gap-x-5 gap-y-3">
              <Button href="/contact" size="lg" withArrow>
                Contact us
              </Button>
              <Button href="/signup" size="lg" variant="secondary">
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
