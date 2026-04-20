import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { DRILL_TYPES, STORY_POLISHING_PROMPTS } from "@/lib/practice/drills";
import { PromptPicker } from "./prompt-picker";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { error?: string };
}

export default async function PracticePage({ searchParams }: PageProps) {
  await requireUser();

  const errorMessage = searchParams.error
    ? describeError(searchParams.error)
    : null;

  return (
    <div className="mx-auto max-w-[960px] px-6 py-12 sm:px-10">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="font-sans text-[12px] text-text-tertiary transition-colors hover:text-text-secondary"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Header */}
      <header>
        <p className="font-mono text-[11px] tracking-label text-accent">PRACTICE</p>
        <h1 className="mt-2 font-display text-[32px] font-semibold tracking-heading text-text-primary sm:text-[40px]">
          Drill one thing until it's automatic.
        </h1>
        <p className="mt-3 max-w-[620px] font-serif text-[17px] italic leading-[1.55] text-text-secondary">
          Full interviews build range. Drills build reps. Pick a skill, run it until you stop thinking about it.
        </p>
      </header>

      {errorMessage && (
        <div className="mt-6 rounded-lg border border-rose-300/30 bg-rose-300/5 px-4 py-3">
          <p className="font-sans text-[13px] text-rose-300/90">{errorMessage}</p>
        </div>
      )}

      {/* Drill-type tiles */}
      <section className="mt-10">
        <p className="font-mono text-[10px] tracking-label text-text-tertiary">PICK A DRILL</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Object.values(DRILL_TYPES).map((drill) => (
            <div
              key={drill.id}
              className={[
                "rounded-2xl border p-6 transition-all",
                drill.available
                  ? "border-ink-border bg-ink-surface hover:border-accent/60"
                  : "border-ink-border/40 bg-ink-surface/40 opacity-60",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-[18px] font-semibold text-text-primary">
                    {drill.name}
                  </p>
                  <p className="mt-1 font-serif text-[14px] italic text-text-secondary">
                    {drill.tagline}
                  </p>
                </div>
                {!drill.available && (
                  <span className="flex-shrink-0 rounded-full border border-ink-border bg-ink-raised/40 px-2.5 py-1 font-mono text-[10px] tracking-label text-text-tertiary">
                    SOON
                  </span>
                )}
              </div>
              <p className="mt-4 font-sans text-[13px] leading-[1.55] text-text-secondary">
                {drill.description}
              </p>
              <p className="mt-4 font-mono text-[10px] tracking-label text-text-tertiary">
                {drill.targetAttempts} {drill.targetAttempts === 1 ? "ATTEMPT" : "ATTEMPTS"} · {" "}
                {Math.floor(drill.maxAttemptSeconds / 60)}
                {drill.maxAttemptSeconds % 60 > 0 ? `:${(drill.maxAttemptSeconds % 60).toString().padStart(2, "0")}` : " MIN"} MAX
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Story polishing prompt picker — the only available drill in MVP */}
      <section className="mt-12">
        <p className="font-mono text-[10px] tracking-label text-text-tertiary">
          PICK A QUESTION TO POLISH
        </p>
        <p className="mt-2 font-sans text-[13px] text-text-secondary">
          You'll answer this question five times in a row, with feedback between each rep.
        </p>
        <div className="mt-6">
          <PromptPicker prompts={STORY_POLISHING_PROMPTS} />
        </div>
      </section>
    </div>
  );
}

function describeError(code: string): string {
  switch (code) {
    case "drill_type_not_available":
      return "That drill isn't ready yet — it's coming in a future update.";
    case "drill_type_not_implemented":
      return "That drill isn't ready yet.";
    case "unknown_prompt":
      return "We couldn't find that question. Try picking again.";
    case "unauthorized":
      return "You need to be signed in to start a drill.";
    default:
      return "Something went wrong starting the drill. Try again.";
  }
}
