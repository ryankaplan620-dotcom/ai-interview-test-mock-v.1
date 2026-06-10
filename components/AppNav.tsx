"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", mobileLabel: "Home" },
  { href: "/session/new", label: "Practice", mobileLabel: "Practice" },
  { href: "/outreach", label: "Outreach", mobileLabel: "Outreach" },
  { href: "/settings", label: "Settings", mobileLabel: "Settings" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function AppDesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
      {navLinks.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={[
              "rounded-full px-3.5 py-2 font-sans text-[13.5px] font-medium tracking-body transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              active
                ? "bg-white/[0.04] text-accent"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-white/[0.08] bg-ink/90 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex h-[60px] items-center">
        {navLinks.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex h-full flex-1 flex-col items-center justify-center gap-1 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                active ? "text-accent" : "text-text-tertiary hover:text-text-secondary",
              ].join(" ")}
            >
              <span className="font-sans text-[11px] font-medium">{link.mobileLabel}</span>
              <span
                className={[
                  "h-1 w-1 rounded-full transition-colors",
                  active ? "bg-accent" : "bg-transparent",
                ].join(" ")}
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
