import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";
import { TIERS, formatPrice, annualSavingsPercent } from "@/lib/tiers";
import { PricingClient } from "./pricing-client";
import { getUser, getUserTier } from "@/lib/auth/server";

export const metadata = {
  title: "Pricing",
  description: "Folio pricing — Student $5.99, General $9.99, Pro $19.99, Max $30.",
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
            Four tiers.
            <br />
            <em className="font-serif font-normal italic text-accent">One product.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] font-sans text-[17px] leading-relaxed text-text-secondary">
            Practice as much as you want, on every tier. Upgrade for firm calibration, panel simulation, and the
            harder modes that prepare you for the interviews that actually matter.
          </p>
          <p className="mt-4 font-sans text-[14px] text-text-tertiary">
            15-day free trial on every paid tier. No credit card required.
          </p>
        </div>
      </section>

      {/* Tier grid */}
      <PricingClient
        currentTier={currentTier}
        isSignedIn={!!user}
        isVerifiedStudent={isVerifiedStudent}
      />

      {/* Coach review add-on */}
      <section className="relative px-6 pb-20 sm:px-10">
        <div className="mx-auto max-w-[840px]">
          <div className="rounded-2xl border border-ink-border bg-ink-surface p-8 sm:p-10">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-mono text-[10px] font-medium tracking-label text-accent">
                  ADD-ON · $49 ONE-TIME
                </span>
                <h3 className="mt-2 font-display text-[22px] font-semibold text-text-primary">
                  Human coach review
                </h3>
                <p className="mt-2 max-w-md font-sans text-[14px] leading-relaxed text-text-secondary">
                  Send any completed session to a human coach. Get a detailed written review back within 48 hours.
                  Available to users on any tier, no subscription required.
                </p>
              </div>
              <div className="shrink-0">
                <span className="font-display text-[36px] font-semibold text-text-primary">$49</span>
              </div>
            </div>
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
              q="What's included in the 15-day trial?"
              a="Full General-tier access. Unlimited practice sessions with all five recruiter personas, quote-based feedback, session recording. No credit card required to start."
            />
            <Faq
              q="How does the Student tier work?"
              a="Verify your student status through SheerID or sign up with a .edu email, and you get the same features as General at half the price. Verification renews annually."
            />
            <Faq
              q="Can I switch tiers?"
              a="Yes. Upgrade or downgrade any time from your account settings. Upgrades prorate immediately; downgrades take effect at the end of your current billing period."
            />
            <Faq
              q="What's True Hard Mode?"
              a="The Max-tier simulation of real elite-firm adversarial behavior — long silences, interruptions, distorted repeats. It's what actual Goldman and McKinsey finals do. A user who survives it in Folio is prepared for the real one."
            />
            <Faq
              q="How do I cancel?"
              a="One click in your account settings, and you can keep using Folio through the end of your billing period. Annual plans are prorated on refund."
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

// Note: annualSavingsPercent is imported for use in the client component
void annualSavingsPercent;
void formatPrice;
void TIERS;
