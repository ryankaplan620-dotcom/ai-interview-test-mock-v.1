import { ScrollReveal } from "./ScrollReveal";

const steps = [
  {
    number: "01",
    title: "Practice under real conditions",
    body: "Five distinct interviewer personalities, each calibrated to your target firm. Voice-only, real-time, adaptive.",
    icon: MicIcon,
  },
  {
    number: "02",
    title: "See your exact words, made stronger",
    body: "After every session, Folio pulls the sentences that cost you the round and shows you the stronger version.",
    icon: QuoteIcon,
  },
  {
    number: "03",
    title: "Open doors while you sleep",
    body: "Folio finds the recruiters who can open the door, drafts in your voice, and waits for your review before sending.",
    icon: PlaneIcon,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="px-6 py-24 sm:px-12 sm:py-32 lg:px-20"
      aria-label="How Folio works"
    >
      <div className="mx-auto max-w-[1440px]">
        <ScrollReveal>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            <span className="font-mono text-[11px] font-medium tracking-label text-accent">
              HOW FOLIO WORKS
            </span>
          </div>

          <h2 className="mt-6 font-display text-[36px] font-semibold tracking-heading text-text-primary sm:text-[44px]">
            Three engines. One career.
          </h2>
        </ScrollReveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 150}>
              <div className="rounded-2xl border border-ink-border bg-ink-surface p-8 transition-all duration-300 ease-out hover:-translate-y-[2px] hover:border-accent/30 hover:shadow-accent-glow">
                <span className="font-mono text-[11px] tracking-label text-accent">
                  {step.number}
                </span>

                <div className="mt-4">
                  <step.icon />
                </div>

                <h3 className="mt-5 font-display text-xl font-semibold text-text-primary">
                  {step.title}
                </h3>

                <p className="mt-3 font-sans text-[15px] leading-relaxed text-text-secondary">
                  {step.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function MicIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="#00F590"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="5" y="2" width="6" height="8" rx="3" />
      <path d="M3 8a5 5 0 0 0 10 0" />
      <path d="M8 13v2" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="#00F590"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 9.5C3 7 4.5 4.5 7 3.5L6.5 5C7.5 5 8 6 8 7c0 1.5-1 2.5-2.5 2.5S3 8.5 3 9.5z" />
      <path d="M9 9.5C9 7 10.5 4.5 13 3.5L12.5 5C13.5 5 14 6 14 7c0 1.5-1 2.5-2.5 2.5S9 8.5 9 9.5z" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="#00F590"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 1.5L6.5 9.5" />
      <path d="M14.5 1.5L10 14.5L6.5 9.5L1.5 6L14.5 1.5Z" />
    </svg>
  );
}
