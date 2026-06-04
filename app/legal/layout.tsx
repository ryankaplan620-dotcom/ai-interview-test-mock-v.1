import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

const legalLinks = [
  { label: "Terms", href: "/legal/terms" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Cookies", href: "/legal/cookies" },
];

/**
 * Shared chrome for legal pages — now part of the unified light marketing site.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <Nav />

      {/* Legal sub-navigation */}
      <div className="border-b border-gray-200/70 bg-gray-50/60">
        <div className="mx-auto flex h-12 max-w-[720px] items-center gap-6 px-6 sm:px-10">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {children}

      <Footer />
    </main>
  );
}
