"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/db/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-2xl border border-ink-border bg-ink-surface p-8 sm:p-10">
        <h1 className="font-display text-[26px] font-bold tracking-heading text-text-primary">
          Choose a new password
        </h1>
        <p className="mt-2 font-sans text-[14px] text-text-secondary">
          Pick something you&rsquo;ll remember.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="reset-password"
              className="mb-2 block font-sans text-[13px] font-medium text-text-primary"
            >
              New password
            </label>
            <input
              id="reset-password"
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

          <div>
            <label
              htmlFor="reset-confirm"
              className="mb-2 block font-sans text-[13px] font-medium text-text-primary"
            >
              Confirm password
            </label>
            <input
              id="reset-confirm"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Same password again"
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
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center font-sans text-[13px] text-text-secondary">
        <Link href="/login" className="font-medium text-accent transition-opacity hover:opacity-80">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
