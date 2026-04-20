import Link from "next/link";
import { FolioMark } from "../FolioMark";

export function Footer() {
  return (
    <footer
      className="border-t border-ink-border/40 px-6 py-12 sm:px-12 lg:px-20"
      aria-label="Site footer"
    >
      {/* Thin accent line at top */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" aria-hidden />

      <div className="mx-auto max-w-[1440px] pt-12">
        {/* Top row — signature line + domain */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="animate-tagline-pulse font-serif text-[17px] italic tracking-body text-accent">
            Built to get you hired.
          </p>
          <p className="font-display text-[15px] font-medium tracking-body text-accent">folio.io</p>
        </div>

        {/* Divider */}
        <div className="my-10 h-px w-full bg-ink-border/40" />

        {/* Bottom row — links + copyright */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <FolioMark className="h-5 w-5" color="#00F590" />
              <span className="font-display text-[14px] font-semibold tracking-[-0.025em] text-text-primary">
                Folio
              </span>
            </Link>
            <p className="mt-3 max-w-[240px] font-sans text-[13px] leading-relaxed text-text-tertiary">
              Live video interview practice, indistinguishable from the real thing.
            </p>
          </div>

          <FooterColumn
            heading="Product"
            links={[
              { label: "How it works", href: "#how-it-works" },
              { label: "Interviewers", href: "#interviewers" },
              { label: "Pricing", href: "#pricing" },
              { label: "Journal", href: "#journal" },
            ]}
          />

          <FooterColumn
            heading="Company"
            links={[
              { label: "About", href: "/about" },
              { label: "Careers", href: "/careers" },
              { label: "Press", href: "/press" },
              { label: "Contact", href: "mailto:hello@folio.io" },
            ]}
          />

          <FooterColumn
            heading="Legal"
            links={[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Cookies", href: "/cookies" },
              { label: "Accessibility", href: "/accessibility" },
            ]}
          />
        </div>

        {/* Copyright */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="font-mono text-[11px] tracking-label text-text-tertiary">
            © {new Date().getFullYear()} FOLIO, INC.
          </p>
          <p className="font-sans text-[12px] text-text-tertiary">Made for the interview that matters.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="font-mono text-[11px] font-medium tracking-label text-text-tertiary">
        {heading.toUpperCase()}
      </h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block font-sans text-[14px] text-text-secondary transition-all duration-200 hover:translate-x-[2px] hover:text-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
