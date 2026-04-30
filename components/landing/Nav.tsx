"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import { FolioMark } from "../FolioMark";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "/about" },
  { label: "Security", href: "/security" },
];

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={clsx(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-gray-100 bg-white/80 backdrop-blur-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          : "border-transparent bg-white"
      )}
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6 sm:px-8">
        {/* Logo + wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-70"
          aria-label="Folio home"
        >
          <FolioMark className="h-6 w-6" color="#00DC82" />
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-gray-900">
            Folio
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-gray-600 transition-colors duration-200 hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: Sign in + CTA + hamburger */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-[14px] font-medium text-gray-600 transition-colors duration-200 hover:text-gray-900 sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-lg bg-[#00DC82] px-4 text-[14px] font-medium text-white transition-all duration-200 hover:bg-[#00C574]"
          >
            Get started
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50 md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="M2 4h12M2 8h12M2 12h12" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="mx-auto max-w-[1200px] px-6 py-4 sm:px-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center text-[15px] font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-4">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center text-[15px] font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center justify-center rounded-lg bg-[#00DC82] text-[15px] font-medium text-white"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
