export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServerClient } from "@/lib/db/server";
import { requireUser } from "@/lib/auth/server";
import { LinkButton } from "@/components/Button";
import { SessionRow, type SessionRowData } from "@/components/SessionRow";
import type { SessionStatus, PersonaId, InterviewType } from "@/types/supabase";

interface SessionWithFeedbackRaw {
  id: string;
  persona: PersonaId;
  interview_type: InterviewType;
  target_firm: string | null;
  status: SessionStatus;
  started_at: string | null;
  actual_duration_seconds: number | null;
  session_feedback: Array<{ overall_score: number | null }> | null;
}

const PAGE_SIZE = 25;

interface PageProps {
  searchParams: Promise<{ page?: string; filter?: string }>;
}

export default async function SessionsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const supabase = await createServerClient();

  const pageNum = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const filter = searchParams.filter ?? "all";
  const offset = (pageNum - 1) * PAGE_SIZE;

  // Build query with optional status filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("sessions") as any)
    .select(
      `id, persona, interview_type, target_firm, status, started_at, actual_duration_seconds,
       session_feedback ( overall_score )`,
      { count: "exact" },
    )
    .eq("user_id", user.id);

  if (filter === "completed") query = query.eq("status", "completed");
  else if (filter === "incomplete")
    query = query.in("status", ["abandoned", "failed", "in_progress"]);

  const { data: sessionsRaw, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const sessions: SessionRowData[] = ((sessionsRaw ?? []) as SessionWithFeedbackRaw[]).map((s) => ({
    id: s.id,
    persona: s.persona,
    interview_type: s.interview_type,
    target_firm: s.target_firm,
    status: s.status,
    started_at: s.started_at,
    actual_duration_seconds: s.actual_duration_seconds,
    overallScore: s.session_feedback?.[0]?.overall_score ?? null,
  }));

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = pageNum > 1;
  const hasNext = pageNum < totalPages;

  return (
    <div className="mx-auto max-w-[960px] px-6 py-12 sm:px-10">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="rounded-full font-sans text-[12px] text-text-tertiary transition-colors hover:text-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-medium tracking-label text-accent">
            ALL SESSIONS
          </p>
          <h1 className="mt-2 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary sm:text-[40px]">
            <span className="text-gradient-mint tabular-nums">{totalCount}</span> session
            {totalCount === 1 ? "" : "s"}
          </h1>
        </div>
        <LinkButton href="/session/new" size="md">
          Start another →
        </LinkButton>
      </header>

      {/* Filter tabs */}
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filter sessions">
        <FilterTab href="/sessions" label="All" active={filter === "all"} />
        <FilterTab href="/sessions?filter=completed" label="Completed" active={filter === "completed"} />
        <FilterTab
          href="/sessions?filter=incomplete"
          label="Incomplete"
          active={filter === "incomplete"}
        />
      </nav>

      {/* Session list */}
      {sessions.length > 0 ? (
        <ul className="divide-y divide-white/[0.08] overflow-hidden rounded-2xl border border-ink-border">
          {sessions.map((session) => (
            <li key={session.id}>
              <SessionRow session={session} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-dark p-12 text-center">
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <p className="mx-auto max-w-sm font-sans text-[14px] leading-relaxed text-text-secondary">
              {filter === "completed"
                ? "No completed sessions yet. Finish one and it'll show up here."
                : filter === "incomplete"
                  ? "No incomplete sessions. Nice."
                  : "No sessions yet."}
            </p>
            <LinkButton href="/session/new" size="sm" className="mt-5">
              Start a session →
            </LinkButton>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <PaginationLink
            href={`/sessions?page=${pageNum - 1}${filter !== "all" ? `&filter=${filter}` : ""}`}
            enabled={hasPrev}
          >
            ← Previous
          </PaginationLink>
          <p className="font-mono text-[11px] tracking-label text-text-tertiary">
            PAGE {pageNum} / {totalPages}
          </p>
          <PaginationLink
            href={`/sessions?page=${pageNum + 1}${filter !== "all" ? `&filter=${filter}` : ""}`}
            enabled={hasNext}
          >
            Next →
          </PaginationLink>
        </div>
      )}
    </div>
  );
}

function FilterTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex h-9 items-center rounded-full border px-4 font-sans text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-ink-border bg-ink-surface text-text-tertiary hover:border-ink-border hover:text-text-secondary",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function PaginationLink({
  href,
  enabled,
  children,
}: {
  href: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) {
    return (
      <span className="font-sans text-[13px] text-text-tertiary opacity-40">{children}</span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-full font-sans text-[13px] font-medium text-text-secondary transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {children}
    </Link>
  );
}
