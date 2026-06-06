import { ScrollReveal } from "./ScrollReveal";
import { Section } from "@/components/marketing/ui";

const stats = [
  { value: "200+", label: "Companies covered" },
  { value: "3", label: "Interviewer personas" },
  { value: "4", label: "Score dimensions" },
  { value: "90s", label: "To your first score" },
];

export function Stats() {
  return (
    <Section tone="white" className="py-16 sm:py-20 lg:py-24">
      <ScrollReveal>
        <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-gradient-to-b from-white to-gray-50 shadow-card">
          <div className="grid grid-cols-2 divide-gray-200/70 md:grid-cols-4 md:divide-x">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`px-6 py-9 text-center sm:py-11 ${i < 2 ? "border-b border-gray-200/70 md:border-b-0" : ""}`}
              >
                <p className="font-display text-[44px] font-semibold leading-none tracking-[-0.03em] text-gray-900 sm:text-[52px]">
                  {stat.value}
                </p>
                <p className="mt-3 text-[13.5px] font-medium text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </Section>
  );
}
