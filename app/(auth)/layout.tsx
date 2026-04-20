import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col bg-ink">
      {/* Atmospheric background */}
      <div className="pointer-events-none fixed inset-0 grid-overlay opacity-[0.3]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-depth-glow" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-ambient-glow" aria-hidden />

      {/* Simple nav */}
      <nav className="relative px-6 py-6 sm:px-12">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <FolioMark className="h-7 w-7" color="#00F590" />
          <span className="font-display text-lg font-semibold tracking-[-0.025em] text-text-primary">
            folio
          </span>
        </Link>
      </nav>

      {/* Content */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>

      {/* Footer signature */}
      <div className="relative border-t border-ink-border/40 px-6 py-6 text-center sm:px-12">
        <p className="font-serif text-[14px] italic text-accent">Built to get you hired.</p>
      </div>
    </main>
  );
}
