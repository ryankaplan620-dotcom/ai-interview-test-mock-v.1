"use client";

import { useEffect, useState } from "react";
import {
  readConsent,
  writeConsent,
  type CookieConsentState,
} from "@/lib/legal/cookie-consent";

/**
 * In-page controls for the cookie policy. Shows the current state and lets
 * the user change it directly from the policy page rather than having to
 * wait for the banner to reappear.
 */
export function CookieControls() {
  const [state, setState] = useState<CookieConsentState>("unset");

  useEffect(() => {
    setState(readConsent());
  }, []);

  const apply = (next: CookieConsentState) => {
    writeConsent(next);
    setState(next);
    // Some analytics providers need to be torn down on de-consent.
    // PostHog: check for window.posthog and call opt_out_capturing() if so.
    // We intentionally don't import posthog here — this keeps the legal
    // pages free of analytics-provider dependencies. The banner / app
    // provider handles the init/teardown based on state.
    if (typeof window !== "undefined") {
      const posthog = (window as unknown as { posthog?: { opt_out_capturing?: () => void; opt_in_capturing?: () => void } }).posthog;
      if (posthog) {
        if (next === "accepted" && typeof posthog.opt_in_capturing === "function") {
          posthog.opt_in_capturing();
        } else if (next !== "accepted" && typeof posthog.opt_out_capturing === "function") {
          posthog.opt_out_capturing();
        }
      }
    }
  };

  return (
    <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] font-medium tracking-label text-accent">
          YOUR CURRENT CHOICE
        </p>
        <p className="font-mono text-[11px] tracking-label text-text-tertiary">
          {state === "unset"
            ? "NOT YET SET"
            : state === "accepted"
              ? "ANALYTICS ACCEPTED"
              : "ONLY NECESSARY"}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => apply("accepted")}
          disabled={state === "accepted"}
          className={`rounded-full border px-4 py-2 font-sans text-[13px] font-medium transition-colors ${
            state === "accepted"
              ? "border-accent bg-accent/10 text-accent cursor-default"
              : "border-ink-border bg-ink-raised text-text-primary hover:border-accent hover:text-accent"
          }`}
        >
          Accept analytics
        </button>
        <button
          onClick={() => apply("dismissed")}
          disabled={state === "dismissed"}
          className={`rounded-full border px-4 py-2 font-sans text-[13px] font-medium transition-colors ${
            state === "dismissed"
              ? "border-ink-border bg-ink-raised text-text-secondary cursor-default"
              : "border-ink-border bg-ink-raised text-text-primary hover:border-accent hover:text-accent"
          }`}
        >
          Only necessary
        </button>
      </div>
    </div>
  );
}
