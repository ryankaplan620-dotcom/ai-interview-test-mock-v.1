import { ScrollReveal } from "./ScrollReveal";
import { Container, Eyebrow, ArrowLink, CheckIcon } from "@/components/marketing/ui";

interface Band {
  eyebrow: string;
  heading: string;
  accentWord: string;
  body: string;
  features: string[];
  tone: "white" | "tint";
  number: string;
  icon: React.ReactNode;
}

function SimulateIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" className="text-brand-700" aria-hidden>
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 8v6l4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrainIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" className="text-brand-700" aria-hidden>
      <path d="M6 22L12 8l4 8 3-4 3 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OutreachIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" className="text-brand-700" aria-hidden>
      <rect x="4" y="8" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 10l10 6 10-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const bands: Band[] = [
  {
    eyebrow: "01 · Simulate",
    heading: "Interviews that adapt.",
    accentWord: "adapt.",
    body: "Every session is shaped by who you are, what you’ve said before, and where you’re interviewing. No two runs are the same.",
    features: [
      "Five distinct personas",
      "Company-specific calibration",
      "Cross-session memory",
      "Adaptive follow-ups",
    ],
    tone: "white",
    number: "01",
    icon: <SimulateIcon />,
  },
  {
    eyebrow: "02 · Train",
    heading: "Your exact words, stronger.",
    accentWord: "stronger.",
    body: "Folio doesn’t just score you. It pulls your weakest sentences, shows you a better version, and tracks your growth over time.",
    features: [
      "Quote-based feedback",
      "Six training dimensions",
      "Daily communication drills",
      "Before / after trajectory",
    ],
    tone: "tint",
    number: "02",
    icon: <TrainIcon />,
  },
  {
    eyebrow: "03 · Outreach",
    heading: "Doors, opened.",
    accentWord: "opened.",
    body: "Folio identifies the right people, writes in your voice, and never sends without your approval. Networking on autopilot, with a human in the loop.",
    features: [
      "Contact scouting",
      "Voice-matched drafts",
      "Human-in-the-loop review",
      "Relationship tracking",
    ],
    tone: "white",
    number: "03",
    icon: <OutreachIcon />,
  },
];

export function Engines() {
  return (
    <section id="product" aria-label="Product engines">
      {bands.map((band, idx) => {
        const mirrored = idx % 2 === 1;
        return (
          <div key={band.eyebrow} className={band.tone === "tint" ? "bg-gray-50" : "bg-white"}>
            <Container className="py-20 lg:py-24">
              <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-16">
                {/* Text side */}
                <ScrollReveal className={mirrored ? "md:order-2" : ""}>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute -left-1 -top-12 select-none font-display text-[120px] font-bold leading-none text-gray-900/[0.04]"
                      aria-hidden
                    >
                      {band.number}
                    </span>
                    <div className="relative">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-100">
                          {band.icon}
                        </span>
                        <Eyebrow>{band.eyebrow}</Eyebrow>
                      </div>

                      <h3 className="mt-5 text-balance font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-gray-900 sm:text-[38px]">
                        {band.heading.split(band.accentWord)[0]}
                        <span className="text-brand-600">{band.accentWord}</span>
                      </h3>

                      <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-gray-600">
                        {band.body}
                      </p>

                      <ArrowLink href="/signup" className="mt-7">
                        Learn more
                      </ArrowLink>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Features side */}
                <ScrollReveal delay={150} className={mirrored ? "md:order-1" : ""}>
                  <div className="rounded-2xl border border-gray-200/70 bg-white p-7 shadow-card sm:p-8">
                    <ul className="grid gap-px overflow-hidden">
                      {band.features.map((feat, i) => (
                        <li
                          key={feat}
                          className={`flex items-center gap-3 py-3.5 ${
                            i !== band.features.length - 1 ? "border-b border-gray-100" : ""
                          }`}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                            <CheckIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-[15px] font-medium text-gray-800">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              </div>
            </Container>
          </div>
        );
      })}
    </section>
  );
}
