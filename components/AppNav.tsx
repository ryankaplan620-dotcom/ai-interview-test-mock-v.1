"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/session/new", label: "Practice" },
  { href: "/outreach", label: "Outreach" },
  { href: "/settings", label: "Settings" },
];

export function AppMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-ink-border/60 bg-ink/90 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex h-[60px] items-center">
        {navLinks.map((link) => {
          const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-center transition-colors",
                active ? "text-accent" : "text-text-tertiary hover:text-text-secondary",
              ].join(" ")}
            >
              <span className="font-sans text-[11px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
