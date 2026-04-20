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
  searchParams: { page?: string; filter?: string };
}

export default async function SessionsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = createServerClient();

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
          className="font-sans text-[12px] text-text-tertiary transition-colors hover:text-text-secondary"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-label text-accent">ALL SESSIONS</p>
          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-heading text-text-primary sm:text-[36px]">
            {totalCount} session{totalCount === 1 ? "" : "s"}
          </h1>
        </div>
        <LinkButton href="/session/new" size="md">
          Start another →
        </LinkButton>
      </header>

      {/* Filter tabs */}
      <nav className="mb-6 flex gap-1 border-b border-ink-border">
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
        <ul className="divide-y divide-ink-border/40 overflow-hidden rounded-xl border border-ink-border">
          {sessions.map((session) => (
            <li key={session.id}>
              <SessionRow session={session} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-ink-border bg-ink-surface/50 p-10 text-center">
          <p className="font-sans text-[14px] text-text-secondary">
            {filter === "completed"
              ? "No completed sessions yet. Finish one and it'll show up here."
              : filter === "incomplete"
                ? "No incomplete sessions. Nice."
                : "No sessions yet."}
          </p>
          <LinkButton href="/session/new" size="sm" className="mt-4">
            Start a session →
          </LinkButton>
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
      className={[
        "border-b-2 px-4 py-2 font-sans text-[13px] font-medium transition-colors -mb-px",
        active
          ? "border-accent text-text-primary"
          : "border-transparent text-text-tertiary hover:text-text-secondary",
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
      className="font-sans text-[13px] font-medium text-text-secondary transition-colors hover:text-accent"
    >
      {children}
    </Link>
  );
}
