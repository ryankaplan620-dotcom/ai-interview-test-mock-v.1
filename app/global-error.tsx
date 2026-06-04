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
      <body className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <p className="font-sans text-[120px] font-bold leading-none tracking-[-0.04em] text-gray-900/[0.06]">
            Error
          </p>
          <h1 className="mt-2 font-sans text-[26px] font-semibold tracking-[-0.02em] text-gray-900">
            Something went wrong
          </h1>
          <p className="mt-3 max-w-md font-sans text-[15px] leading-relaxed text-gray-600">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="mt-8 inline-flex h-11 items-center rounded-xl bg-[#00DC82] px-6 font-sans text-[14px] font-semibold text-[#04140D] shadow-[0_10px_34px_-10px_rgba(0,220,130,0.45)] transition-all hover:bg-[#00C574]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
