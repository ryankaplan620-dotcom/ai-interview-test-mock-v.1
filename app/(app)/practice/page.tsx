import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { DrillPicker } from "./prompt-picker";

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
        <h1 className="mt-2 font-display text-[32px] font-bold tracking-[-0.03em] text-text-primary sm:text-[40px]">
          Drill one thing until it&rsquo;s{" "}
          <span className="text-gradient-mint">automatic.</span>
        </h1>
        <p className="mt-3 max-w-[620px] font-sans text-[16px] leading-[1.55] text-text-secondary">
          Full interviews build range. Drills build reps. Pick a skill, run it until you stop thinking about it.
        </p>
      </header>

      {errorMessage && (
        <div className="mt-6 rounded-lg border border-rose-300/30 bg-rose-300/5 px-4 py-3">
          <p className="font-sans text-[13px] text-rose-300/90">{errorMessage}</p>
        </div>
      )}

      <section className="mt-10">
        <DrillPicker />
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
      return "We couldn't find that scenario. Try picking again.";
    case "unauthorized":
      return "You need to be signed in to start a drill.";
    default:
      return "Something went wrong starting the drill. Try again.";
  }
}
