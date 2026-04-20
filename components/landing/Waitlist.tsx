import { WaitlistForm } from "./WaitlistForm";

export function Waitlist() {
  return (
    <section
      id="waitlist"
      className="relative px-6 py-24 sm:px-12 sm:py-32 lg:px-20"
      aria-label="Join the waitlist"
    >
      <div className="mx-auto max-w-[720px] text-center">
        <span className="font-mono text-[11px] font-medium tracking-label text-accent">
          EARLY ACCESS · APRIL 2026
        </span>

        <h2 className="mt-6 font-display text-[36px] font-semibold leading-[1.1] tracking-heading text-text-primary sm:text-[44px]">
          Be ready for the interview
          <br />
          <em className="font-serif font-normal italic text-accent">that decides everything.</em>
        </h2>

        <p className="mx-auto mt-6 max-w-[520px] font-sans text-[16px] leading-relaxed text-text-secondary">
          Join the waitlist. We&apos;ll email you the day your target firm&apos;s interview bank goes live — and your
          first practice session is on us.
        </p>

        <div className="mt-10">
          <WaitlistForm />
        </div>

        <p className="mt-4 font-sans text-[12px] text-text-tertiary">
          No spam. One-click unsubscribe. We&apos;ll only email about Folio.
        </p>
      </div>
    </section>
  );
}
