"use client";

import { useState, useTransition } from "react";

interface MemoryCardProps {
  memory: {
    id: string;
    memory_text: string;
    category: string;
    confidence: number;
    surfaced_count: number;
    dismissed: boolean;
    created_at: string;
  };
}

/**
 * Single memory note card with a dismiss / restore toggle.
 *
 * Uses /api/memory/dismiss — a simple POST that flips the `dismissed` flag
 * on the row. RLS ensures the user can only act on their own memories.
 *
 * Optimistic UI: the visual state flips immediately on click; if the server
 * rejects the change, we revert and surface a small error line. In practice
 * the only reject path is auth (session expired) — RLS makes cross-user
 * tampering impossible.
 */
export function MemoryCard({ memory }: MemoryCardProps) {
  const [dismissed, setDismissed] = useState(memory.dismissed);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !dismissed;
    setDismissed(next); // optimistic
    setError(null);

    // startTransition expects a sync callback. We fire an async IIFE inside it
    // and handle the promise ourselves so the transition marker is set while
    // we're in flight.
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/memory/dismiss", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memoryId: memory.id, dismissed: next }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { error?: string } | null;
            setDismissed(!next); // revert
            setError(body?.error ?? "Couldn't save that change.");
          }
        } catch {
          setDismissed(!next);
          setError("Network error — try again.");
        }
      })();
    });
  };

  const confidenceLabel = ["", "tentative", "low", "moderate", "high", "very high"][memory.confidence];
  const formattedDate = new Date(memory.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={`rounded-lg border px-4 py-3.5 transition-opacity ${
        dismissed
          ? "border-ink-border/40 bg-ink-raised/30 opacity-60"
          : "border-ink-border bg-ink-raised"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p
            className={`font-sans text-[15px] leading-[1.55] ${
              dismissed ? "line-through text-text-tertiary" : "text-text-primary"
            }`}
          >
            "{memory.memory_text}"
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-label text-text-tertiary">
            <span>{memory.category.toUpperCase().replace(/_/g, " ")}</span>
            <span>·</span>
            <span className={`inline-flex items-center gap-1.5 ${dismissed ? "" : "text-accent"}`}>
              <span className="inline-flex items-center gap-[3px]" aria-hidden>
                {[1, 2, 3, 4, 5].map((step) => (
                  <span
                    key={step}
                    className={`h-1 w-1 rounded-full ${
                      step <= memory.confidence
                        ? dismissed
                          ? "bg-text-tertiary"
                          : "bg-accent"
                        : "bg-ink-border"
                    }`}
                  />
                ))}
              </span>
              {confidenceLabel.toUpperCase()} CONFIDENCE
            </span>
            <span>·</span>
            <span>{formattedDate}</span>
            {memory.surfaced_count > 0 && (
              <>
                <span>·</span>
                <span>SURFACED {memory.surfaced_count}×</span>
              </>
            )}
          </div>
          {error && (
            <p className="mt-2 font-sans text-[12px] text-rose-300/90">{error}</p>
          )}
        </div>
        <button
          onClick={toggle}
          disabled={pending}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 font-mono text-[10px] font-medium tracking-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
            dismissed
              ? "border border-ink-border bg-ink-surface text-text-secondary hover:border-accent hover:text-accent focus-visible:ring-accent"
              : "border border-rose-900/50 bg-transparent text-rose-400 hover:bg-rose-950 focus-visible:ring-rose-500"
          } ${pending ? "opacity-50" : ""}`}
        >
          {dismissed ? "RESTORE" : "DISMISS"}
        </button>
      </div>
    </div>
  );
}
