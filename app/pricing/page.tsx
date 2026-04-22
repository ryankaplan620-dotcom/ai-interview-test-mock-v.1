export const dynamic = "force-dynamic";
import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";
import { PricingClient } from "./pricing-client";
import { getUser, getUserTier } from "@/lib/auth/server";

export const metadata = {
  title: "Pricing",
  description:
    "Folio pricing — Cycle $49 (90 days, students), Pro $149 (full year), Max $249 (full year with panels and superday).",
};

export default async function PricingPage() {
  const user = await getUser();
  const tier = user ? await getUserTier() : null;
  const currentTier = tier?.effective_tier ?? null;
  const isVerifiedStudent = tier?.is_verified_student ?? false;

  return (
    <main className="relative min-h-screen bg-ink">
      <div className="pointer-events-none fixed inset-0 grid-overlay opacity-[0.25]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-depth-glow opacity-60" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-ambient-glow opacity-50" aria-hidden />

      {/* Minimal nav */}
      <nav className="relative border-b border-ink-border/35 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 sm:px-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <FolioMark className="h-6 w-6" color="#00F590" />
            <span className="font-display text-lg font-semibold tracking-[-0.025em] text-text-primary">
              folio
            </span>
          </Link>
          {!user && (
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
                Start free →
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto max-w-[840px] text-center">
          <span className="font-mono text-[11px] font-medium tracking-label text-accent">PRICING</span>
          <h1 className="mt-6 font-display text-[44px] font-semibold leading-[1.1] tracking-display text-text-primary sm:text-[56px]">
            Built for the cycle.
            <br />
            <em className="font-serif font-normal italic text-accent">Not the month.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-[580px] font-sans text-[17px] leading-relaxed text-text-secondary">
            Recruiting happens in quarters, not billing cycles. Pay once for a full prep season with a
            generous session allowance, unlimited drill practice, and every persona from day one.
          </p>
          <p className="mt-4 font-sans text-[14px] text-text-tertiary">
            15-day free trial on your first purchase. Cancel anytime before renewal.
          </p>
        </div>
      </section>

      {/* Tier grid */}
      <PricingClient
        currentTier={currentTier}
        isSignedIn={!!user}
        isVerifiedStudent={isVerifiedStudent}
      />

      {/* Overage explainer */}
      <section className="relative px-6 pb-20 sm:px-10">
        <div className="mx-auto max-w-[840px]">
          <div className="rounded-2xl border border-ink-border bg-ink-surface p-8 sm:p-10">
            <span className="font-mono text-[10px] font-medium tracking-label text-accent">
              WHEN YOU NEED MORE
            </span>
            <h3 className="mt-2 font-display text-[22px] font-semibold text-text-primary">
              Overage sessions
            </h3>
            <p className="mt-2 max-w-2xl font-sans text-[14px] leading-relaxed text-text-secondary">
              Hit your included-session limit before your cycle ends? Pay per session to keep going:
              $8 each on Cycle and Pro, $6 each on Max. No forced upgrade, no subscription surprises.
              You decide when to push on with another interview.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative px-6 pb-24 sm:px-10">
        <div className="mx-auto max-w-[720px]">
          <h2 className="text-center font-display text-[32px] font-semibold tracking-heading text-text-primary">
            Common questions
          </h2>
          <div className="mt-12 space-y-8">
            <Faq
              q="Why cycles instead of monthly billing?"
              a="Recruiting prep is seasonal. Most students work hard in late summer through fall for full-time offers, then again in spring for internships. A monthly subscription means you either pay through dead months or churn and re-subscribe — both feel bad. Cycles match real usage."
            />
            <Faq
              q="What's included in the 15-day trial?"
              a="Full access to whatever tier you picked, for 15 days, no charge. If you don't cancel before day 15, the card on file is charged and your cycle starts. You can cancel in one click from Settings."
            />
            <Faq
              q="How do I verify as a student?"
              a="Through SheerID during checkout. Takes about a minute for most schools. The Cycle tier is priced at near-cost — SheerID protects it from being used by non-students, which keeps it sustainable."
            />
            <Faq
              q="What happens when my cycle ends?"
              a="By default, your plan auto-renews and your session counter resets. You get a reminder email 10 days out. If you'd rather not renew, toggle auto-renew off in Settings — you keep full access until the cycle actually ends."
            />
            <Faq
              q="What's the difference between Pro and Max?"
              a="Max adds panel interviews (two or three interviewers at once), superday mode (a simulated full superday running multiple formats in sequence), true hard mode (the adversarial finals-round experience), and priority feedback (your feedback generates faster after each session)."
            />
            <Faq
              q="What if I need more than 8 or 24 sessions?"
              a="Pay $8 per extra session ($6 on Max). No upgrade prompt, no upsell pressure — we designed the included counts to cover a normal recruiting cycle with room to spare, and the overage option is there for the rare week when you have five interviews back-to-back."
            />
          </div>
        </div>
      </section>

      {/* Footer signature */}
      <footer className="relative border-t border-ink-border/40 px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <p className="font-serif text-[15px] italic text-accent">Built to get you hired.</p>
          <p className="font-display text-[14px] font-medium text-accent">folio.io</p>
        </div>
      </footer>
    </main>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="font-display text-[16px] font-semibold text-text-primary">{q}</h3>
      <p className="mt-2 font-sans text-[14px] leading-relaxed text-text-secondary">{a}</p>
    </div>
  );
}
