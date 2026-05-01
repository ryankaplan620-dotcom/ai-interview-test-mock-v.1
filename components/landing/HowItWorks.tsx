import { ScrollReveal } from "./ScrollReveal";

const steps = [
  {
    number: "01",
    title: "Practice under real conditions",
    body: "Five distinct interviewer personalities, each calibrated to your target firm. Voice-only, real-time, adaptive.",
    gradient: "bg-gradient-to-br from-emerald-50 to-white",
  },
  {
    number: "02",
    title: "See your exact words, made stronger",
    body: "After every session, Folio pulls the sentences that cost you the round and shows you the stronger version.",
    gradient: "bg-gradient-to-br from-blue-50 to-white",
  },
  {
    number: "03",
    title: "Open doors while you sleep",
    body: "Folio finds the recruiters who can open the door, drafts in your voice, and waits for your review before sending.",
    gradient: "bg-gradient-to-br from-amber-50 to-white",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-white px-6 py-24 sm:px-8 md:py-32 lg:py-40"
      aria-label="How Folio works"
    >
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal>
          <span className="font-mono text-[13px] font-medium tracking-[0.1em] uppercase text-[#00DC82]">
            HOW IT WORKS
          </span>

          <h2 className="mt-4 text-[36px] font-bold tracking-[-0.03em] text-gray-900 sm:text-[44px]">
            Three engines. One career.
          </h2>
        </ScrollReveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 150}>
              <div className={`group relative overflow-hidden rounded-xl border border-gray-100 ${step.gradient} p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#00DC82]/20`}>
                {/* Gradient top border on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00DC82] to-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl" aria-hidden />

                {/* Large step number */}
                <div className="w-14 h-14 rounded-full bg-[#00DC82]/10 flex items-center justify-center">
                  <span className="text-[#00DC82] font-bold text-[20px]">{step.number}</span>
                </div>

                <h3 className="mt-5 text-[24px] font-semibold text-gray-900 leading-snug">
                  {step.title}
                </h3>

                <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
                  {step.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
