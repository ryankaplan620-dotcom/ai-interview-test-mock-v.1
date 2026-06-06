import Link from "next/link";
import { FolioMark } from "../FolioMark";

const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Interviewers", href: "/#interviewers" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/faq" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Cookies", href: "/legal/cookies" },
    ],
  },
];

const socials: { label: string; href: string }[] = [
  { label: "X", href: "https://x.com/tryfolio" },
  { label: "LinkedIn", href: "https://linkedin.com/company/tryfolio" },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200/70 bg-canvas-tint" aria-label="Site footer">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand block */}
          <div className="max-w-[280px]">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Folio home">
              <FolioMark className="h-6 w-6" color="#00DC82" />
              <span className="font-display text-[17px] font-semibold tracking-[-0.025em] text-gray-900">
                Folio
              </span>
            </Link>
            <p className="mt-4 text-[14px] leading-relaxed text-gray-500">
              Live voice interview practice, indistinguishable from the real thing.
            </p>
            <p className="mt-5 font-serif text-[18px] italic text-brand-700">
              Built to get you hired.
            </p>
          </div>

          {columns.map((col) => (
            <FooterColumn key={col.heading} heading={col.heading} links={col.links} />
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-gray-200/70 pt-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <FolioMark className="h-4 w-4" color="#9CA3AF" />
            <p className="font-mono text-[11px] tracking-[0.12em] text-gray-400">
              © {new Date().getFullYear()} FOLIO, INC.
            </p>
          </div>

          <div className="flex items-center gap-6">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.label}
              </a>
            ))}
          </div>
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
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
        {heading}
      </h3>
      <ul className="mt-5 space-y-3.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block text-[14.5px] text-gray-600 transition-colors duration-200 hover:text-gray-950"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
