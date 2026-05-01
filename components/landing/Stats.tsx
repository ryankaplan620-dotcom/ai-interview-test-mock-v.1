import { ScrollReveal } from "./ScrollReveal";

const stats = [
  { value: "200+", label: "Companies" },
  { value: "5", label: "Interviewer personas" },
  { value: "6", label: "Score dimensions" },
  { value: "90s", label: "To your first Folio Score" },
];

export function Stats() {
  return (
    <section className="border-t border-ink-border/40 px-6 py-20 sm:px-12 lg:px-20" aria-label="Key stats">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-8 text-center md:grid-cols-4">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 100}>
              <div>
                <p className="font-display text-[48px] font-bold text-accent">{stat.value}</p>
                <div className="mx-auto mt-2 h-px w-12 bg-accent/30" aria-hidden />
                <p className="mt-2 font-sans text-sm text-text-tertiary">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
