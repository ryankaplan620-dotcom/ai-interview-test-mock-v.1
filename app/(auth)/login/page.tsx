"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/db/client";
import { FolioMark } from "@/components/FolioMark";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-[380px] text-center">
        <FolioMark className="mx-auto h-8 w-8" color="#00F590" />
        <p className="mt-6 font-sans text-[15px] text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <FolioMark className="h-8 w-8" color="#00F590" />
          <span className="font-display text-xl font-semibold tracking-[-0.025em] text-text-primary">
            Folio
          </span>
        </div>

        {/* Card */}
        <div className="mt-10 rounded-2xl border border-ink-border bg-ink-surface p-8">
          <h1 className="font-display text-[24px] font-semibold tracking-heading text-text-primary">
            Welcome back
          </h1>
          <p className="mt-1.5 font-sans text-[14px] text-text-secondary">
            Pick up where you left off.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-lg border border-ink-border bg-ink px-4 font-sans text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />

            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-11 w-full rounded-lg border border-ink-border bg-ink px-4 font-sans text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />

            {error && (
              <p className="font-sans text-[13px] text-rose-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-lg bg-cta-gradient font-sans text-[14px] font-semibold text-text-onAccent transition-all duration-200 ease-brand hover:shadow-accent-glow disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center font-sans text-[13px] text-text-secondary">
            Need an account?{" "}
            <Link href="/signup" className="font-medium text-accent transition-opacity hover:opacity-80">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
