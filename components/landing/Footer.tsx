import Link from "next/link";
import { FolioMark } from "../FolioMark";

export function Footer() {
  return (
    <footer
      className="border-t border-gray-100 bg-gray-50 px-6 py-12 sm:px-8 lg:px-20"
      aria-label="Site footer"
    >
      {/* Subtle gradient separator */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00DC82]/20 to-transparent -mt-12 mb-12" aria-hidden />

      <div className="mx-auto max-w-[1200px]">
        {/* Top row — signature + domain */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="font-serif text-[20px] italic text-[#00DC82]">
            Built to get you hired.
          </p>
          <p className="text-[15px] font-medium text-gray-900">folio.io</p>
        </div>

        {/* Divider */}
        <div className="my-10 h-px w-full bg-gray-200" />

        {/* Link columns */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <FolioMark className="h-5 w-5" color="#00DC82" />
              <span className="text-[14px] font-semibold tracking-[-0.02em] text-gray-900">
                Folio
              </span>
            </Link>
            <p className="mt-3 max-w-[240px] text-[13px] leading-relaxed text-gray-500">
              Live voice interview practice, indistinguishable from the real thing.
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
              { label: "Privacy", href: "/legal/privacy" },
              { label: "Terms", href: "/legal/terms" },
              { label: "Cookies", href: "/legal/cookies" },
            ]}
          />
        </div>

        {/* Social links + copyright */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <FolioMark className="h-4 w-4" color="#9CA3AF" />
            <p className="font-mono text-[11px] tracking-[0.1em] text-gray-400">
              &copy; {new Date().getFullYear()} FOLIO, INC.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <a href="https://x.com" className="text-[13px] text-gray-400 transition-colors hover:text-gray-600" target="_blank" rel="noopener noreferrer">
              X / Twitter
            </a>
            <a href="https://linkedin.com" className="text-[13px] text-gray-400 transition-colors hover:text-gray-600" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <a href="https://instagram.com" className="text-[13px] text-gray-400 transition-colors hover:text-gray-600" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
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
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-gray-900">
        {heading}
      </h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block text-[14px] text-gray-500 transition-colors duration-200 hover:text-gray-900"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
