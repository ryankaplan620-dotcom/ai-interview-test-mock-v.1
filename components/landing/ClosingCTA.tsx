import { ScrollReveal } from "./ScrollReveal";
import { Container, Button } from "@/components/marketing/ui";

export function ClosingCTA() {
  return (
    <section
      className="bg-gradient-dark relative overflow-hidden"
      aria-label="Final call to action"
    >
      <Container className="relative py-32 text-center sm:py-44">
        <ScrollReveal>
          <h2
            className="text-balance font-display font-extrabold leading-[1.02] tracking-[-0.04em] text-white"
            style={{ fontSize: "clamp(44px, 7vw, 88px)" }}
          >
            Show up
            <br />
            <span className="text-gradient-mint">unmistakable.</span>
          </h2>

          <p className="mx-auto mt-7 max-w-[440px] text-[17px] leading-relaxed text-text-secondary">
            Under 90 seconds to your first PrepSpace Score. No credit card required.
          </p>

          <div className="mt-12 flex justify-center">
            <Button href="/signup" size="lg" withArrow>
              Start free
            </Button>
          </div>

          <p className="mt-12 font-serif text-[19px] italic text-text-tertiary">
            Built to get you hired.
          </p>
        </ScrollReveal>
      </Container>
    </section>
  );
}
