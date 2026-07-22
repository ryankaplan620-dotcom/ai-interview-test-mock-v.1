/**
 * Full-width brand statement band — brand deck p.6.
 * ALL-CAPS display headline rendered in the violet "intelligence" treatment.
 */
export function Statement() {
  return (
    <section className="relative overflow-hidden bg-ink" aria-label="PrepSpace statement">
      <div className="mx-auto max-w-[1200px] px-6 py-24 text-center sm:px-8 sm:py-32">
        <p className="font-mono text-[12px] font-medium uppercase tracking-label text-text-tertiary">
          PrepSpace
        </p>

        <h2
          className="text-gradient-violet mx-auto mt-6 font-display font-black uppercase leading-[0.98] tracking-[-0.03em]"
          style={{ fontSize: "clamp(38px, 6.5vw, 92px)" }}
        >
          The product is
          <br />
          the intelligence
        </h2>

        <p className="mx-auto mt-8 max-w-[520px] text-[16px] leading-relaxed text-text-secondary">
          Every session you run makes the agents sharper.
        </p>
      </div>
    </section>
  );
}
