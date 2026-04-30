import type { Metadata } from "next";
import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Footer } from "@/components/landing/Footer";

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
      "All stored data, including session transcripts, feedback, and account information, is encrypted at rest using AES-256 encryption.",
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
      "Your session content, transcripts, and feedback are never used to train AI models. Our agreements with our AI providers explicitly prohibit it.",
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
    <main className="relative min-h-screen bg-ink text-text-primary">
      <div className="pointer-events-none fixed inset-0 bg-depth-glow opacity-50" aria-hidden />

      <div className="relative">
        {/* Nav */}
        <nav className="border-b border-ink-border/35 bg-ink/80 backdrop-blur-md">
          <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 sm:px-10">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <FolioMark className="h-6 w-6" color="#00F590" />
              <span className="font-display text-lg font-semibold tracking-[-0.025em] text-text-primary">
                folio
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="font-sans text-[13.5px] font-medium text-text-secondary hover:text-text-primary"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center rounded-full bg-accent px-4 font-sans text-[13.5px] font-semibold text-text-onAccent hover:bg-accent-highlight"
              >
                Start free &rarr;
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="px-6 py-24 sm:px-10 sm:py-32">
          <div className="mx-auto max-w-[720px] text-center">
            <ScrollReveal>
              <span className="font-mono text-[11px] font-medium tracking-label text-accent">
                SECURITY
              </span>
              <h1 className="mt-6 font-display text-[44px] font-semibold leading-[1.1] tracking-display text-text-primary sm:text-[56px]">
                Built on trust.
              </h1>
              <p className="mx-auto mt-8 max-w-[580px] font-sans text-[17px] leading-relaxed text-text-secondary">
                Your practice sessions are private. Your data is encrypted. And you are always
                in control of what we store.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto h-px max-w-[1200px] bg-gradient-to-r from-transparent via-ink-border/40 to-transparent" />

        {/* Security cards — 2x2 grid */}
        <section className="px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[840px]">
            <div className="grid gap-6 sm:grid-cols-2">
              {cards.map((card, i) => (
                <ScrollReveal key={card.title} delay={i * 100}>
                  <div className="rounded-2xl border border-ink-border bg-ink-surface p-8">
                    <span className="font-mono text-[10px] font-medium tracking-label text-accent">
                      {card.detail.toUpperCase()}
                    </span>
                    <h3 className="mt-2 font-display text-[20px] font-semibold text-text-primary">
                      {card.title}
                    </h3>
                    <p className="mt-3 font-sans text-[14px] leading-relaxed text-text-secondary">
                      {card.description}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto h-px max-w-[1200px] bg-gradient-to-r from-transparent via-ink-border/40 to-transparent" />

        {/* Session privacy */}
        <section className="px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[680px]">
            <ScrollReveal>
              <span className="font-mono text-[11px] font-medium tracking-label text-accent">
                SESSION PRIVACY
              </span>
              <h2 className="mt-4 font-display text-[28px] font-semibold tracking-heading text-text-primary sm:text-[32px]">
                What happens in the session stays in the session.
              </h2>
            </ScrollReveal>
            <div className="mt-8 space-y-5 font-sans text-[16px] leading-[1.7] text-text-secondary">
              <ScrollReveal delay={100}>
                <p>
                  Your practice sessions are visible only to you. No one at Folio reviews your
                  transcripts, listens to your recordings, or reads your feedback unless you
                  explicitly ask for human support. The AI interviewers process your audio in
                  real time and discard the raw stream after the session ends.
                </p>
              </ScrollReveal>
              <ScrollReveal delay={200}>
                <p>
                  Feedback, scores, and memory notes are stored in your account and encrypted
                  at rest. They exist solely to help you improve. We do not aggregate session
                  content across users, and we do not share individual session data with
                  employers, schools, or anyone else.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto h-px max-w-[1200px] bg-gradient-to-r from-transparent via-ink-border/40 to-transparent" />

        {/* Responsible disclosure */}
        <section className="px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[680px] text-center">
            <ScrollReveal>
              <span className="font-mono text-[11px] font-medium tracking-label text-accent">
                RESPONSIBLE DISCLOSURE
              </span>
              <h2 className="mt-4 font-display text-[28px] font-semibold tracking-heading text-text-primary sm:text-[32px]">
                Found something?
              </h2>
              <p className="mt-4 font-sans text-[17px] leading-relaxed text-text-secondary">
                Security concerns? We take them seriously. Reach out and we will respond
                within 48 hours.
              </p>
              <div className="mt-8">
                <a
                  href="mailto:security@folio.io"
                  className="inline-flex h-[48px] items-center rounded-full bg-cta-gradient px-8 font-sans text-[15px] font-semibold tracking-body text-text-onAccent transition-all duration-200 ease-brand hover:shadow-accent-glow-lg"
                >
                  security@folio.io
                </a>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
