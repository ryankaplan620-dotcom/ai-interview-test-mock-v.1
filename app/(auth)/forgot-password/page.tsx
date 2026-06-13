"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/db/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-accent/30 bg-ink-surface p-8 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00F590" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h1 className="mt-6 font-display text-[24px] font-bold tracking-heading text-text-primary">
            Check your inbox
          </h1>
          <p className="mt-3 font-sans text-[15px] leading-relaxed text-text-secondary">
            We sent a reset link to{" "}
            <span className="font-medium text-text-primary">{email}</span>. Click it to
            choose a new password.
          </p>
          <p className="mt-4 font-sans text-[12px] text-text-tertiary">
            The link expires in 1 hour. Check your spam folder if you don&rsquo;t see it.
          </p>
        </div>
        <p className="mt-6 text-center font-sans text-[13px] text-text-secondary">
          <Link href="/login" className="font-medium text-accent transition-opacity hover:opacity-80">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-2xl border border-ink-border bg-ink-surface p-8 sm:p-10">
        <h1 className="font-display text-[26px] font-bold tracking-heading text-text-primary">
          Reset your password
        </h1>
        <p className="mt-2 font-sans text-[14px] text-text-secondary">
          Enter your email and we&rsquo;ll send a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-2 block font-sans text-[13px] font-medium text-text-primary"
            >
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center font-sans text-[13px] text-text-secondary">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-accent transition-opacity hover:opacity-80">
          Sign in
        </Link>
      </p>
    </div>
  );
}
