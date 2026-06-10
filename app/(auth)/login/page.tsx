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
    <div className="w-full max-w-[400px] text-center">
      <FolioMark className="mx-auto h-8 w-8" color="#63D88A" />
      <p className="mt-6 font-sans text-[15px] text-text-secondary">Loading...</p>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") ?? "";
  // Only allow local paths (must start with /) to prevent open redirect
  const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";

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
    <div className="w-full max-w-[400px]">
      <div className="rounded-2xl border border-ink-border bg-ink-surface p-8 sm:p-10">
        <h1 className="font-display text-[26px] font-bold tracking-heading text-text-primary">
          Welcome back
        </h1>
        <p className="mt-2 font-sans text-[14px] text-text-secondary">
          Pick up where you left off.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block font-sans text-[13px] font-medium text-text-primary"
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl border border-ink-border bg-ink px-4 font-sans text-[14px] text-text-primary transition-colors duration-200 placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block font-sans text-[13px] font-medium text-text-primary"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center font-sans text-[13px] text-text-secondary">
        Need an account?{" "}
        <Link href="/signup" className="font-medium text-accent transition-opacity hover:opacity-80">
          Sign up
        </Link>
      </p>
    </div>
  );
}
