"use client";

import { useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

export function WaitlistForm() {
  const [state, setState] = useState<FormState>("idle");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setState("loading");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setState("success");
      setEmail("");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
            <CheckIcon className="h-4 w-4 text-ink" />
          </div>
          <p className="font-display text-[18px] font-semibold text-text-primary">You&apos;re on the list.</p>
        </div>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-text-secondary">
          We&apos;ll email you when Folio is ready. Your first interview is on us.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row" aria-label="Join the waitlist">
      <label htmlFor="waitlist-email" className="sr-only">
        Email address
      </label>
      <input
        id="waitlist-email"
        type="email"
        required
        autoComplete="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === "loading"}
        className="h-12 flex-1 rounded-full border border-ink-border bg-ink-surface px-5 font-sans text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="h-12 rounded-full bg-cta-gradient px-8 font-sans text-[15px] font-semibold tracking-body text-text-onAccent transition-all duration-200 ease-brand hover:shadow-accent-glow-lg disabled:cursor-wait disabled:opacity-60"
      >
        {state === "loading" ? "Joining..." : "Join the waitlist →"}
      </button>

      {errorMsg && (
        <p className="w-full font-sans text-[13px] text-rose-400" role="alert">
          {errorMsg}
        </p>
      )}
    </form>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden>
      <path
        d="M5 10.5l3.5 3.5L15 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
