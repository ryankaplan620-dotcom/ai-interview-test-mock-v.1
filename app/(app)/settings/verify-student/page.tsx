import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { startVerification } from "./actions";

interface PageProps {
  searchParams: { status?: string; verified?: string };
}

export default async function VerifyStudentPage({ searchParams }: PageProps) {
  const user = await requireUser();

  const supabase = createServerClient();

  // Check if user is already verified
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingRaw } = await (supabase.from("student_verifications") as any)
    .select("status, method, edu_email, verified_at, expires_at")
    .eq("user_id", user.id)
    .eq("status", "verified")
    .maybeSingle();
  const existing = existingRaw as {
    status: string;
    method: string;
    edu_email: string | null;
    verified_at: string | null;
    expires_at: string | null;
  } | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("email")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { email?: string } | null;

  const userEmail = profile?.email ?? user.email ?? "";
  const isEduEmail = /\.edu$|\.ac\.uk$|\.edu\.au$/i.test(userEmail);
  const isPending = searchParams.status === "pending";

  return (
    <div className="mx-auto max-w-[640px] px-6 py-12 sm:px-10">
      <div className="mb-8">
        <Link
          href="/settings"
          className="font-sans text-[13px] text-text-secondary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          ← Settings
        </Link>
        <p className="mt-6 font-mono text-[11px] tracking-[0.1em] text-accent">STUDENT VERIFICATION</p>
        <h1 className="mt-3 font-display text-[32px] font-bold tracking-[-0.03em] text-text-primary">
          Verify your student status.
        </h1>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-text-secondary">
          Unlock the Basic plan ($49 for 90 days) — available to verified students only.
        </p>
      </div>

      {existing ? (
        /* Already verified */
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8">
          <p className="font-mono text-[11px] tracking-[0.1em] text-accent">VERIFIED</p>
          <p className="mt-3 font-sans text-[16px] font-medium text-text-primary">
            Your student status is confirmed.
          </p>
          <p className="mt-2 font-sans text-[14px] text-text-secondary">
            {existing.expires_at
              ? `Verification active until ${new Date(existing.expires_at).toLocaleDateString()}.`
              : "Verification is active."}
          </p>
          <div className="mt-6">
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center rounded-full bg-cta-gradient px-6 font-sans text-[14px] font-semibold text-text-onAccent transition-all hover:shadow-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              Pick your plan →
            </Link>
          </div>
        </div>
      ) : isEduEmail ? (
        /* .edu primary email — can auto-verify */
        <div className="space-y-6">
          <div className="rounded-2xl border border-ink-border bg-ink-surface p-7">
            <p className="font-mono text-[11px] tracking-[0.1em] text-text-tertiary">YOUR EMAIL</p>
            <p className="mt-2 font-sans text-[16px] font-medium text-text-primary">{userEmail}</p>
            <p className="mt-2 font-sans text-[14px] text-text-secondary">
              This looks like a student email. Click below and we&apos;ll verify you instantly.
            </p>
          </div>
          <form action={startVerification}>
            <button
              type="submit"
              className="h-12 w-full rounded-full bg-cta-gradient font-sans text-[14px] font-semibold text-text-onAccent transition-all hover:shadow-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              Verify my student status →
            </button>
          </form>
        </div>
      ) : isPending ? (
        /* Non-.edu email, pending state after attempted verification */
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8">
          <p className="font-mono text-[11px] tracking-[0.1em] text-amber-400">PENDING</p>
          <p className="mt-3 font-sans text-[16px] font-medium text-text-primary">
            Student email required.
          </p>
          <p className="mt-2 font-sans text-[14px] leading-relaxed text-text-secondary">
            Your account uses <span className="font-medium text-text-primary">{userEmail}</span>,
            which isn&apos;t a recognized student email. To unlock the Basic plan, sign up with a
            .edu, .ac.uk, or .edu.au email address.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-10 items-center rounded-full bg-cta-gradient px-5 font-sans text-[13px] font-semibold text-text-onAccent transition-all hover:shadow-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              Create new account with .edu email →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center rounded-full border border-ink-border bg-ink-raised px-5 font-sans text-[13px] font-medium text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              See other plans
            </Link>
          </div>
        </div>
      ) : (
        /* Non-.edu email, initial state */
        <div className="space-y-6">
          <div className="rounded-2xl border border-ink-border bg-ink-surface p-7">
            <p className="font-mono text-[11px] tracking-[0.1em] text-text-tertiary">HOW IT WORKS</p>
            <ul className="mt-4 space-y-3">
              {[
                "Sign up or log in with a .edu, .ac.uk, or .edu.au email address.",
                "We verify your student status automatically — no waiting.",
                "The Basic plan ($49 for 90 days) becomes available on the pricing page.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[10px] font-semibold text-accent">
                    {i + 1}
                  </span>
                  <p className="font-sans text-[14px] leading-relaxed text-text-secondary">{step}</p>
                </li>
              ))}
            </ul>
          </div>

          <p className="font-sans text-[13px] text-text-tertiary">
            Your current account uses{" "}
            <span className="font-medium text-text-primary">{userEmail}</span>, which isn&apos;t a
            recognized student email.
          </p>

          <div className="flex flex-wrap gap-3">
            <form action={startVerification}>
              <button
                type="submit"
                className="h-11 rounded-full bg-cta-gradient px-6 font-sans text-[14px] font-semibold text-text-onAccent transition-all hover:shadow-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Try with this email →
              </button>
            </form>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center rounded-full border border-ink-border bg-ink-raised px-6 font-sans text-[13px] font-medium text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              See other plans
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
