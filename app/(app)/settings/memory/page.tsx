import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { PERSONAS } from "@/lib/personas";
import { memorySurfaceEnabled } from "@/lib/pipeline/memory";
import type { PersonaId } from "@/types/supabase";
import { MemoryCard } from "./memory-card";

// --------------------------------------------------------------------------
// /settings/memory
//
// Shows the user what each interviewer remembers about them across sessions.
// Each memory has a dismiss action; dismissed memories are excluded from
// future sessions but retained for audit (and can be restored).
//
// Layout: one section per persona that has at least one memory. Empty state
// is a single panel explaining how memory works and linking to /session/new.
// --------------------------------------------------------------------------

export const dynamic = "force-dynamic";

interface MemoryRow {
  id: string;
  persona: PersonaId;
  memory_text: string;
  category: string;
  confidence: number;
  surfaced_count: number;
  dismissed: boolean;
  created_at: string;
  source_session_id: string | null;
}

export default async function MemorySettingsPage() {
  const user = await requireUser();

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("user_session_memory") as any)
    .select(
      "id, persona, memory_text, category, confidence, surfaced_count, dismissed, created_at, source_session_id",
    )
    .eq("user_id", user.id)
    .order("dismissed", { ascending: true })
    .order("created_at", { ascending: false });

  const memories = (data ?? []) as MemoryRow[];
  const surfaceEnabled = memorySurfaceEnabled();

  // Group by persona for display
  const byPersona = new Map<PersonaId, MemoryRow[]>();
  for (const m of memories) {
    const list = byPersona.get(m.persona) ?? [];
    list.push(m);
    byPersona.set(m.persona, list);
  }

  const personaOrder: PersonaId[] = ["sarah", "gemma"];
  const personaVersions: Partial<Record<PersonaId, string>> = { sarah: "v.2", gemma: "v.3" };

  return (
    <div className="mx-auto max-w-[840px] px-6 py-12 sm:px-10">
      <div className="mb-3">
        <Link
          href="/settings"
          className="font-mono text-[11px] tracking-label text-text-tertiary hover:text-text-secondary"
        >
          ← SETTINGS
        </Link>
      </div>
      <div className="mb-10">
        <span className="font-mono text-[11px] font-medium tracking-label text-accent">MEMORY</span>
        <h1 className="mt-3 font-display text-[32px] font-bold tracking-[-0.03em] text-text-primary">
          What your interviewers remember
        </h1>
        <p className="mt-3 max-w-[600px] font-sans text-[15px] leading-[1.55] text-text-secondary">
          After each session, each interviewer takes a few private notes about your performance. These
          notes are pulled back in when you practice with the same interviewer again, so the next
          session builds on the last one instead of starting from zero.
        </p>
        {!surfaceEnabled && (
          <div className="mt-5 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3">
            <p className="font-sans text-[13px] text-amber-300/90">
              Memory surfacing is currently paused globally. Notes are still being captured, but they
              aren't being shown to interviewers in new sessions yet.
            </p>
          </div>
        )}
      </div>

      {memories.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {personaOrder.map((pid) => {
            const list = byPersona.get(pid);
            if (!list || list.length === 0) return null;
            const persona = PERSONAS[pid];
            return (
              <PersonaSection
                key={pid}
                personaId={pid}
                personaVersion={personaVersions[pid]}
                personaName={persona.name}
                personaFirm={persona.firm}
                personaTitle={persona.title}
                memories={list}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonaSection({
  personaId,
  personaVersion,
  personaName,
  personaFirm,
  personaTitle,
  memories,
}: {
  personaId: PersonaId;
  personaVersion?: string;
  personaName: string;
  personaFirm: string;
  personaTitle: string;
  memories: MemoryRow[];
}) {
  const active = memories.filter((m) => !m.dismissed);
  const dismissed = memories.filter((m) => m.dismissed);

  return (
    <div className="rounded-xl border border-ink-border bg-ink-surface p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-ink-border">
            <Image
              src={`/images/agents/${personaId}.png`}
              alt={personaName}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-[18px] font-bold tracking-[-0.01em] text-text-primary">
                {personaName}
              </h2>
              {personaVersion && (
                <span className="font-mono text-[10.5px] text-accent">{personaVersion}</span>
              )}
            </div>
            <p className="mt-1 font-sans text-[12px] text-text-tertiary">
              {personaTitle} · {personaFirm}
            </p>
          </div>
        </div>
        <span className="flex-shrink-0 font-mono text-[11px] tracking-label text-text-tertiary">
          {active.length} ACTIVE
        </span>
      </div>

      {active.length === 0 ? (
        <p className="font-sans text-[13px] italic text-text-tertiary">
          No active notes. All notes from this interviewer have been dismissed.
        </p>
      ) : (
        <div className="space-y-3">
          {active.map((m) => (
            <MemoryCard key={m.id} memory={m} />
          ))}
        </div>
      )}

      {dismissed.length > 0 && (
        <details className="mt-6 border-t border-ink-border/40 pt-5">
          <summary className="cursor-pointer font-mono text-[11px] tracking-label text-text-tertiary hover:text-text-secondary">
            SHOW {dismissed.length} DISMISSED
          </summary>
          <div className="mt-4 space-y-3">
            {dismissed.map((m) => (
              <MemoryCard key={m.id} memory={m} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-dark p-10 text-center">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[100px]"
        aria-hidden
      />
      <p className="relative font-mono text-[11px] tracking-label text-accent">NOTHING YET</p>
      <h2 className="relative mt-3 font-display text-[22px] font-bold tracking-[-0.02em] text-text-primary">
        No memories have been saved yet.
      </h2>
      <p className="relative mx-auto mt-3 max-w-[480px] font-sans text-[14px] leading-relaxed text-text-secondary">
        After your next completed session, each interviewer will take 1 to 3 private notes. You'll see
        those notes here, and they'll be referenced naturally when you practice with the same
        interviewer again.
      </p>
      <Link
        href="/session/new"
        className="relative mt-6 inline-block rounded-full bg-cta-gradient px-6 py-2.5 font-sans text-[14px] font-semibold text-text-onAccent transition-all hover:shadow-accent-glow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
      >
        Start a session
      </Link>
    </div>
  );
}
