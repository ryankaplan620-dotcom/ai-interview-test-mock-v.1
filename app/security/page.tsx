import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Section, Container, Eyebrow, SectionHeading, Lede, Button, Card } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How Folio keeps your data safe. Encryption at rest and in transit, no training on your data, and the right to delete anytime.",
};

const cards = [
  {
    title: "Encrypted at rest",
    detail: "AES-256",
    description:
      "All stored data, including session transcripts, feedback, and account information, is encrypted at rest using AES-256.",
  },
  {
    title: "Encrypted in transit",
    detail: "TLS 1.3",
    description:
      "Every connection to Folio is encrypted with TLS 1.3. Your audio, video, and data never travel over an unencrypted channel.",
  },
  {
    title: "Your data stays yours",
    detail: "Never used for training",
    description:
      "Your session content, transcripts, and feedback are never used to train models. Our agreements with our providers explicitly prohibit it.",
  },
  {
    title: "Right to delete",
    detail: "Export or delete anytime",
    description:
      "You can export all your data or delete your account at any time from Settings. Deletion is permanent and completed within 30 days.",
  },
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <Nav />

      {/* Hero */}
      <Section tone="white" className="pt-20 sm:pt-28 lg:pt-32">
        <div className="mx-auto max-w-[760px] text-center">
          <ScrollReveal>
            <Eyebrow>Security</Eyebrow>
            <SectionHeading as="h1" className="mt-5 font-extrabold">
              Built on trust.
            </SectionHeading>
            <Lede className="mx-auto mt-6 max-w-[560px]">
              Your practice sessions are private. Your data is encrypted. And you are always in
              control of what we store.
            </Lede>
          </ScrollReveal>
        </div>
      </Section>

      {/* Security cards */}
      <Section tone="tint" className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-[860px] gap-6 sm:grid-cols-2">
          {cards.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 90}>
              <Card className="h-full p-7 sm:p-8">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                  {card.detail}
                </span>
                <h3 className="mt-3 text-[19px] font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-gray-600">{card.description}</p>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Session privacy */}
      <Section tone="white">
        <div className="mx-auto max-w-[700px]">
          <ScrollReveal>
            <Eyebrow>Session privacy</Eyebrow>
            <SectionHeading className="mt-4 font-bold">
              What happens in the session stays in the session.
            </SectionHeading>
          </ScrollReveal>
          <div className="mt-8 space-y-5 text-[16.5px] leading-[1.75] text-gray-600">
            <ScrollReveal delay={100}>
              <p>
                Your practice sessions are visible only to you. No one at Folio reviews your
                transcripts, listens to your recordings, or reads your feedback unless you
                explicitly ask for human support. The interviewers process your audio in real
                time and discard the raw stream after the session ends.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <p>
                Feedback, scores, and memory notes are stored in your account and encrypted at
                rest. They exist solely to help you improve. We do not aggregate session content
                across users, and we do not share individual session data with employers,
                schools, or anyone else.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </Section>

      {/* Responsible disclosure */}
      <Section tone="tint">
        <Container className="text-center">
          <ScrollReveal>
            <Eyebrow>Responsible disclosure</Eyebrow>
            <SectionHeading className="mt-4 font-bold">Found something?</SectionHeading>
            <Lede className="mx-auto mt-5 max-w-[520px]">
              Security concerns? We take them seriously. Reach out and we will respond within 48
              hours.
            </Lede>
            <div className="mt-9 flex justify-center">
              <Button href="mailto:security@folio.io" size="lg">
                security@folio.io
              </Button>
            </div>
          </ScrollReveal>
        </Container>
      </Section>

      <Footer />
    </main>
  );
}
