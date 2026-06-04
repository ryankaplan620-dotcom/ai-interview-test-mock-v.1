import { ScrollReveal } from "./ScrollReveal";
import { Container, Button } from "@/components/marketing/ui";

export function ClosingCTA() {
  return (
    <section className="relative overflow-hidden bg-ink" aria-label="Final call to action">
      {/* Brand glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40rem 24rem at 50% 0%, rgba(0,220,130,0.16), transparent 60%), radial-gradient(36rem 24rem at 85% 100%, rgba(0,220,130,0.08), transparent 60%)",
        }}
        aria-hidden
      />
      {/* Faint grid */}
      <div
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
        aria-hidden
      />

      <Container className="relative py-28 text-center sm:py-36">
        <ScrollReveal>
          <h2
            className="text-balance font-display font-semibold leading-[1.02] tracking-[-0.04em] text-white"
            style={{ fontSize: "clamp(44px, 7vw, 88px)" }}
          >
            Show up
            <br />
            <span className="text-brand-400">unmistakable.</span>
          </h2>

          <p className="mx-auto mt-7 max-w-[440px] text-[17px] leading-relaxed text-gray-400">
            Under 90 seconds to your first Folio Score. No credit card required.
          </p>

          <div className="mt-10 flex justify-center">
            <Button href="/signup" size="lg" withArrow>
              Start free
            </Button>
          </div>

          <p className="mt-10 font-serif text-[19px] italic text-gray-500">Built to get you hired.</p>
        </ScrollReveal>
      </Container>
    </section>
  );
}
