import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { Engines } from "@/components/landing/Engines";
import { FolioScore } from "@/components/landing/FolioScore";
import { QuoteDemo } from "@/components/landing/QuoteDemo";
import { CompanyPreview } from "@/components/landing/CompanyPreview";
import { Interviewers } from "@/components/landing/Interviewers";
import { Stats } from "@/components/landing/Stats";
import { PricingPreview } from "@/components/landing/PricingPreview";
import { FAQ } from "@/components/landing/FAQ";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { Footer } from "@/components/landing/Footer";

function SectionDivider() {
  return (
    <div className="mx-auto h-px max-w-[1200px] bg-gradient-to-r from-transparent via-ink-border/40 to-transparent" />
  );
}

function SectionDots() {
  return (
    <div className="flex items-center justify-center gap-2 py-8" aria-hidden>
      <span className="h-1 w-1 rounded-full bg-ink-border" />
      <span className="h-1 w-1 rounded-full bg-accent/40" />
      <span className="h-1 w-1 rounded-full bg-ink-border" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <main id="main-content" className="relative min-h-screen bg-ink text-text-primary">
      {/* Subtle ambient glow — no grid */}
      <div className="pointer-events-none fixed inset-0 bg-depth-glow opacity-50" aria-hidden />

      {/* Content layers */}
      <div className="relative">
        <Nav />
        <Hero />
        <SectionDivider />
        <HowItWorks />
        <ProductDemo />
        <SectionDots />
        <Engines />
        <SectionDivider />
        <FolioScore />
        <QuoteDemo />
        <SectionDots />
        <CompanyPreview />
        <SectionDivider />
        <Interviewers />
        <SectionDots />
        <Stats />
        <SectionDivider />
        <PricingPreview />
        <FAQ />
        <ClosingCTA />
        <Footer />
      </div>
    </main>
  );
}
