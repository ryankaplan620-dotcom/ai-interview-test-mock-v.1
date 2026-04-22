import { ScrollReveal } from "./ScrollReveal";

interface Band {
  eyebrow: string;
  heading: string;
  accentWord: string;
  body: string;
  features: string[];
  mirrored?: boolean;
}

const bands: Band[] = [
  {
    eyebrow: "01 \u00B7 SIMULATE",
    heading: "Interviews that adapt.",
    accentWord: "adapt.",
    body: "Every session is shaped by who you are, what you\u2019ve said before, and where you\u2019re interviewing. No two runs are the same.",
    features: [
      "Five distinct personas",
      "Company-specific calibration",
      "Cross-session memory",
      "Adaptive follow-ups",
    ],
  },
  {
    eyebrow: "02 \u00B7 TRAIN",
    heading: "Your exact words, stronger.",
    accentWord: "stronger.",
    body: "Folio doesn\u2019t just score you. It pulls your weakest sentences, shows you a better version, and tracks your growth over time.",
    features: [
      "Quote-based feedback",
      "Six training dimensions",
      "Daily communication drills",
      "Before/after trajectory",
    ],
    mirrored: true,
  },
  {
    eyebrow: "03 \u00B7 OUTREACH",
    heading: "Doors, opened.",
    accentWord: "opened.",
    body: "Folio identifies the right people, writes in your voice, and never sends without your approval. Networking on autopilot, with a human in the loop.",
    features: [
      "Contact scouting",
      "Voice-matched drafts",
      "Human-in-the-loop review",
      "Relationship tracking",
    ],
  },
];

export function Engines() {
  return (
    <section id="product" aria-label="Product engines">
      {bands.map((band, i) => (
        <div key={band.eyebrow} className="border-t border-ink-border/40 px-6 py-20 sm:px-12 lg:px-20">
          <div className="mx-auto max-w-[1440px]">
            <div
              className={`grid items-center gap-12 md:grid-cols-[1fr_1fr] ${
                band.mirrored ? "md:[direction:rtl]" : ""
              }`}
            >
              {/* Text side */}
              <ScrollReveal className={band.mirrored ? "md:[direction:ltr]" : ""}>
                <span className="font-mono text-[11px] tracking-label text-accent">
                  {band.eyebrow}
                </span>

                <h3 className="mt-4 font-display text-[32px] font-semibold tracking-heading text-text-primary sm:text-[40px]">
                  {band.heading.split(band.accentWord).map((part, j) => (
                    <span key={j}>
                      {part}
                      {j === 0 && (
                        <span className="text-accent">{band.accentWord}</span>
                      )}
                    </span>
                  ))}
                </h3>

                <p className="mt-4 max-w-[500px] font-sans text-[15px] leading-relaxed text-text-secondary">
                  {band.body}
                </p>

                <a
                  href="/signup"
                  className="mt-6 inline-flex items-center font-sans text-[15px] font-medium text-accent transition-opacity hover:opacity-80"
                >
                  Learn more &rarr;
                </a>
              </ScrollReveal>

              {/* Features side */}
              <ScrollReveal delay={200} className={band.mirrored ? "md:[direction:ltr]" : ""}>
                <ul className="space-y-5">
                  {band.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-3">
                      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                      <span className="font-sans text-[15px] text-text-primary">{feat}</span>
                    </li>
                  ))}
                </ul>
              </ScrollReveal>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
