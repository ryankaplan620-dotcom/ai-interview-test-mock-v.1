import { ScrollReveal } from "./ScrollReveal";

const stats = [
  { value: "200+", label: "Companies" },
  { value: "5", label: "Interviewer personas" },
  { value: "6", label: "Score dimensions" },
  { value: "90s", label: "To your first Folio Score" },
];

export function Stats() {
  return (
    <section className="bg-gradient-section px-6 py-16 sm:px-8" aria-label="Key stats">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-8 text-center md:grid-cols-4">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 100}>
              <div className="py-8">
                <p className="text-[56px] font-bold tracking-tight text-[#F0F6FC]">{stat.value}</p>
                <div className="mx-auto mt-3 h-[2px] w-12 bg-[#00DC82]" aria-hidden />
                <p className="mt-3 text-[14px] text-[#8B949E]">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
