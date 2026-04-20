"use client";

import { useState, useTransition } from "react";
import type { StoryPolishingPrompt } from "@/lib/practice/drills";
import { startDrill } from "./actions";
import { useRouter } from "next/navigation";

const CATEGORIES: Array<{ id: StoryPolishingPrompt["category"] | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "leadership", label: "Leadership" },
  { id: "conflict", label: "Conflict" },
  { id: "failure", label: "Failure" },
  { id: "achievement", label: "Achievement" },
  { id: "why", label: "Why" },
  { id: "weakness", label: "Weakness" },
];

export function PromptPicker({ prompts }: { prompts: StoryPolishingPrompt[] }) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] =
    useState<StoryPolishingPrompt["category"] | "all">("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered =
    activeCategory === "all" ? prompts : prompts.filter((p) => p.category === activeCategory);

  const handleStart = (promptId: string) => {
    setLoadingId(promptId);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await startDrill({
        drillType: "story_polishing",
        promptId,
      });
      if (!result.ok) {
        setLoadingId(null);
        setErrorMsg("Couldn't start drill — try again.");
        return;
      }
      router.push(`/practice/${result.drillId}`);
    });
  };

  return (
    <div>
      {/* Category filter */}
      <nav className="flex flex-wrap gap-2 border-b border-ink-border pb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={[
              "rounded-full px-3 py-1.5 font-mono text-[10px] font-medium tracking-label transition-all",
              activeCategory === cat.id
                ? "bg-accent text-ink"
                : "border border-ink-border bg-ink-surface text-text-secondary hover:border-accent/60",
            ].join(" ")}
          >
            {cat.label.toUpperCase()}
          </button>
        ))}
      </nav>

      {errorMsg && (
        <p className="mt-4 font-sans text-[13px] text-rose-300/90">{errorMsg}</p>
      )}

      {/* Prompt list */}
      <ul className="mt-4 flex flex-col gap-2">
        {filtered.map((prompt) => (
          <li key={prompt.id}>
            <button
              onClick={() => handleStart(prompt.id)}
              disabled={isPending}
              className={[
                "group w-full rounded-xl border border-ink-border bg-ink-surface p-5 text-left transition-all",
                "hover:border-accent/60 hover:bg-ink-raised",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                loadingId === prompt.id ? "border-accent/60" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] tracking-label text-text-tertiary">
                    {prompt.category.toUpperCase()}
                  </p>
                  <p className="mt-1 font-display text-[16px] font-medium text-text-primary">
                    {prompt.text}
                  </p>
                  <p className="mt-2 font-sans text-[12px] leading-[1.5] text-text-tertiary">
                    {prompt.whatItsLookingFor}
                  </p>
                </div>
                <div className="flex-shrink-0 pt-1">
                  {loadingId === prompt.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
                  ) : (
                    <span className="font-sans text-[13px] text-accent opacity-0 transition-opacity group-hover:opacity-100">
                      Start →
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
