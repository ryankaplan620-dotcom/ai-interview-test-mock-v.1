export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { getCachedIntel } from "@/lib/intel/pipeline/cache";
import { isStale } from "@/lib/intel/schema";
import type { CompanyIntel, IntelQuestion } from "@/lib/intel/schema";

const ADMIN_EMAILS = (process.env.INTEL_ADMIN_EMAILS ?? "")
  .split(",")
  .filter(Boolean);

interface PageProps {
  params: Promise<{ company: string }>;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    ok: "bg-accent/15 text-accent",
    stale: "bg-amber-500/15 text-amber-400",
    error: "bg-rose-500/15 text-rose-400",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ${colors[status] ?? "bg-ink-border text-text-tertiary"}`}
    >
      {status}
    </span>
  );
}

function countByType(questions: IntelQuestion[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const q of questions) {
    counts[q.interview_type] = (counts[q.interview_type] ?? 0) + 1;
  }
  return counts;
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default async function IntelCompanyPage(props: PageProps) {
  const params = await props.params;
  const user = await requireUser();

  if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-text-primary">
        <p className="text-lg">Unauthorized</p>
      </div>
    );
  }

  const companyKey = decodeURIComponent(params.company);
  const intel = await getCachedIntel(companyKey);

  if (!intel) {
    return (
      <div className="min-h-screen bg-ink px-6 py-12 text-text-primary sm:px-10">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/intel"
            className="text-sm text-accent hover:underline"
          >
            &larr; Back to index
          </Link>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em]">
            No intel found for &ldquo;{companyKey}&rdquo;
          </h1>
          <p className="mt-2 text-text-secondary">
            This company has no cached intelligence data yet.
          </p>
          <a
            href={`/api/admin/intel/refresh?company=${encodeURIComponent(companyKey)}`}
            className="mt-6 inline-block rounded-full bg-cta-gradient px-5 py-2 text-sm font-semibold text-text-onAccent transition-all hover:shadow-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Fetch now
          </a>
        </div>
      </div>
    );
  }

  const stale = isStale(intel);
  const typeCounts = countByType(intel.questions);

  return (
    <div className="min-h-screen bg-ink px-6 py-12 text-text-primary sm:px-10">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Nav */}
        <Link
          href="/admin/intel"
          className="text-sm text-accent hover:underline"
        >
          &larr; Back to index
        </Link>

        {/* Header */}
        <div>
          <span className="font-mono text-[11px] font-medium tracking-label text-violet">
            INTELLIGENCE · DETAIL
          </span>
          <h1 className="mt-3 font-display text-[36px] font-bold tracking-[-0.03em]">
            {intel.company.name}
          </h1>
          <p className="mt-1 text-text-secondary">
            {intel.company.industry} &middot; {intel.company.size_band} &middot;{" "}
            {intel.company.hq_city}
            {intel.company.ticker ? ` (${intel.company.ticker})` : ""}
          </p>
        </div>

        {/* Freshness */}
        <section className="rounded-xl border border-ink-border bg-ink-surface p-6">
          <h2 className="mb-4 font-mono text-xs font-medium tracking-label text-text-tertiary">
            FRESHNESS
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-text-tertiary">Generated</p>
              <p className="mt-1 text-sm">
                {formatDate(intel.freshness.generated_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">TTL</p>
              <p className="mt-1 text-sm">{intel.freshness.ttl_hours}h</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Oldest field</p>
              <p className="mt-1 text-sm">{intel.freshness.oldest_field}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Status</p>
              <p className="mt-1">
                {stale ? statusBadge("stale") : statusBadge("ok")}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <a
              href={`/api/admin/intel/refresh?company=${encodeURIComponent(companyKey)}`}
              className="inline-block rounded-full bg-cta-gradient px-5 py-2 text-sm font-semibold text-text-onAccent transition-all hover:shadow-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              Refresh now
            </a>
          </div>
        </section>

        {/* Sources */}
        <section className="rounded-xl border border-ink-border bg-ink-surface p-6">
          <h2 className="mb-4 font-mono text-xs font-medium tracking-label text-text-tertiary">
            SOURCES ({intel.sources.length})
          </h2>
          {intel.sources.length > 0 ? (
            <ul className="space-y-2">
              {intel.sources.map((src, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-sm"
                >
                  {statusBadge(src.status)}
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-accent hover:underline"
                  >
                    {src.url}
                  </a>
                  <span className="ml-auto text-xs text-text-tertiary">
                    {formatDate(src.fetched_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-tertiary">No sources recorded.</p>
          )}
        </section>

        {/* Questions by type */}
        <section className="rounded-xl border border-ink-border bg-ink-surface p-6">
          <h2 className="mb-4 font-mono text-xs font-medium tracking-label text-text-tertiary">
            QUESTIONS ({intel.questions.length})
          </h2>
          {Object.keys(typeCounts).length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div
                  key={type}
                  className="rounded-xl border border-ink-border bg-ink-raised px-4 py-2"
                >
                  <p className="font-mono text-[10px] tracking-label text-text-tertiary">
                    {type.toUpperCase()}
                  </p>
                  <p className="mt-1 font-display text-lg font-bold tracking-[-0.02em]">
                    {count}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No questions yet.</p>
          )}
        </section>

        {/* Culture */}
        <section className="rounded-xl border border-ink-border bg-ink-surface p-6">
          <h2 className="mb-4 font-mono text-xs font-medium tracking-label text-text-tertiary">
            CULTURE
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-text-tertiary">Stated values</p>
              {intel.culture.stated_values.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {intel.culture.stated_values.map((v, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-text-tertiary">None</p>
              )}
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Interview vibe words</p>
              {intel.culture.interview_vibe_words.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {intel.culture.interview_vibe_words.map((w, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-ink-border px-3 py-1 text-xs text-text-secondary"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-text-tertiary">None</p>
              )}
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Observed themes</p>
              {intel.culture.observed_themes.length > 0 ? (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text-secondary">
                  {intel.culture.observed_themes.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-text-tertiary">None</p>
              )}
            </div>
          </div>
        </section>

        {/* Recent news */}
        <section className="rounded-xl border border-ink-border bg-ink-surface p-6">
          <h2 className="mb-4 font-mono text-xs font-medium tracking-label text-text-tertiary">
            RECENT NEWS ({intel.recent.news.length})
          </h2>
          {intel.recent.news.length > 0 ? (
            <ul className="space-y-3">
              {intel.recent.news.map((item, i) => (
                <li key={i} className="text-sm">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {item.headline}
                  </a>
                  <span className="ml-2 text-text-tertiary">
                    {item.date} &middot; {item.source}
                  </span>
                  <p className="mt-0.5 text-text-secondary">
                    {item.one_liner}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-tertiary">No recent news.</p>
          )}
        </section>
      </div>
    </div>
  );
}
