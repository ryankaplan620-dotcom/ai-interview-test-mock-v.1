import { ScrollReveal } from "./ScrollReveal";

const personas = [
  {
    name: "Priya Patel",
    role: "SENIOR RECRUITER",
    tone: "Warm. Curious. Puts you at ease, then tests whether your answers hold up.",
    image: "/images/priya.jpg",
    initial: "P",
    gradient: "from-emerald-400 to-emerald-600",
  },
  {
    name: "Marcus Hale",
    role: "HIRING MANAGER",
    tone: "Direct. Evidence-first. If you can\u2019t back it up, he\u2019ll know.",
    image: null,
    initial: "M",
    gradient: "from-gray-600 to-gray-800",
  },
  {
    name: "Sarah Chen",
    role: "ENGINEERING MANAGER",
    tone: "Technical but human. Probes your depth without making you feel tested.",
    image: null,
    initial: "S",
    gradient: "from-blue-500 to-blue-700",
  },
];

export function Interviewers() {
  return (
    <section
      id="interviewers"
      className="bg-gray-50 px-6 py-24 sm:px-8 md:py-32"
      aria-label="The interviewers"
    >
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal>
          <span className="font-mono text-[13px] font-medium tracking-[0.1em] uppercase text-[#00DC82]">
            THE INTERVIEWERS
          </span>

          <h2 className="mt-4 text-[36px] font-bold tracking-[-0.03em] text-gray-900 sm:text-[44px]">
            Three personalities. One for every moment.
          </h2>

          <p className="mt-4 max-w-[520px] text-[16px] text-gray-500">
            Each interviewer brings a different energy, a different style of pressure.
            Practice with all three to build range.
          </p>
        </ScrollReveal>

        {/* Card grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {personas.map((persona, i) => (
            <ScrollReveal key={persona.name} delay={i * 100}>
              <div className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                {/* Portrait area — taller aspect ratio with gradient overlay */}
                <div className="relative aspect-[4/5] overflow-hidden">
                  {persona.image ? (
                    <img
                      src={persona.image}
                      alt={persona.name}
                      className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${persona.gradient} group-hover:scale-[1.02] transition-transform duration-300`}
                    >
                      <span className="text-[100px] font-bold text-white/20">
                        {persona.initial}
                      </span>
                    </div>
                  )}
                  {/* Bottom gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" aria-hidden />
                </div>

                {/* Info */}
                <div className="p-5">
                  <p className="text-[20px] font-bold text-gray-900">
                    {persona.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.15em] text-gray-400">
                    {persona.role}
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-gray-500">
                    {persona.tone}
                  </p>

                  {/* CTA link */}
                  <a
                    href="/signup"
                    className="mt-4 inline-flex items-center text-[14px] font-medium text-[#00DC82] transition-opacity hover:opacity-80"
                  >
                    Start session
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="ml-1" aria-hidden>
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
