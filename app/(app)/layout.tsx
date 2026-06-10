import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";
import { SignOutButton } from "@/components/SignOutButton";
import { AppDesktopNav, AppMobileNav } from "@/components/AppNav";
import { LinkButton } from "@/components/Button";
import { getProfile, getUserTier, requireUser } from "@/lib/auth/server";
import { TIERS } from "@/lib/tiers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const profile = await getProfile();
  const tier = await getUserTier();

  const tierConfig = tier ? TIERS[tier.effective_tier] : TIERS.free;

  return (
    <main className="relative flex min-h-screen flex-col bg-ink">
      {/* Atmospheric layers */}
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-[0.25]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-depth-glow opacity-60" aria-hidden />

      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-6 sm:px-10">
          <div className="flex min-w-0 items-center gap-8 lg:gap-10">
            <Link
              href="/dashboard"
              className="inline-flex flex-shrink-0 items-center gap-2.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <FolioMark className="h-6 w-6 text-accent" />
              <span className="font-display text-[18px] font-bold tracking-[-0.03em] text-text-primary">
                Folio
              </span>
            </Link>

            <AppDesktopNav />
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/pricing"
              className="hidden items-center gap-1.5 rounded-full border border-ink-border bg-ink-surface px-3 py-1.5 transition-colors hover:border-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:inline-flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              <span className="font-mono text-[10px] font-medium tracking-label text-accent">
                {tierConfig.label.toUpperCase()}
              </span>
            </Link>

            <span className="hidden max-w-[160px] truncate font-sans text-[13px] text-text-secondary lg:inline">
              {profile?.full_name ?? profile?.email?.split("@")[0]}
            </span>

            <SignOutButton />

            <LinkButton href="/session/new" size="sm" className="hidden md:inline-flex">
              New session
            </LinkButton>
          </div>
        </div>
      </header>

      <div className="relative z-0 flex-1 pb-[60px] md:pb-0">{children}</div>
      <AppMobileNav />
    </main>
  );
}
