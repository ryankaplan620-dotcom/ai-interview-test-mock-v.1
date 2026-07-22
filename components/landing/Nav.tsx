"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import { PrepSpaceMark } from "../PrepSpaceMark";
import { Button } from "@/components/marketing/ui";

const navLinks = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Security", href: "/security" },
];

export function Nav({ onDark = false }: { onDark?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // On the dark hero the bar is transparent with light text, then condenses
  // to a blurred ink bar on scroll. Other (light) pages keep the original look.
  const linkClass = onDark
    ? "text-text-secondary hover:text-text-primary"
    : "text-gray-600 hover:text-gray-950";

  return (
    <nav
      className={clsx(
        "sticky top-0 z-50 border-b transition-all duration-300",
        onDark
          ? scrolled
            ? "border-ink-border/60 bg-ink/80 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
          : scrolled
            ? "border-gray-200/70 bg-canvas/80 shadow-[0_1px_0_rgba(16,24,40,0.04)] backdrop-blur-xl"
            : "border-transparent bg-canvas",
      )}
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6 sm:px-8">
        {/* Logo + wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-70"
          aria-label="PrepSpace home"
        >
          <PrepSpaceMark className="h-7 w-7" color="#63D88A" />
          <span
            className={clsx(
              "font-display text-[18px] font-semibold tracking-[-0.025em]",
              onDark ? "text-text-primary" : "text-gray-900",
            )}
          >
            PrepSpace
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx("text-[14.5px] font-medium transition-colors duration-200", linkClass)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: Sign in + CTA + hamburger */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/login"
            className={clsx(
              "hidden text-[14.5px] font-medium transition-colors duration-200 sm:inline-flex",
              linkClass,
            )}
          >
            Sign in
          </Link>
          <Button href="/signup" size="sm" className="hidden sm:inline-flex" withArrow>
            Get started
          </Button>

          {/* Mobile hamburger */}
          <button
            type="button"
            className={clsx(
              "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors md:hidden",
              onDark
                ? "border-ink-border bg-ink-surface text-text-secondary hover:bg-ink-raised"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
            )}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="M2 4h12M2 8h12M2 12h12" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className={clsx(
            "border-t md:hidden",
            onDark ? "border-ink-border bg-ink" : "border-gray-100 bg-canvas",
          )}
        >
          <div className="mx-auto max-w-[1200px] px-6 py-3 sm:px-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={clsx("flex min-h-[48px] items-center text-[15px] font-medium transition-colors", linkClass)}
              >
                {link.label}
              </Link>
            ))}
            <div
              className={clsx(
                "mt-2 flex flex-col gap-2.5 border-t pt-4",
                onDark ? "border-ink-border" : "border-gray-100",
              )}
            >
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className={clsx("flex min-h-[44px] items-center text-[15px] font-medium transition-colors", linkClass)}
              >
                Sign in
              </Link>
              <Button href="/signup" onClick={() => setMobileOpen(false)} className="w-full" withArrow>
                Get started
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
