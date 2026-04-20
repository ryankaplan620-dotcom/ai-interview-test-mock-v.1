"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/client";
import { Button } from "@/components/Button";

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

      // If email confirmation is enabled, user needs to confirm email
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
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center">
        <h1 className="font-display text-[22px] font-semibold text-text-primary">
          Confirm your email.
        </h1>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-text-secondary">
          We sent a confirmation link to <span className="text-text-primary">{email}</span>. Click it to
          activate your account, then your 15-day free trial begins.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[32px] font-semibold tracking-heading text-text-primary">
        Start your free trial.
      </h1>
      <p className="mt-2 font-sans text-[15px] text-text-secondary">
        15 days, all features, no credit card required.
      </p>

      <form onSubmit={handleSignup} className="mt-8 space-y-4">
        <div>
          <label htmlFor="fullName" className="block font-mono text-[11px] font-medium tracking-label text-text-tertiary">
            FULL NAME
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-ink-border bg-ink-surface px-4 font-sans text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="email" className="block font-mono text-[11px] font-medium tracking-label text-text-tertiary">
            EMAIL
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-ink-border bg-ink-surface px-4 font-sans text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            placeholder="you@example.com — .edu gets student pricing"
          />
          <p className="mt-1 font-sans text-[11px] text-text-tertiary">
            Use your .edu email to auto-qualify for $5.99 Student pricing.
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block font-mono text-[11px] font-medium tracking-label text-text-tertiary">
            PASSWORD
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-ink-border bg-ink-surface px-4 font-sans text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
          <p className="mt-1 font-sans text-[11px] text-text-tertiary">At least 8 characters.</p>
        </div>

        {error && (
          <p className="font-sans text-[13px] text-rose-400" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account..." : "Start free trial →"}
        </Button>

        <p className="text-center font-sans text-[11px] text-text-tertiary">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-accent">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-accent">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <div className="mt-8 border-t border-ink-border/40 pt-6 text-center">
        <p className="font-sans text-[14px] text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent transition-opacity hover:opacity-80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
