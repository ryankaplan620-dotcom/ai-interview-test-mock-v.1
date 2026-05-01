import { ScrollReveal } from "./ScrollReveal";

interface Band {
  eyebrow: string;
  heading: string;
  accentWord: string;
  body: string;
  features: string[];
  mirrored?: boolean;
  bg: string;
  number: string;
  icon: React.ReactNode;
}

function SimulateIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-[#00DC82]">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 8v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrainIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-[#00DC82]">
      <path d="M6 22L12 8l4 8 3-4 3 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OutreachIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-[#00DC82]">
      <rect x="4" y="8" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 10l10 6 10-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
    bg: "bg-white",
    number: "01",
    icon: <SimulateIcon />,
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
    bg: "bg-gray-50",
    number: "02",
    icon: <TrainIcon />,
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
    bg: "bg-white",
    number: "03",
    icon: <OutreachIcon />,
  },
];

function FeatureCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
      <path d="M3 8.5L6.5 12L13 4" stroke="#00DC82" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Engines() {
  return (
    <section id="product" aria-label="Product engines">
      {bands.map((band) => (
        <div key={band.eyebrow} className={`${band.bg} px-6 py-20 sm:px-8 lg:py-24`}>
          <div className="mx-auto max-w-[1200px]">
            <div
              className={`grid items-center gap-12 md:grid-cols-2 ${
                band.mirrored ? "md:[direction:rtl]" : ""
              }`}
            >
              {/* Text side */}
              <ScrollReveal className={band.mirrored ? "md:[direction:ltr]" : ""}>
                <div className="relative">
                  {/* Large light number badge behind heading */}
                  <span className="absolute -top-8 -left-2 text-[96px] font-bold leading-none text-gray-100 select-none pointer-events-none" aria-hidden>
                    {band.number}
                  </span>

                  <div className="relative">
                    {/* Icon + eyebrow */}
                    <div className="flex items-center gap-3">
                      {band.icon}
                      <span className="font-mono text-[13px] tracking-[0.1em] text-[#00DC82]">
                        {band.eyebrow}
                      </span>
                    </div>

                    <h3 className="mt-4 text-[32px] font-bold tracking-[-0.03em] text-gray-900 sm:text-[40px]">
                      {band.heading.split(band.accentWord).map((part, j) => (
                        <span key={j}>
                          {part}
                          {j === 0 && (
                            <span className="text-[#00DC82]">{band.accentWord}</span>
                          )}
                        </span>
                      ))}
                    </h3>

                    <p className="mt-4 max-w-[500px] text-[15px] leading-relaxed text-gray-500">
                      {band.body}
                    </p>

                    <a
                      href="/signup"
                      className="mt-6 inline-flex items-center text-[15px] font-medium text-[#00DC82] transition-opacity hover:opacity-80"
                    >
                      Learn more
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-1" aria-hidden>
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                </div>
              </ScrollReveal>

              {/* Features side */}
              <ScrollReveal delay={200} className={band.mirrored ? "md:[direction:ltr]" : ""}>
                <ul className="space-y-5">
                  {band.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <FeatureCheck />
                      <span className="text-[15px] text-gray-900">{feat}</span>
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
