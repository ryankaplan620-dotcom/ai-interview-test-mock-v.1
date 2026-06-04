import { ScrollReveal } from "./ScrollReveal";
import { Section, Eyebrow, SectionHeading, Lede, ArrowLink, Card } from "@/components/marketing/ui";

const personas = [
  {
    name: "Priya Patel",
    role: "Senior Recruiter",
    tone: "Warm. Curious. Puts you at ease, then tests whether your answers hold up.",
    image: "/images/priya.jpg",
    initial: "P",
    gradient: "from-emerald-400 to-emerald-700",
  },
  {
    name: "Marcus Hale",
    role: "Hiring Manager",
    tone: "Direct. Evidence-first. If you can’t back it up, he’ll know.",
    image: null,
    initial: "M",
    gradient: "from-slate-600 to-slate-900",
  },
  {
    name: "Sarah Chen",
    role: "Engineering Manager",
    tone: "Technical but human. Probes your depth without making you feel tested.",
    image: null,
    initial: "S",
    gradient: "from-sky-500 to-blue-800",
  },
];

export function Interviewers() {
  return (
    <Section id="interviewers" tone="tint">
      <ScrollReveal>
        <Eyebrow>The interviewers</Eyebrow>
        <SectionHeading className="mt-4">Three personalities. One for every moment.</SectionHeading>
        <Lede className="mt-5 max-w-[540px]">
          Each interviewer brings a different energy and a different kind of pressure. Practice
          with all three to build range.
        </Lede>
      </ScrollReveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {personas.map((persona, i) => (
          <ScrollReveal key={persona.name} delay={i * 100}>
            <Card interactive className="h-full">
              <div className="relative aspect-[4/5] overflow-hidden">
                {persona.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={persona.image}
                    alt={persona.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${persona.gradient} transition-transform duration-500 group-hover:scale-[1.03]`}>
                    <span className="font-display text-[104px] font-bold text-white/15">{persona.initial}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" aria-hidden />
              </div>

              <div className="p-6">
                <p className="text-[19px] font-semibold tracking-[-0.01em] text-gray-900">{persona.name}</p>
                <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  {persona.role}
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-600">{persona.tone}</p>
                <ArrowLink href="/signup" className="mt-5 text-[14px]">
                  Start session
                </ArrowLink>
              </div>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}
