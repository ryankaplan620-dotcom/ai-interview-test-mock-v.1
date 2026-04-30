import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { LogoBar } from "@/components/landing/LogoBar";
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

export default function LandingPage() {
  return (
    <main id="main-content" className="relative min-h-screen bg-white">
      {/* Subtle grid pattern */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="h-full w-full" style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />
      </div>
      <Nav />
      <Hero />
      <LogoBar />
      <HowItWorks />
      <ProductDemo />
      <Engines />
      <FolioScore />
      <QuoteDemo />
      <CompanyPreview />
      <Interviewers />
      <Stats />
      <PricingPreview />
      <FAQ />
      <ClosingCTA />
      <Footer />
    </main>
  );
}
