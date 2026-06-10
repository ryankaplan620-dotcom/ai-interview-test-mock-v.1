"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/client";
import { FolioMark } from "@/components/FolioMark";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          data: { full_name: fullName },
        },
      });

      if (error) throw error;

      if (data.user && !data.session) {
        setConfirmationSent(true);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  if (confirmationSent) {
    return (
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-accent/30 bg-ink-surface p-8 text-center shadow-accent-glow sm:p-10">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <FolioMark className="h-6 w-6" color="#63D88A" />
          </span>
          <h1 className="mt-6 font-display text-[24px] font-bold tracking-heading text-text-primary">
            Confirm your email
          </h1>
          <p className="mt-3 font-sans text-[15px] leading-relaxed text-text-secondary">
            We sent a confirmation link to <span className="font-medium text-text-primary">{email}</span>. Click it to
            activate your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-2xl border border-ink-border bg-ink-surface p-8 sm:p-10">
        <h1 className="font-display text-[26px] font-bold tracking-heading text-text-primary">
          Start your free trial
        </h1>
        <p className="mt-2 font-sans text-[14px] text-text-secondary">
          15 days, all features, no credit card.
        </p>

        <form onSubmit={handleSignup} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="signup-name"
              className="mb-2 block font-sans text-[13px] font-medium text-text-primary"
            >
              Full name
            </label>
            <input
              id="signup-name"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="h-11 w-full rounded-xl border border-ink-border bg-ink px-4 font-sans text-[14px] text-text-primary transition-colors duration-200 placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="mb-2 block font-sans text-[13px] font-medium text-text-primary"
            >
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl border border-ink-border bg-ink px-4 font-sans text-[14px] text-text-primary transition-colors duration-200 placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
            <p className="mt-2 font-sans text-[12px] text-text-secondary">
              Use .edu email to unlock the $49 Basic student plan.
            </p>
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="mb-2 block font-sans text-[13px] font-medium text-text-primary"
            >
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters"
              className="h-11 w-full rounded-xl border border-ink-border bg-ink px-4 font-sans text-[14px] text-text-primary transition-colors duration-200 placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>

          {error && (
            <p className="font-sans text-[13px] text-rose-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-full bg-cta-gradient font-sans text-[14px] font-semibold text-text-onAccent transition-all duration-200 ease-brand hover:shadow-accent-glow disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Start free trial"}
          </button>

          <p className="text-center font-sans text-[12px] leading-relaxed text-text-tertiary">
            By continuing, you agree to our{" "}
            <Link href="/legal/terms" className="underline transition-colors hover:text-accent">Terms</Link>{" "}and{" "}
            <Link href="/legal/privacy" className="underline transition-colors hover:text-accent">Privacy Policy</Link>.
          </p>
        </form>
      </div>

      <p className="mt-6 text-center font-sans text-[13px] text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent transition-opacity hover:opacity-80">
          Sign in
        </Link>
      </p>
    </div>
  );
}
