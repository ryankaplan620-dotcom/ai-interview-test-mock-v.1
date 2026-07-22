"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { endSessionAndRedirect } from "./actions";

/**
 * Error boundary for the live interview room.
 *
 * When something goes wrong mid-session — Tavus WebRTC failure, network drop
 * during transcript streaming, unhandled JS error in the conversation state
 * machine — Next.js mounts this file in place of the session view.
 *
 * The user-facing goal is straightforward: do NOT leave them staring at a
 * broken screen with no way out. They need to know:
 *
 *   1. The session ended (we can't recover WebRTC state from a hard error)
 *   2. Their payment was not charged (reassurance — the most common fear
 *      when a live session breaks is 'did I just lose a session credit?')
 *   3. They can go back to the dashboard in one click
 *
 * Mechanical goal: mark the session row as `abandoned` so cycle accounting
 * stays accurate. Without this, a crashed session shows as `in_progress`
 * forever and throws off the session-count counter.
 *
 * Design notes:
 *   - We call `endSessionAndRedirect` via a server action. If THAT throws too
 *     (e.g., the DB is the thing that was broken), we degrade gracefully
 *     by just linking the user to /dashboard manually.
 *   - We intentionally do NOT show the underlying error message to the user.
 *     The digest is what you need in the Vercel logs; users just need to
 *     know it broke and they're safe.
 *   - We log the full error to console on mount so it shows up in browser
 *     devtools and any error-tracking integration (Sentry/PostHog) can
 *     capture it.
 */
export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id;
  const [isPending, startTransition] = useTransition();
  const [endFailed, setEndFailed] = useState(false);

  // Log the full error for browser devtools + any error tracker
  useEffect(() => {
    console.error("[session/error] Live-session error:", error);
    if (error.digest) {
      console.error("[session/error] Digest:", error.digest);
    }
  }, [error]);

  const handleEndAndExit = () => {
    if (!sessionId) {
      // URL parse failed somehow — just go to dashboard
      window.location.href = "/dashboard";
      return;
    }

    startTransition(() => {
      (async () => {
        try {
          await endSessionAndRedirect(sessionId, "abandoned");
        } catch (err) {
          // Server action threw — DB may be down. Fall back to a client-side
          // redirect so the user isn't stranded.
          console.error("[session/error] endSessionAndRedirect failed:", err);
          setEndFailed(true);
        }
      })();
    });
  };

  return (
    <div className="relative min-h-screen bg-gradient-dark">
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-[540px] rounded-2xl border border-white/[0.08] bg-ink/70 p-10 backdrop-blur-md">
        <p className="font-mono text-[11px] font-medium tracking-label text-accent">
          SESSION INTERRUPTED
        </p>
        <h1 className="mt-3 font-display text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-text-primary">
          The interview couldn't continue.
        </h1>
        <p className="mt-5 font-sans text-[15px] leading-relaxed text-text-secondary">
          Something went wrong on our end and we had to stop the session. You
          haven't been charged — this session doesn't count against your cycle.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] tracking-label text-text-tertiary">
            Reference: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={handleEndAndExit}
            disabled={isPending}
            className="inline-flex h-11 items-center rounded-full bg-cta-gradient px-5 font-sans text-[14px] font-semibold text-text-onAccent transition-all duration-200 ease-brand hover:shadow-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cosmos disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Exiting…" : "Back to dashboard"}
          </button>
          <button
            onClick={() => reset()}
            disabled={isPending}
            className="inline-flex h-11 items-center rounded-full border border-white/[0.12] bg-white/[0.04] px-5 font-sans text-[14px] font-medium text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cosmos disabled:opacity-60"
          >
            Try again
          </button>
        </div>

        {endFailed && (
          <div className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/5 p-4">
            <p className="font-sans text-[13px] leading-relaxed text-amber-300/90">
              We couldn't close out the session automatically. You can still
              head back to the{" "}
              <Link href="/dashboard" className="underline hover:text-amber-200">
                dashboard
              </Link>{" "}
              — if this session ends up counted incorrectly, email{" "}
              <a
                href="mailto:support@prepspace.example"
                className="underline hover:text-amber-200"
              >
                support@prepspace.example
              </a>{" "}
              and we'll fix it.
            </p>
          </div>
        )}

        <p className="mt-8 font-sans text-[12.5px] leading-relaxed text-text-tertiary">
          If this keeps happening, it's not you. Email{" "}
          <a
            href="mailto:support@prepspace.example"
            className="text-accent hover:underline"
          >
            support@prepspace.example
          </a>{" "}
          and we'll take a look.
        </p>
      </div>
      </div>
    </div>
  );
}
