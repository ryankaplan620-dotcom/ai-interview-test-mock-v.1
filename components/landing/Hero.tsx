import { Container, Lede, Button, ArrowLink } from "@/components/marketing/ui";

const avatars = [
  "from-emerald-400 to-emerald-600",
  "from-sky-400 to-blue-600",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-600",
];

function WaveBars({ className }: { className?: string }) {
  // Lightweight CSS equalizer — the brand's voice-first motif, no 3D.
  const bars = [0.5, 0.85, 0.35, 1, 0.6, 0.9, 0.45];
  return (
    <span className={`flex items-center gap-[3px] ${className ?? ""}`} aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-brand-500 animate-waveform"
          style={{
            height: `${Math.round(h * 18)}px`,
            transformOrigin: "center",
            animationDelay: `${i * 0.12}s`,
            animationDuration: `${0.9 + (i % 3) * 0.15}s`,
          }}
        />
      ))}
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-white" aria-label="Hero">
      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-brand-wash" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-faint [mask-image:radial-gradient(ellipse_at_50%_30%,black,transparent_70%)]"
        aria-hidden
      />

      <Container className="flex min-h-[82vh] flex-col items-center justify-center py-24 text-center sm:py-28">
        {/* Live voice pill */}
        <span className="inline-flex items-center gap-2.5 rounded-full border border-gray-200/80 bg-white/70 py-1.5 pl-3 pr-4 text-[12.5px] font-medium text-gray-600 shadow-card backdrop-blur">
          <WaveBars />
          Voice-first interview practice
        </span>

        {/* Headline */}
        <h1
          className="mt-7 max-w-[900px] text-balance font-display font-semibold leading-[1.02] tracking-[-0.04em] text-gray-900"
          style={{ fontSize: "clamp(44px, 7vw, 84px)" }}
        >
          Practice interviews that feel{" "}
          <em className="font-serif font-normal italic text-brand-600">real</em>. Get hired.
        </h1>

        {/* Sub-copy */}
        <Lede className="mt-6 max-w-[600px]">
          Folio runs live voice interviews with distinct personas calibrated to your target
          role. Get scored feedback, track your improvement, and walk in unmistakable.
        </Lede>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <Button href="/signup" size="lg" withArrow>
            Start free
          </Button>
          <ArrowLink href="/how-it-works">See how it works</ArrowLink>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex items-center gap-3.5">
          <div className="flex -space-x-2.5">
            {avatars.map((g, i) => (
              <span
                key={i}
                className={`h-8 w-8 rounded-full bg-gradient-to-br ${g} ring-2 ring-white`}
                aria-hidden
              />
            ))}
          </div>
          <p className="text-[14px] text-gray-500">
            Join <span className="font-semibold text-gray-900">2,000+</span> professionals
            practicing with Folio
          </p>
        </div>
      </Container>
    </section>
  );
}
