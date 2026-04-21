import Link from "next/link";
import { FolioMark } from "./FolioMark";

export function LegalShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen bg-ink">
      <div className="pointer-events-none fixed inset-0 grid-overlay opacity-[0.25]" aria-hidden />

      <nav className="relative border-b border-ink-border/35 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 sm:px-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <FolioMark className="h-6 w-6" color="#00F590" />
            <span className="font-display text-lg font-semibold tracking-[-0.025em] text-text-primary">Folio</span>
          </Link>
        </div>
      </nav>

      <article className="relative mx-auto max-w-[720px] px-6 py-16 sm:px-10 sm:py-24">
        <span className="font-mono text-[11px] font-medium tracking-label text-accent">LEGAL</span>
        <h1 className="mt-4 font-display text-[40px] font-semibold tracking-heading text-text-primary">
          {title}
        </h1>
        <p className="mt-2 font-mono text-[11px] tracking-label text-text-tertiary">
          LAST UPDATED {lastUpdated.toUpperCase()}
        </p>

        <div className="mt-10 space-y-6 font-sans text-[15px] leading-relaxed text-text-secondary [&_a]:text-accent [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:text-text-primary [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-2">
          {children}
        </div>
      </article>

      <footer className="relative border-t border-ink-border/40 px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <p className="font-serif text-[14px] italic text-accent">Built to get you hired.</p>
          <p className="font-display text-[13px] font-medium text-accent">folio.io</p>
        </div>
      </footer>
    </main>
  );
}
