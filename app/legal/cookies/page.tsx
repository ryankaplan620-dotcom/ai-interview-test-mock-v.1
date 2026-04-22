import type { Metadata } from "next";
import {
  COMPANY,
  LEGAL_VERSIONS,
  formatEffectiveDate,
} from "@/lib/legal/constants";
import { CookieControls } from "@/components/legal/cookie-controls";

export const metadata: Metadata = {
  title: "Cookie Policy · Folio",
  description: "What cookies Folio uses, why, and how you control them.",
};

export default function CookiesPage() {
  const effective = formatEffectiveDate();

  return (
    <article className="relative mx-auto max-w-[720px] px-6 py-16 sm:px-10 sm:py-20">
      <header className="mb-12">
        <p className="font-mono text-[11px] font-medium tracking-label text-accent">COOKIE POLICY</p>
        <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.1] tracking-heading text-text-primary sm:text-[48px]">
          Cookie Policy
        </h1>
        <p className="mt-4 font-sans text-[13px] text-text-tertiary">
          Version {LEGAL_VERSIONS.cookies} · Effective {effective}
        </p>
        <p className="mt-6 font-serif text-[17px] italic leading-[1.55] text-text-secondary">
          Every cookie {COMPANY.short_name} sets, why it exists, and how to turn off the optional
          ones. We keep this list short on purpose.
        </p>
      </header>

      <div className="legal-prose text-text-secondary">
        <Section n="1" title="Strictly necessary cookies — always on">
          <p>
            These cookies are required for the product to work. They cannot be turned off. No
            consent is required for strictly necessary cookies under GDPR, CCPA, or similar laws.
          </p>
          <div className="my-4 space-y-3">
            <CookieRow
              name="sb-access-token"
              provider="Supabase"
              purpose="Keeps you signed in. Contains your encrypted session token."
              expires="1 hour (refreshed automatically)"
            />
            <CookieRow
              name="sb-refresh-token"
              provider="Supabase"
              purpose="Refreshes your session token when it expires."
              expires="30 days"
            />
            <CookieRow
              name="folio-cookie-consent"
              provider={COMPANY.short_name}
              purpose="Records your cookie preference (accepted or dismissed). Only cookie we set ourselves."
              expires="1 year"
            />
          </div>
        </Section>

        <Section n="2" title="Analytics cookies — off by default">
          <p>
            We do not place analytics cookies until you've accepted. If you've accepted, we use
            PostHog to understand which features people actually use. We never share identified
            user data with advertisers, because we do not run ads.
          </p>
          <div className="my-4 space-y-3">
            <CookieRow
              name="ph_*"
              provider="PostHog"
              purpose="Anonymous device identifier and session ID for product analytics. IP is anonymized at ingest."
              expires="1 year"
              optional
            />
          </div>
          <p>
            You can change your preference any time using the controls below.
          </p>
        </Section>

        <Section n="3" title="Your controls">
          <div className="my-4">
            <CookieControls />
          </div>
          <p>
            You can also control cookies through your browser settings — most browsers let you
            block all cookies, clear existing ones, or prompt you before accepting new ones.
            Blocking the strictly necessary cookies will cause {COMPANY.short_name} to stop working
            (you won't stay signed in).
          </p>
        </Section>

        <Section n="4" title="Changes">
          <p>
            If we add a new cookie (e.g., adding a new analytics or error-tracking provider), we
            will update this page and bump the Version. If the new cookie is optional, you'll be
            asked to re-consent the next time you visit.
          </p>
        </Section>

        <Section n="5" title="Questions">
          <p>
            For anything cookie- or tracking-related, email{" "}
            <a href={`mailto:${COMPANY.privacy_email}`} className="text-accent hover:underline">
              {COMPANY.privacy_email}
            </a>
            .
          </p>
        </Section>
      </div>
    </article>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-[22px] font-semibold leading-[1.2] text-text-primary">
        <span className="mr-3 font-mono text-[14px] font-normal text-text-tertiary">{n}.</span>
        {title}
      </h2>
      <div className="font-sans text-[15px] leading-[1.7] [&>p]:mb-4 [&_strong]:font-semibold [&_strong]:text-text-primary">
        {children}
      </div>
    </section>
  );
}

function CookieRow({
  name,
  provider,
  purpose,
  expires,
  optional,
}: {
  name: string;
  provider: string;
  purpose: string;
  expires: string;
  optional?: boolean;
}) {
  return (
    <div className="rounded-lg border border-ink-border bg-ink-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <code className="font-mono text-[13px] text-text-primary">{name}</code>
        <span
          className={[
            "rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-label",
            optional
              ? "border-amber-300/30 bg-amber-300/5 text-amber-300/80"
              : "border-accent/30 bg-accent/5 text-accent",
          ].join(" ")}
        >
          {optional ? "OPTIONAL" : "REQUIRED"}
        </span>
      </div>
      <p className="mt-2 font-sans text-[13px] leading-[1.55] text-text-secondary">{purpose}</p>
      <p className="mt-2 font-mono text-[11px] tracking-label text-text-tertiary">
        {provider.toUpperCase()} · EXPIRES {expires.toUpperCase()}
      </p>
    </div>
  );
}
