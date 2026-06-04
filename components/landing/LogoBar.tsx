const companies = [
  "Google",
  "Amazon",
  "Microsoft",
  "Stripe",
  "McKinsey",
  "Deloitte",
  "Salesforce",
  "Target",
];

function Track() {
  return (
    <div className="flex shrink-0 items-center gap-12 pr-12 sm:gap-16 sm:pr-16">
      {companies.map((name) => (
        <span
          key={name}
          className="whitespace-nowrap font-display text-[19px] font-semibold tracking-[-0.02em] text-gray-400 sm:text-[22px]"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export function LogoBar() {
  return (
    <section className="border-y border-gray-200/70 bg-canvas py-14 sm:py-16" aria-label="Companies we cover">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-8">
        <p className="text-center font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-gray-400">
          Question banks for the rooms you&apos;re walking into
        </p>
      </div>

      {/* Marquee with edge fades */}
      <div className="relative mt-9 overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-canvas to-transparent sm:w-32" aria-hidden />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-canvas to-transparent sm:w-32" aria-hidden />
        <div className="flex w-max animate-marquee">
          <Track />
          <Track />
        </div>
      </div>
    </section>
  );
}
