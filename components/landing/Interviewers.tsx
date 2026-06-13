import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";
import { Section, Eyebrow, SectionHeading, Lede, ArrowLink, Card } from "@/components/marketing/ui";

// Marketing roster for the landing page — mirrors the brand deck's
// "Our Agents" spread. Intentionally local; not the product persona list.
const agents = [
  {
    name: "Sarah",
    version: "v.2",
    role: "Engineering Manager — technical & behavioral",
    image: "/images/agents/sarah.png",
    alpha: false,
  },
  {
    name: "Gemma",
    version: "v.3",
    role: "SVP & Regional Manager — real estate & finance",
    image: "/images/agents/gemma.png",
    alpha: false,
  },
  {
    name: "Luke",
    version: "v.1",
    role: "Early-career generalist — in training",
    image: "/images/agents/luke.png",
    alpha: true,
  },
];

export function Interviewers() {
  return (
    <Section id="interviewers" tone="tint">
      <ScrollReveal>
        <Eyebrow>Our agents</Eyebrow>
        <SectionHeading className="mt-4">Three agents. One for every room.</SectionHeading>
        <Lede className="mt-5 max-w-[540px]">
          Each agent brings a different energy and a different kind of pressure. Practice
          with all three to build real range.
        </Lede>
      </ScrollReveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {agents.map((agent, i) => (
          <ScrollReveal key={agent.name} delay={i * 100}>
            <Card interactive className="h-full">
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={agent.image}
                  alt={`${agent.name}, Folio interview agent`}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink/25 to-transparent" aria-hidden />
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2.5">
                  <p className={["font-display text-[20px] font-bold tracking-[-0.02em]", agent.alpha ? "text-gray-400" : "text-gray-900"].join(" ")}>
                    {agent.name}
                  </p>
                  <span className={["inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold leading-[1.6]", agent.alpha ? "bg-gray-100 text-gray-400" : "bg-accent text-ink"].join(" ")}>
                    {agent.version}
                  </span>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{agent.role}</p>

                {agent.alpha ? (
                  <span className="mt-5 inline-flex items-center rounded-full border border-gray-200 bg-canvas px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Alpha
                  </span>
                ) : (
                  <ArrowLink href="/signup" className="mt-5 text-[14px]">
                    Start session
                  </ArrowLink>
                )}
              </div>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}
