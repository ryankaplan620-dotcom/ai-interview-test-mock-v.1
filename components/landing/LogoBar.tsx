export function LogoBar() {
  return (
    <section className="bg-gray-50 px-6 py-12 sm:px-8" aria-label="Trusted across industries">
      <div className="mx-auto max-w-[1200px] text-center">
        <p className="text-[13px] font-medium uppercase tracking-[0.1em] text-gray-400">
          Trusted across industries
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {["Tech", "Finance", "Healthcare", "Consulting", "Government", "Startups"].map(
            (industry, i, arr) => (
              <span key={industry} className="text-[15px] text-gray-400">
                {industry}
                {i < arr.length - 1 && (
                  <span className="ml-6 text-gray-300" aria-hidden>&middot;</span>
                )}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}
