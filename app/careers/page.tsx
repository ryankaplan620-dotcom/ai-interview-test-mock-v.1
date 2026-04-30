import type { Metadata } from "next";
import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join Folio and help build the thing that gets people hired. Open roles in engineering, ML, marketing, and content.",
};

const values = [
  {
    title: "Voice-first thinking",
    description:
      "Interviews are conversations, not forms. Every feature we build starts with the spoken word and works backward to the interface.",
  },
  {
    title: "Ship then polish",
    description:
      "Get it in front of users fast, learn what matters, then make it great. Perfection in a vacuum helps no one.",
  },
  {
    title: "Outcomes over activity",
    description:
      "We care whether candidates get hired, not how many features we shipped. Every metric ties back to real interview performance.",
  },
];

const roles = [
  {
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote",
  },
  {
    title: "ML Engineer \u2014 Voice",
    department: "Engineering",
    location: "Remote",
  },
  {
    title: "Growth Marketing Lead",
    department: "Marketing",
    location: "Remote",
  },
  {
    title: "Content Editor (The Journal)",
    department: "Content",
    location: "Remote",
  },
];

export default function CareersPage() {
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
                CAREERS
              </span>
              <h1 className="mt-6 font-display text-[44px] font-semibold leading-[1.1] tracking-display text-text-primary sm:text-[56px]">
                Build the thing that gets
                <br />
                <em className="font-serif font-normal italic text-accent">people hired.</em>
              </h1>
              <p className="mx-auto mt-8 max-w-[580px] font-sans text-[17px] leading-relaxed text-text-secondary">
                We are a small team making interview practice feel real. If you care about
                craft, move fast, and want your work to directly change outcomes for people,
                we want to talk.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto h-px max-w-[1200px] bg-gradient-to-r from-transparent via-ink-border/40 to-transparent" />

        {/* Values */}
        <section className="px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[1000px]">
            <ScrollReveal>
              <p className="text-center font-mono text-[11px] font-medium tracking-label text-accent">
                HOW WE WORK
              </p>
            </ScrollReveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {values.map((value, i) => (
                <ScrollReveal key={value.title} delay={i * 100}>
                  <div className="rounded-2xl border border-ink-border bg-ink-surface p-8">
                    <h3 className="font-display text-[18px] font-semibold text-text-primary">
                      {value.title}
                    </h3>
                    <p className="mt-3 font-sans text-[14px] leading-relaxed text-text-secondary">
                      {value.description}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto h-px max-w-[1200px] bg-gradient-to-r from-transparent via-ink-border/40 to-transparent" />

        {/* Open roles */}
        <section className="px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-[720px]">
            <ScrollReveal>
              <p className="font-mono text-[11px] font-medium tracking-label text-accent">
                OPEN ROLES
              </p>
              <h2 className="mt-4 font-display text-[32px] font-semibold tracking-heading text-text-primary sm:text-[36px]">
                Join the team.
              </h2>
            </ScrollReveal>
            <div className="mt-10 space-y-4">
              {roles.map((role, i) => (
                <ScrollReveal key={role.title} delay={i * 80}>
                  <a
                    href={`mailto:careers@folio.io?subject=Application: ${role.title}`}
                    className="group flex items-center justify-between rounded-xl border border-ink-border bg-ink-surface p-6 transition-colors hover:border-accent/40"
                  >
                    <div>
                      <h3 className="font-display text-[16px] font-semibold text-text-primary">
                        {role.title}
                      </h3>
                      <p className="mt-1 font-sans text-[13px] text-text-tertiary">
                        {role.department} &middot; {role.location}
                      </p>
                    </div>
                    <span className="font-sans text-[14px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                      Apply &rarr;
                    </span>
                  </a>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto h-px max-w-[1200px] bg-gradient-to-r from-transparent via-ink-border/40 to-transparent" />

        {/* CTA */}
        <section className="px-6 py-24 sm:px-10 sm:py-32">
          <div className="mx-auto max-w-[720px] text-center">
            <ScrollReveal>
              <h2 className="font-display text-[28px] font-semibold tracking-heading text-text-primary sm:text-[32px]">
                Don&apos;t see your role?
              </h2>
              <p className="mt-4 font-sans text-[17px] text-text-secondary">
                Reach out anyway. We are always looking for people who care about this problem.
              </p>
              <div className="mt-8">
                <a
                  href="mailto:careers@folio.io"
                  className="inline-flex h-[48px] items-center rounded-full bg-cta-gradient px-8 font-sans text-[15px] font-semibold tracking-body text-text-onAccent transition-all duration-200 ease-brand hover:shadow-accent-glow-lg"
                >
                  careers@folio.io
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
