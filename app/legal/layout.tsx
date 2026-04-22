import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";

/**
 * Shared chrome for legal pages — matches the pricing page shell.
 * Legal pages should feel like part of the product.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen bg-ink">
      <div className="pointer-events-none fixed inset-0 grid-overlay opacity-[0.15]" aria-hidden />

      <nav className="relative border-b border-ink-border/35 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 sm:px-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <FolioMark className="h-6 w-6" color="#00F590" />
            <span className="font-display text-lg font-semibold tracking-[-0.025em] text-text-primary">
              folio
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/legal/terms"
              className="font-sans text-[13px] font-medium text-text-secondary hover:text-text-primary"
            >
              Terms
            </Link>
            <Link
              href="/legal/privacy"
              className="font-sans text-[13px] font-medium text-text-secondary hover:text-text-primary"
            >
              Privacy
            </Link>
            <Link
              href="/legal/cookies"
              className="font-sans text-[13px] font-medium text-text-secondary hover:text-text-primary"
            >
              Cookies
            </Link>
          </div>
        </div>
      </nav>

      {children}

      <footer className="relative border-t border-ink-border/40 px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <p className="font-serif text-[15px] italic text-accent">Built to get you hired.</p>
          <p className="font-display text-[14px] font-medium text-accent">folio.io</p>
        </div>
      </footer>
    </main>
  );
}
