import { ScrollReveal } from "./ScrollReveal";

const personas = [
  {
    name: "Luke Anderson",
    role: "SENIOR RECRUITER",
    tone: "Warm. Curious. Tests baseline when you\u2019re comfortable.",
    image: "/images/luke.jpg",
  },
  {
    name: "Marcus Chen",
    role: "MANAGING DIRECTOR",
    tone: "Neutral. Evidence-first. Silence is a test.",
    gradient: "linear-gradient(135deg, #2A3139, #0D1117)",
    initial: "M",
  },
  {
    name: "Sarah Williams",
    role: "ENGINEERING MANAGER",
    tone: "Clear. Conversational. Probes your technical depth.",
    gradient: "linear-gradient(135deg, #1a2942, #0D1117)",
    initial: "S",
  },
  {
    name: "David Torres",
    role: "PARTNER",
    tone: "Adversarial. Calibrated. Final-round pressure.",
    gradient: "linear-gradient(135deg, #2a1f1f, #0D1117)",
    initial: "D",
  },
  {
    name: "Jennifer Park",
    role: "PRODUCT LEAD",
    tone: "Brisk. Efficient. Conciseness is the message.",
    gradient: "linear-gradient(135deg, #1f2a24, #0D1117)",
    initial: "J",
  },
];

export function Interviewers() {
  return (
    <section
      id="interviewers"
      className="px-6 py-24 sm:px-12 sm:py-32 lg:px-20"
      aria-label="The interviewers"
    >
      <div className="mx-auto max-w-[1440px]">
        <ScrollReveal>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            <span className="font-mono text-[11px] font-medium tracking-label text-accent">
              THE INTERVIEWERS
            </span>
          </div>

          <h2 className="mt-6 font-display text-[36px] font-semibold tracking-heading text-text-primary sm:text-[44px]">
            Five personalities. One for every moment.
          </h2>

          <p className="mt-4 max-w-[520px] font-sans text-[16px] text-text-secondary">
            Each interviewer brings a different energy, a different style of pressure.
            Practice with all five to build range.
          </p>
        </ScrollReveal>

        {/* Card grid */}
        <div className="relative mt-16">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible scrollbar-hide">
            {personas.map((persona, i) => (
              <ScrollReveal key={persona.name} delay={i * 100}>
                <div className="min-w-[220px] snap-start rounded-2xl border border-ink-border bg-ink-surface overflow-hidden transition-all duration-300 ease-out hover:-translate-y-[2px] hover:border-accent/30 hover:shadow-accent-glow">
                  {/* Portrait area */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {persona.image ? (
                      <img
                        src={persona.image}
                        alt={persona.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{ background: persona.gradient }}
                      >
                        <span className="font-display text-[80px] font-bold text-white/15">
                          {persona.initial}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="font-sans text-[15px] font-semibold text-text-primary">
                      {persona.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] tracking-label text-text-tertiary uppercase">
                      {persona.role}
                    </p>
                    <p className="mt-2 font-sans text-[12px] leading-relaxed text-text-secondary">
                      {persona.tone}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Fade gradient for mobile scroll */}
          <div
            className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent pointer-events-none md:hidden"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
