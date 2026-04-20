"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import { FolioMark } from "../FolioMark";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Interviewers", href: "#interviewers" },
  { label: "Pricing", href: "#pricing" },
  { label: "Journal", href: "#journal" },
];

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 100);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={clsx(
        "sticky top-0 z-50 border-b border-ink-border/35 bg-ink/80 backdrop-blur-md transition-shadow duration-300",
        scrolled && "shadow-[0_1px_0_0_rgba(42,49,57,0.5)]"
      )}
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 sm:px-12 lg:px-20">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2.5 transition-all duration-300 hover:opacity-80" aria-label="Folio home">
          <FolioMark className="h-6 w-6 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(0,245,144,0.3)]" color="#00F590" />
          <span className="font-display text-lg font-semibold tracking-[-0.025em] text-text-primary">
            folio
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-sans text-[13.5px] font-medium tracking-body text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: Sign in + CTA + hamburger */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden font-sans text-[13.5px] font-medium tracking-body text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-full bg-accent px-4 font-sans text-[13.5px] font-semibold tracking-body text-text-onAccent transition-all duration-200 ease-brand hover:bg-accent-highlight hover:shadow-accent-glow"
          >
            Start free →
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-border bg-ink-surface transition-colors hover:border-text-tertiary md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#F0F6FC" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#F0F6FC" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="M2 4h12M2 8h12M2 12h12" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-ink-border/35 bg-ink/95 backdrop-blur-md md:hidden">
          <div className="mx-auto max-w-[1440px] px-6 py-4 sm:px-12">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center font-sans text-[15px] font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-ink-border/35 pt-4">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center font-sans text-[15px] font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center justify-center rounded-full bg-accent font-sans text-[15px] font-semibold text-text-onAccent"
              >
                Start free →
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
