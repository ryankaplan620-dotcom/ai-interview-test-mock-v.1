export const dynamic = "force-dynamic";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Section, Eyebrow, SectionHeading, Lede } from "@/components/marketing/ui";
import { PricingClient } from "./pricing-client";
import { getUser, getUserTier } from "@/lib/auth/server";

export const metadata = {
  title: "Pricing",
  description:
    "Folio pricing — Basic $49 (90 days, students only), Pro $149 (full year), Max $249 (full year, unlimited sessions, panels and superday).",
};

export default async function PricingPage() {
  const user = await getUser();
  const tier = user ? await getUserTier() : null;
  const currentTier = tier?.effective_tier ?? null;
  const isVerifiedStudent = tier?.is_verified_student ?? false;

  return (
    <main className="min-h-screen bg-canvas">
      <Nav />

      {/* Hero */}
      <Section tone="white" className="pt-20 pb-10 sm:pt-28 sm:pb-12 lg:pt-32">
        <div className="mx-auto max-w-[840px] text-center">
          <Eyebrow>Pricing</Eyebrow>
          <SectionHeading as="h1" className="mt-5">
            Built for the cycle.{" "}
            <span className="font-serif font-normal italic text-brand-600">Not the month.</span>
          </SectionHeading>
          <Lede className="mx-auto mt-6 max-w-[600px]">
            Recruiting happens in quarters, not billing cycles. Pay once for a full prep season
            with a generous session allowance, unlimited drill practice, and every persona from
            day one.
          </Lede>
          <p className="mt-4 text-[14px] text-gray-400">
            15-day free trial on your first purchase. Cancel anytime before renewal.
          </p>
        </div>
      </Section>

      {/* Tier grid */}
      <PricingClient
        currentTier={currentTier}
        isSignedIn={!!user}
        isVerifiedStudent={isVerifiedStudent}
      />

      {/* Overage explainer */}
      <section className="px-6 pb-16 sm:px-8">
        <div className="mx-auto max-w-[860px]">
          <div className="rounded-2xl border border-gray-200/70 bg-gray-50 p-8 shadow-card sm:p-10">
            <Eyebrow>When you need more</Eyebrow>
            <h3 className="mt-3 text-[22px] font-semibold text-gray-900">Overage sessions</h3>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-600">
              Hit your included-session limit before your cycle ends? Pay per session to keep
              going: $20 each on Basic and Pro, $15 each on Max. No forced upgrade, no subscription
              surprises. You decide when to push on with another interview.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <Section tone="white" className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[760px]">
          <h2 className="text-center font-display text-[30px] font-semibold tracking-[-0.03em] text-gray-900">
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
              a="Through SheerID during checkout. Takes about a minute for most schools. The Basic tier is priced at near-cost — SheerID protects it from being used by non-students, which keeps it sustainable."
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
              q="What if I need more than my included sessions?"
              a="Pay $20 per extra session on Basic or Pro ($15 on Max). No upgrade prompt, no upsell pressure — we designed the included counts to cover a normal recruiting cycle with room to spare, and the overage option is there for the rare week when you have five interviews back-to-back. Max includes unlimited sessions, so overage only applies to Basic and Pro."
            />
          </div>
        </div>
      </Section>

      <Footer />
    </main>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <h3 className="text-[16px] font-semibold text-gray-900">{q}</h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-gray-600">{a}</p>
    </div>
  );
}
