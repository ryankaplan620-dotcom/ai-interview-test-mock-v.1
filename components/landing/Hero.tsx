import Link from "next/link";

export function Hero() {
  return (
    <section className="relative px-6 pb-8 pt-12 sm:px-12 sm:pt-16 lg:px-20 lg:pt-20" aria-label="Hero">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-12 lg:grid-cols-[1fr_520px] lg:gap-8">
          {/* Left column — copy */}
          <div className="flex flex-col">
            {/* Eyebrow */}
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              <span className="font-mono text-[11px] font-medium tracking-label text-accent">
                PRACTICE INTERVIEWS · NO SIGNUP
              </span>
            </div>

            {/* Primary tagline — locked copy */}
            <div className="relative">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 bg-accent/5 blur-3xl"
                aria-hidden
              />
              <h1 className="relative z-10 mt-16 font-display text-[40px] font-semibold leading-[1.02] tracking-display text-text-primary sm:text-[56px] lg:text-[64px]">
                The interview{" "}
                <span className="block">
                  <em className="font-serif font-normal not-italic italic tracking-heading text-accent">
                    before
                  </em>
                </span>
                <span className="block">the interview.</span>
              </h1>
            </div>

            {/* Description — single tight line, grounded in product */}
            <p className="mt-14 max-w-[560px] font-sans text-[18px] leading-[1.55] tracking-body text-text-secondary sm:text-[20px]">
              Live video interview practice, indistinguishable from the real thing.
            </p>

            {/* CTAs */}
            <div className="mt-14 flex flex-wrap items-center gap-6">
              <Link
                href="#waitlist"
                className="btn-shimmer inline-flex h-[52px] items-center rounded-full bg-cta-gradient px-8 font-sans text-[15px] font-semibold tracking-body text-text-onAccent transition-all duration-200 ease-brand hover:shadow-accent-glow-lg"
              >
                Practice now →
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center font-sans text-[15px] font-medium tracking-body text-text-primary transition-colors hover:text-accent"
              >
                See how it works &nbsp;→
              </Link>
            </div>

            {/* Proof row — typographic wordmarks */}
            <div className="mt-24">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-text-tertiary">
                Join students from
              </span>
              <div className="mt-2 h-px w-full max-w-[720px] bg-ink-border/50" />

              {/* Wordmark row — each school in distinct typeface */}
              <div className="mt-8 flex flex-wrap items-baseline gap-x-10 gap-y-6 text-text-secondary">
                <span className="font-[var(--font-cinzel)] text-[22px] font-bold tracking-[0.08em]">
                  HARVARD
                </span>
                <span className="font-[var(--font-playfair)] text-[26px] font-semibold tracking-[-0.01em]">
                  Stanford
                </span>
                <span className="font-[var(--font-spectral)] text-[24px] font-medium tracking-[0.01em]">
                  Wharton
                </span>
                <span className="font-display text-[25px] font-bold tracking-[-0.03em]">MIT</span>
                <span className="font-[var(--font-crimson)] text-[25px] italic tracking-[-0.005em]">
                  Booth
                </span>
                <span className="font-[var(--font-playfair)] text-[26px] font-medium tracking-[-0.005em]">
                  Yale
                </span>
                <span className="font-sans text-[13px] font-medium text-text-tertiary">+47 more</span>
              </div>
            </div>
          </div>

          {/* Right column — demo card */}
          <div className="lg:justify-self-end">
            <DemoCard />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Live interview simulation preview.
 * Renders the Zoom-style video frame with real Luke portrait.
 */
function DemoCard() {
  return (
    <div className="relative w-full max-w-[508px] overflow-hidden">
      {/* Ambient halo behind card */}
      <div
        className="absolute -inset-3 rounded-3xl bg-accent/10 blur-2xl"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink-surface shadow-2xl">
        {/* Video frame */}
        <div className="relative aspect-[508/280] w-full overflow-hidden">
          <img
            src="/images/luke.jpg"
            alt="Luke Anderson, Senior Recruiter"
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/35"
            aria-hidden
          />

          {/* Top chrome gradient (for readability) */}
          <div
            className="absolute top-0 h-20 w-full bg-gradient-to-b from-ink-deeper/85 to-transparent"
            aria-hidden
          />

          {/* Bottom chrome gradient */}
          <div
            className="absolute bottom-0 h-16 w-full bg-gradient-to-t from-ink-deeper/75 to-transparent"
            aria-hidden
          />

          {/* Subtle green border overlay */}
          <div
            className="absolute inset-0 rounded-2xl border border-accent/15"
            aria-hidden
          />

          {/* TOP CHROME */}
          <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2.5">
              {/* Live pulse */}
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <div className="absolute inset-0 h-2 w-2 animate-pulse-ring rounded-full border border-accent" />
              </div>
              <span className="font-mono text-[10px] font-semibold tracking-label text-accent">LIVE</span>
            </div>

            <div className="text-right">
              <div className="font-mono text-[11px] tracking-[0.05em] text-text-primary">
                SESSION · 0:47 / 60
              </div>
              <div className="font-mono text-[9px] tracking-[0.12em] text-text-secondary">
                MCKINSEY · BEHAVIORAL
              </div>
            </div>
          </div>

          {/* BOTTOM CHROME — name + waveform */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-6 py-4">
            <div>
              <div className="font-sans text-[15px] font-semibold tracking-[-0.015em] text-text-primary">
                Luke Anderson
              </div>
              <div className="font-sans text-[11px] tracking-body text-text-secondary">
                Senior Recruiter · McKinsey &amp; Company
              </div>
            </div>

            {/* Waveform */}
            <Waveform />
          </div>
        </div>

        {/* Transcript strip */}
        <div className="bg-ink-raised px-6 py-4">
          <div className="font-mono text-[9px] font-medium tracking-label text-text-tertiary">
            LUKE · 0:42
          </div>
          <p className="mt-1 font-serif text-[14px] italic tracking-body text-text-primary">
            &ldquo;Tell me about a time you led through pressure.&rdquo;
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 bg-ink-raised pb-5">
          {/* Mic active */}
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-accent transition-opacity hover:opacity-90"
            aria-label="Mute microphone"
          >
            <MicIcon className="h-3.5 w-3.5 text-ink" />
          </button>

          {/* Camera */}
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-ink-border bg-ink-raised transition-colors hover:border-text-tertiary"
            aria-label="Toggle camera"
          >
            <CameraIcon className="h-3 w-3 text-text-tertiary" />
          </button>

          {/* End call */}
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 transition-opacity hover:opacity-90"
            aria-label="End session"
          >
            <div className="h-0.5 w-2.5 rounded bg-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Animated audio waveform indicator */
function Waveform() {
  // Heights defined as rems for consistency
  const bars = [4, 10, 16, 12, 6, 14, 8, 4, 12, 6, 16, 10, 4, 12, 8, 14, 4, 10, 16, 6];

  return (
    <div className="flex items-center gap-[2px]" aria-hidden>
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-0.5 rounded-full bg-accent opacity-85"
          style={{
            height: `${h}px`,
            animation: `waveform 0.8s ease-in-out ${i * 50}ms infinite`,
          }}
        />
      ))}
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden>
      <rect x="7" y="3" width="6" height="10" rx="3" />
      <path
        d="M5 10a5 5 0 0 0 10 0M10 15v2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden>
      <rect x="3" y="6" width="11" height="8" rx="1" />
      <polygon points="14,8 17,6 17,14 14,12" />
    </svg>
  );
}
