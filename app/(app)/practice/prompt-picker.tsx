"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DRILL_TYPES,
  PITCH_60S_PROMPTS,
  PUSHBACK_PROMPTS,
  type DrillTypeConfig,
  type Pitch60sPrompt,
  type PushbackPrompt,
} from "@/lib/practice/drills";
import type { DrillType } from "@/types/supabase";
import { startDrill } from "./actions";

type AvailableDrillType = Extract<DrillType, "pitch_60s" | "pushback_drill">;

const AVAILABLE_DRILLS: AvailableDrillType[] = ["pitch_60s", "pushback_drill"];

export function DrillPicker() {
  const router = useRouter();
  const [activeDrill, setActiveDrill] = useState<AvailableDrillType>("pitch_60s");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStart = (promptId: string) => {
    setLoadingId(promptId);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await startDrill({ drillType: activeDrill, promptId });
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
      {/* Drill-type tabs */}
      <div role="tablist" className="grid gap-3 sm:grid-cols-2">
        {AVAILABLE_DRILLS.map((type) => {
          const cfg = DRILL_TYPES[type];
          const isActive = type === activeDrill;
          return (
            <button
              key={type}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveDrill(type)}
              className={[
                "rounded-2xl border p-5 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                isActive
                  ? "border-accent/70 bg-ink-raised shadow-accent-glow"
                  : "border-ink-border bg-ink-surface hover:border-accent/50",
              ].join(" ")}
            >
              <p
                className={[
                  "font-mono text-[9px] tracking-label",
                  isActive ? "text-accent" : "text-text-tertiary",
                ].join(" ")}
              >
                {type.toUpperCase()}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="font-display text-[17px] font-bold tracking-[-0.03em] text-text-primary">
                  {cfg.name}
                </p>
                <ConfigBadge cfg={cfg} />
              </div>
              <p className="mt-1 font-sans text-[13px] text-text-secondary">
                {cfg.tagline}
              </p>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <p className="mt-4 font-sans text-[13px] text-rose-300/90">{errorMsg}</p>
      )}

      <p className="mt-8 font-mono text-[10px] tracking-label text-text-tertiary">
        {activeDrill === "pitch_60s" ? "PICK A PITCH PROMPT" : "PICK A PUSHBACK SCENARIO"}
      </p>
      <p className="mt-2 font-sans text-[13px] leading-[1.55] text-text-secondary">
        {activeDrill === "pitch_60s"
          ? "One shot, sixty seconds. Pick the framing you'd actually hear in your target interview."
          : "Each scenario gives you an opening question and the pushback line you'll receive. You'll deliver both in one recording."}
      </p>

      <div className="mt-5">
        {activeDrill === "pitch_60s" ? (
          <PitchPromptList
            prompts={PITCH_60S_PROMPTS}
            loadingId={loadingId}
            isPending={isPending}
            onStart={handleStart}
          />
        ) : (
          <PushbackPromptList
            prompts={PUSHBACK_PROMPTS}
            loadingId={loadingId}
            isPending={isPending}
            onStart={handleStart}
          />
        )}
      </div>
    </div>
  );
}

function ConfigBadge({ cfg }: { cfg: DrillTypeConfig }) {
  const minutes = Math.floor(cfg.maxAttemptSeconds / 60);
  const seconds = cfg.maxAttemptSeconds % 60;
  const time = seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${minutes} MIN`;
  return (
    <span className="rounded-full border border-ink-border bg-ink-raised/60 px-2.5 py-1 font-mono text-[9px] tracking-label text-text-tertiary">
      {time} MAX
    </span>
  );
}

interface PromptListProps<T> {
  prompts: T[];
  loadingId: string | null;
  isPending: boolean;
  onStart: (id: string) => void;
}

function PitchPromptList({ prompts, loadingId, isPending, onStart }: PromptListProps<Pitch60sPrompt>) {
  return (
    <ul className="flex flex-col gap-2">
      {prompts.map((p) => (
        <li key={p.id}>
          <PromptCard
            id={p.id}
            category={p.category}
            title={p.text}
            guidance={p.whatItsLookingFor}
            loading={loadingId === p.id}
            disabled={isPending}
            onStart={onStart}
          />
        </li>
      ))}
    </ul>
  );
}

function PushbackPromptList({ prompts, loadingId, isPending, onStart }: PromptListProps<PushbackPrompt>) {
  return (
    <ul className="flex flex-col gap-2">
      {prompts.map((p) => (
        <li key={p.id}>
          <PromptCard
            id={p.id}
            category={p.category}
            title={p.initial}
            pushback={p.pushback}
            guidance={p.whatItsLookingFor}
            loading={loadingId === p.id}
            disabled={isPending}
            onStart={onStart}
          />
        </li>
      ))}
    </ul>
  );
}

interface PromptCardProps {
  id: string;
  category: string;
  title: string;
  pushback?: string;
  guidance: string;
  loading: boolean;
  disabled: boolean;
  onStart: (id: string) => void;
}

function PromptCard({ id, category, title, pushback, guidance, loading, disabled, onStart }: PromptCardProps) {
  return (
    <button
      onClick={() => onStart(id)}
      disabled={disabled}
      className={[
        "group w-full rounded-xl border border-ink-border bg-ink-surface p-5 text-left transition-all",
        "hover:border-accent/60 hover:bg-ink-raised",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        loading ? "border-accent/60" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-label text-text-tertiary">
            {category.toUpperCase()}
          </p>
          <p className="mt-1 font-display text-[16px] font-medium leading-[1.4] text-text-primary">
            {title}
          </p>
          {pushback && (
            <p className="mt-2 font-sans text-[13px] italic leading-[1.5] text-amber-300/90">
              → &ldquo;{pushback}&rdquo;
            </p>
          )}
          <p className="mt-3 font-sans text-[12px] leading-[1.5] text-text-tertiary">
            {guidance}
          </p>
        </div>
        <div className="flex-shrink-0 pt-1">
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
          ) : (
            <span className="font-sans text-[13px] text-accent opacity-0 transition-opacity group-hover:opacity-100">
              Start →
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
