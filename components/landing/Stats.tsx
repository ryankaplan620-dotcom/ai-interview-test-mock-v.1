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
              <div className="glass-card p-8 rounded-xl">
                <p className="text-[48px] font-bold text-gray-900">{stat.value}</p>
                <div className="mx-auto mt-2 h-0.5 w-16 bg-gradient-to-r from-[#00DC82] to-emerald-300" aria-hidden />
                <p className="mt-2 text-[14px] text-gray-500">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
