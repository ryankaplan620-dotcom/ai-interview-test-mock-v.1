import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";
import { SignOutButton } from "@/components/SignOutButton";
import { getProfile, getUserTier, requireUser } from "@/lib/auth/server";
import { TIERS } from "@/lib/tiers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const profile = await getProfile();
  const tier = await getUserTier();

  const tierConfig = tier ? TIERS[tier.effective_tier] : TIERS.cycle;

  return (
    <main className="relative flex min-h-screen flex-col bg-ink">
      {/* Atmospheric layers */}
      <div className="pointer-events-none fixed inset-0 grid-overlay opacity-[0.25]" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-depth-glow opacity-60" aria-hidden />

      {/* Top nav */}
      <header className="relative z-10 border-b border-ink-border/40 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-10">
            <Link href="/dashboard" className="inline-flex items-center gap-2.5">
              <FolioMark className="h-6 w-6" color="#00F590" />
              <span className="font-display text-lg font-semibold tracking-[-0.025em] text-text-primary">
                folio
              </span>
            </Link>

            <nav className="hidden items-center gap-8 md:flex">
              <Link
                href="/dashboard"
                className="font-sans text-[13.5px] font-medium tracking-body text-text-secondary transition-colors hover:text-text-primary"
              >
                Dashboard
              </Link>
              <Link
                href="/session/new"
                className="font-sans text-[13.5px] font-medium tracking-body text-text-secondary transition-colors hover:text-text-primary"
              >
                Practice
              </Link>
              <Link
                href="/settings"
                className="font-sans text-[13.5px] font-medium tracking-body text-text-secondary transition-colors hover:text-text-primary"
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="hidden items-center gap-1.5 rounded-full border border-ink-border bg-ink-surface px-3 py-1.5 sm:inline-flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="font-mono text-[10px] font-medium tracking-label text-accent">
                {tierConfig.name.toUpperCase()}
              </span>
            </Link>
            <span className="hidden font-sans text-[13.5px] text-text-secondary md:inline">
              {profile?.full_name ?? profile?.email?.split("@")[0]}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="relative z-0 flex-1">{children}</div>
    </main>
  );
}
