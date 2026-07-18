export const dynamic = "force-dynamic";
import Link from "next/link";
import { getUserTier, requireUser } from "@/lib/auth/server";
import { VerifyStudentClient } from "./verify-student-client";

/**
 * /settings/verify-student
 *
 * Entry point for Basic-tier student verification. Referenced from the
 * pricing page when a signed-in, non-verified user selects Basic.
 */
export default async function VerifyStudentPage() {
  await requireUser();
  const tier = await getUserTier();

  return (
    <div className="mx-auto max-w-[640px] px-6 py-12 sm:px-10">
      <div className="mb-10">
        <Link
          href="/settings"
          className="font-sans text-[13px] text-text-secondary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          ← Back to settings
        </Link>
        <span className="mt-6 block font-mono text-[11px] font-medium tracking-label text-accent">
          STUDENT VERIFICATION
        </span>
        <h1 className="mt-3 font-display text-[32px] font-bold tracking-[-0.03em] text-text-primary">
          Verify your student status
        </h1>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-text-secondary">
          The Basic plan is priced for students. Verifying takes a minute and unlocks it.
        </p>
      </div>

      <div className="rounded-xl border border-ink-border bg-ink-surface p-6">
        <VerifyStudentClient alreadyVerified={tier?.is_verified_student ?? false} />
      </div>
    </div>
  );
}
