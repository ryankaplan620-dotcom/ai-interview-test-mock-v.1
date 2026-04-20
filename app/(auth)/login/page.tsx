"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/db/client";
import { Button } from "@/components/Button";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div>
      <h1 className="font-display text-[32px] font-semibold tracking-heading text-text-primary">
        Welcome back.
      </h1>
      <p className="mt-2 font-sans text-[15px] text-text-secondary">Loading...</p>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function handlePasswordLogin(e: React.FormEvent) {
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

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  if (magicSent) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center">
        <h1 className="font-display text-[22px] font-semibold text-text-primary">Check your inbox.</h1>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-text-secondary">
          We sent a sign-in link to <span className="text-text-primary">{email}</span>. Click it to sign in.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[32px] font-semibold tracking-heading text-text-primary">
        Welcome back.
      </h1>
      <p className="mt-2 font-sans text-[15px] text-text-secondary">
        Sign in to continue practicing.
      </p>

      <form
        onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}
        className="mt-8 space-y-4"
      >
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
            placeholder="you@example.com"
          />
        </div>

        {mode === "password" && (
          <div>
            <label htmlFor="password" className="block font-mono text-[11px] font-medium tracking-label text-text-tertiary">
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-ink-border bg-ink-surface px-4 font-sans text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>
        )}

        {error && (
          <p className="font-sans text-[13px] text-rose-400" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in..." : mode === "password" ? "Sign in" : "Send magic link"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "password" ? "magic" : "password")}
        className="mt-4 w-full text-center font-sans text-[13px] text-text-secondary transition-colors hover:text-accent"
      >
        {mode === "password" ? "Prefer a magic link?" : "Use password instead"}
      </button>

      <div className="mt-8 border-t border-ink-border/40 pt-6 text-center">
        <p className="font-sans text-[14px] text-text-secondary">
          New to Folio?{" "}
          <Link href="/signup" className="font-medium text-accent transition-opacity hover:opacity-80">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
