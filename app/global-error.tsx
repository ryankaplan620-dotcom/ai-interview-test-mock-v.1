"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
        <div>
          <p className="font-display text-[120px] font-bold leading-none tracking-[-0.04em] text-gray-900/[0.06]">
            Error
          </p>
          <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.03em] text-gray-900">
            Something went wrong
          </h1>
          <p className="mt-3 max-w-md font-sans text-[15px] leading-relaxed text-gray-600">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="mt-8 inline-flex h-11 items-center rounded-xl bg-brand px-6 font-sans text-[14px] font-semibold text-brand-ink shadow-brand-glow transition-all hover:bg-brand-600"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
