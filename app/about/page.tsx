import type { Metadata } from "next";
import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "About",
  description:
    "Folio exists because interview prep is broken. We built a practice environment indistinguishable from the real thing.",
};

const stats = [
  { value: "200+", label: "Companies" },
  { value: "3", label: "Interviewer personas" },
  { value: "6", label: "Score dimensions" },
  { value: "90s", label: "To first score" },
];

export default function AboutPage() {
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
                ABOUT
              </span>
              <h1 className="mt-6 font-display text-[44px] font-semibold leading-[1.1] tracking-display text-text-primary sm:text-[56px]">
                Built to get you hired.
              </h1>
              <p className="mx-auto mt-8 max-w-[580px] font-sans text-[17px] leading-relaxed text-text-secondary">
                Folio is a live interview practice platform where every session feels
                indistinguishable from the real thing. We combine voice-first AI interviewers,
                quote-level feedback, and human-calibrated scoring so you walk into the room
                already sharp.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto h-px max-w-[1200px] bg-gradient-to-r from-transparent via-ink-border/40 to-transparent" />

        {/* Story */}
        <section className="px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[680px]">
            <ScrollReveal>
              <span className="font-mono text-[11px] font-medium tracking-label text-accent">
                WHY WE EXIST
              </span>
              <h2 className="mt-4 font-display text-[32px] font-semibold tracking-heading text-text-primary sm:text-[36px]">
                Interview prep is broken.
              </h2>
            </ScrollReveal>

            <div className="mt-10 space-y-6 font-sans text-[16px] leading-[1.7] text-text-secondary">
              <ScrollReveal delay={100}>
                <p>
                  Most candidates prepare by reading lists of questions and rehearsing answers
                  in their head. That is not practice. Real interviews are live, unpredictable,
                  and conversational. The gap between reading about interviews and sitting in
                  one is enormous, and that gap costs people offers.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <p>
                  Practice needs to feel real. That means a voice on the other end that listens,
                  follows up, and pushes back. It means feedback that cites the exact words you
                  said, not generic advice. And it means scoring that tracks your progress
                  across the dimensions interviewers actually evaluate: structure, specificity,
                  self-awareness, communication, and more.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={300}>
                <p>
                  Folio is voice-first because interviews are conversations, not text boxes. Our
                  feedback is quote-based because you need to see what you actually said, not
                  what a summary thinks you said. And our outreach pipeline is
                  human-in-the-loop because automated spam does not land interviews. Every piece
                  of the product exists to close the gap between practice and performance.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto h-px max-w-[1200px] bg-gradient-to-r from-transparent via-ink-border/40 to-transparent" />

        {/* By the numbers */}
        <section className="px-6 py-20 sm:px-10 sm:py-28" aria-label="Key stats">
          <div className="mx-auto max-w-[1440px]">
            <ScrollReveal>
              <p className="text-center font-mono text-[11px] font-medium tracking-label text-accent">
                BY THE NUMBERS
              </p>
            </ScrollReveal>
            <div className="mt-12 grid gap-8 text-center md:grid-cols-4">
              {stats.map((stat, i) => (
                <ScrollReveal key={stat.label} delay={i * 100}>
                  <div>
                    <p className="font-display text-[48px] font-bold text-accent">{stat.value}</p>
                    <div className="mx-auto mt-2 h-px w-12 bg-accent/30" aria-hidden />
                    <p className="mt-2 font-sans text-sm text-text-tertiary">{stat.label}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto h-px max-w-[1200px] bg-gradient-to-r from-transparent via-ink-border/40 to-transparent" />

        {/* CTA */}
        <section className="px-6 py-24 sm:px-10 sm:py-32">
          <div className="mx-auto max-w-[1440px] text-center">
            <ScrollReveal>
              <h2 className="font-display text-[36px] font-semibold tracking-heading text-text-primary sm:text-[44px]">
                Ready to practice?
              </h2>
              <p className="mt-4 font-sans text-[17px] text-text-secondary">
                Under 90 seconds to your first Folio Score. No credit card.
              </p>
              <div className="mt-10">
                <Link
                  href="/signup"
                  className="inline-flex h-[52px] items-center rounded-full bg-cta-gradient px-8 font-sans text-[15px] font-semibold tracking-body text-text-onAccent transition-all duration-200 ease-brand hover:shadow-accent-glow-lg"
                >
                  Start practicing &rarr;
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
