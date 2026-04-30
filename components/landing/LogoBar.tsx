"use client";

const industries = [
  { name: "Tech", weight: "font-semibold" },
  { name: "Finance", weight: "font-light tracking-wide" },
  { name: "Healthcare", weight: "font-medium italic" },
  { name: "Consulting", weight: "font-bold tracking-tight" },
  { name: "Government", weight: "font-normal tracking-widest text-[13px]" },
  { name: "Startups", weight: "font-semibold" },
  { name: "+200 more", weight: "font-medium text-[#00DC82]" },
];

function MarqueeTrack() {
  return (
    <div className="flex shrink-0 items-center gap-8">
      {industries.map((industry) => (
        <span key={industry.name} className="flex items-center gap-8">
          <span className={`whitespace-nowrap text-[15px] text-gray-400 ${industry.weight}`}>
            {industry.name}
          </span>
          <span className="text-gray-200" aria-hidden>
            &middot;
          </span>
        </span>
      ))}
    </div>
  );
}

export function LogoBar() {
  return (
    <section className="bg-gray-50 px-6 py-12 sm:px-8" aria-label="Trusted across industries">
      <div className="mx-auto max-w-[1200px] text-center">
        <p className="text-[13px] font-medium uppercase tracking-[0.1em] text-gray-400">
          Trusted across industries
        </p>
      </div>

      {/* Marquee with gradient masks */}
      <div className="relative mt-6 overflow-hidden">
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-gray-50 to-transparent" aria-hidden />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-gray-50 to-transparent" aria-hidden />

        <div className="flex animate-marquee">
          <MarqueeTrack />
          <MarqueeTrack />
        </div>
      </div>
    </section>
  );
}
