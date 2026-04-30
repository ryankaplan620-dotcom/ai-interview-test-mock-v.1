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
      <body className="flex min-h-screen items-center justify-center bg-[#0D1117] px-6 text-center">
        <div>
          <p className="font-sans text-[120px] font-bold leading-none text-[#00F590]/20">Error</p>
          <h1 className="mt-4 font-sans text-2xl font-semibold text-[#F0F6FC]">
            Something went wrong
          </h1>
          <p className="mt-3 max-w-md font-sans text-[15px] text-[#A8B0BA]">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="mt-8 inline-flex h-11 items-center rounded-full bg-[#00F590] px-6 font-sans text-[14px] font-semibold text-[#0D1117] transition-all hover:brightness-110"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
