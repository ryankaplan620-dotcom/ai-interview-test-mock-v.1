"use client";

import { useState } from "react";
import Link from "next/link";

type VerifyResult =
  | { mode: "sheerid"; redirectUrl: string }
  | { mode: "edu_email"; status: "sent" | "already_verified" }
  | { error: string };

export function VerifyStudentClient({ alreadyVerified }: { alreadyVerified: boolean }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function onStart() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/verify-student", { method: "POST" });
      const data: VerifyResult = await res.json();
      if (!res.ok || "error" in data) {
        setResult({ error: "error" in data ? data.error : "Verification failed. Please try again." });
        return;
      }
      if (data.mode === "sheerid") {
        window.location.href = data.redirectUrl;
        return;
      }
      setResult(data);
    } catch {
      setResult({ error: "Verification failed. Please try again." });
    } finally {
      setPending(false);
    }
  }

  if (alreadyVerified) {
    return (
      <div>
        <p className="font-sans text-[14px] leading-relaxed text-text-secondary">
          You&apos;re verified as a student. The Basic plan is available to you.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex h-9 items-center rounded-full border border-ink-border bg-ink-raised px-4 font-sans text-[13px] font-medium text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          Back to pricing →
        </Link>
      </div>
    );
  }

  if (result && "mode" in result && result.mode === "edu_email") {
    return (
      <div>
        {result.status === "already_verified" ? (
          <p className="font-sans text-[14px] leading-relaxed text-text-secondary">
            Your account email already qualifies — you&apos;re verified. Refresh the pricing page to
            continue.
          </p>
        ) : (
          <p className="font-sans text-[14px] leading-relaxed text-text-secondary">
            Verification request received. If your account email ends in .edu, .ac.uk, or .edu.au,
            it&apos;s verified automatically — refresh this page in a moment. Otherwise, email{" "}
            <a href="mailto:support@folio.io" className="text-accent hover:underline">
              support@folio.io
            </a>{" "}
            with proof of enrollment and we&apos;ll verify you manually.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="font-sans text-[14px] leading-relaxed text-text-secondary">
        Click below to start verification. You may be redirected to our verification partner to
        confirm your enrollment.
      </p>
      {result && "error" in result && (
        <p className="mt-3 font-sans text-[13px] text-red-400" role="alert">
          {result.error}
        </p>
      )}
      <button
        type="button"
        onClick={onStart}
        disabled={pending}
        className="mt-4 rounded-full bg-cta-gradient px-6 py-2.5 font-sans text-[13px] font-semibold text-brand-ink shadow-accent-glow transition-all duration-200 ease-brand hover:shadow-accent-glow-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Starting..." : "Start verification"}
      </button>
    </div>
  );
}
