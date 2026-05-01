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
    <main id="main-content" className="relative min-h-screen bg-[#0D1117] text-[#F0F6FC]">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute inset-0" style={{
          background: "radial-gradient(circle at 78% 32%, rgba(0,220,130,0.08) 0%, rgba(0,220,130,0.02) 40%, transparent 80%)",
        }} />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(circle at 15% 85%, rgba(0,220,130,0.04) 0%, transparent 50%)",
        }} />
      </div>

      <div className="relative">
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
      </div>
    </main>
  );
}
