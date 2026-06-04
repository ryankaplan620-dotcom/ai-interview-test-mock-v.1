import Link from "next/link";
import { Container, ArrowRight } from "@/components/marketing/ui";

const avatars = [
  "from-emerald-400 to-emerald-600",
  "from-sky-400 to-blue-600",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-600",
];

export function Hero() {
  return (
    <section
      className="relative isolate -mt-16 flex min-h-screen flex-col overflow-hidden bg-ink"
      aria-label="Hero"
    >
      {/* ---- Cinematic backdrop ---- */}
      {/* Near-black base with emerald radials */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-dark" aria-hidden />
      {/* Drifting emerald aurora behind the headline */}
      <div
        className="pointer-events-none absolute left-1/2 top-[34%] -z-10 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[160px] animate-float motion-reduce:animate-none"
        aria-hidden
      />
      {/* Faint blueprint grid, radially masked toward the center */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-dark [mask-image:radial-gradient(ellipse_at_50%_35%,black,transparent_72%)]"
        aria-hidden
      />
      {/* Filmic grain */}
      <div className="noise-overlay pointer-events-none absolute inset-0 -z-10" aria-hidden />
      {/* Bottom seam: ease the dark hero into the light sections below */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-canvas"
        aria-hidden
      />

      <Container className="relative flex flex-1 flex-col items-center justify-center pb-24 pt-28 text-center sm:pb-28">
        {/* Live voice pill */}
        <span
          className="inline-flex animate-fade-up items-center gap-2.5 rounded-full border border-ink-border/70 bg-ink-surface/60 py-1.5 pl-3 pr-4 text-[12.5px] font-medium text-text-secondary opacity-0 backdrop-blur motion-reduce:opacity-100"
          style={{ animationDelay: "0ms" }}
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Voice-first interview practice
        </span>

        {/* Headline — oversized, cinematic */}
        <h1
          className="mt-7 max-w-[15ch] animate-fade-up text-balance font-display font-semibold leading-[0.98] tracking-[-0.045em] text-text-primary opacity-0 motion-reduce:opacity-100"
          style={{ fontSize: "clamp(46px, 8vw, 104px)", animationDelay: "80ms" }}
        >
          Practice interviews that feel{" "}
          <em className="font-serif font-normal italic text-accent">real</em>. Get hired.
        </h1>

        {/* Sub-copy */}
        <p
          className="mt-7 max-w-[600px] animate-fade-up text-[17px] leading-[1.6] text-text-secondary opacity-0 motion-reduce:opacity-100 sm:text-[18px]"
          style={{ animationDelay: "160ms" }}
        >
          Folio runs live voice interviews with distinct personas calibrated to your target
          role. Get scored feedback, track your improvement, and walk in unmistakable.
        </p>

        {/* CTAs */}
        <div
          className="mt-10 flex animate-fade-up flex-wrap items-center justify-center gap-x-5 gap-y-4 opacity-0 motion-reduce:opacity-100"
          style={{ animationDelay: "240ms" }}
        >
          <Link
            href="/signup"
            className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-brand px-7 text-[16px] font-semibold text-brand-ink shadow-accent-glow-lg transition-all duration-200 ease-out hover:-translate-y-px hover:bg-accent-highlight"
          >
            Start free
            <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/how-it-works"
            className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
          >
            See how it works
            <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Social proof */}
        <div
          className="mt-12 flex animate-fade-up items-center gap-3.5 opacity-0 motion-reduce:opacity-100"
          style={{ animationDelay: "320ms" }}
        >
          <div className="flex -space-x-2.5">
            {avatars.map((g, i) => (
              <span
                key={i}
                className={`h-8 w-8 rounded-full bg-gradient-to-br ${g} ring-2 ring-ink`}
                aria-hidden
              />
            ))}
          </div>
          <p className="text-[14px] text-text-tertiary">
            Join <span className="font-semibold text-text-primary">2,000+</span> professionals
            practicing with Folio
          </p>
        </div>
      </Container>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center">
        <span className="animate-float text-text-tertiary motion-reduce:animate-none" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
    </section>
  );
}
