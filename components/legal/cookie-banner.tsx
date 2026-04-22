"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readConsent,
  writeConsent,
} from "@/lib/legal/cookie-consent";

/**
 * Cookie-consent banner. Appears pinned to the bottom of the viewport until
 * the user has made a choice. After the user accepts or dismisses, it does
 * not reappear for a year (or until they revisit /legal/cookies and change
 * the preference explicitly).
 *
 * To mount: import and place in the root layout (or wherever the app layout
 * wraps content). Server-renders an empty div, hydrates to the banner on
 * the client when consent is "unset".
 *
 * Intentionally simple — no animation libraries, no focus trap, no backdrop.
 * This is legal-compliance furniture, not a product feature. The less
 * attention it demands, the better.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === "unset");
  }, []);

  if (!visible) return null;

  const choose = (state: "accepted" | "dismissed") => {
    writeConsent(state);
    setVisible(false);
    // Opt in/out of posthog if loaded
    if (typeof window !== "undefined") {
      const posthog = (window as unknown as {
        posthog?: { opt_out_capturing?: () => void; opt_in_capturing?: () => void };
      }).posthog;
      if (posthog) {
        if (state === "accepted" && typeof posthog.opt_in_capturing === "function") {
          posthog.opt_in_capturing();
        } else if (state !== "accepted" && typeof posthog.opt_out_capturing === "function") {
          posthog.opt_out_capturing();
        }
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-border bg-ink/95 backdrop-blur-md shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <p className="font-sans text-[13px] leading-relaxed text-text-secondary">
          We use cookies strictly required to keep you signed in. If you accept, we also use
          analytics cookies to understand which features people use. We don't run ads, and we
          don't share analytics data with anyone.{" "}
          <Link href="/legal/cookies" className="text-accent hover:underline">
            Details
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={() => choose("dismissed")}
            className="rounded-full border border-ink-border bg-ink-surface px-4 py-2 font-sans text-[13px] font-medium text-text-primary transition-colors hover:border-accent hover:text-accent"
          >
            Only necessary
          </button>
          <button
            onClick={() => choose("accepted")}
            className="rounded-full bg-accent px-4 py-2 font-sans text-[13px] font-semibold text-ink transition-colors hover:bg-accent-light"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
