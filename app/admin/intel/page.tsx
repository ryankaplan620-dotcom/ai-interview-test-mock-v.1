export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { isStale } from "@/lib/intel/schema";
import type { CompanyIntel } from "@/lib/intel/schema";

const ADMIN_EMAILS = (process.env.INTEL_ADMIN_EMAILS ?? "")
  .split(",")
  .filter(Boolean);

interface CacheRow {
  company_name: string;
  company_name_normalized: string;
  session_count: number | null;
  last_accessed_at: string | null;
  freshness_generated_at: string | null;
  ttl_hours: number | null;
  data: CompanyIntel | null;
}

export default async function IntelAdminIndexPage() {
  const user = await requireUser();

  if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-text-primary">
        <p className="text-lg">Unauthorized</p>
      </div>
    );
  }

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase.from("company_intel_cache") as any)
    .select(
      "company_name, company_name_normalized, session_count, last_accessed_at, freshness_generated_at, ttl_hours, data"
    )
    .order("session_count", { ascending: false })
    .limit(200);

  const companies: CacheRow[] = (rows ?? []) as CacheRow[];

  return (
    <div className="min-h-screen bg-ink px-6 py-12 text-text-primary sm:px-10">
      <div className="mx-auto max-w-5xl">
        <span className="font-mono text-[11px] font-medium tracking-label text-accent">
          ADMIN
        </span>
        <h1 className="mt-3 font-display text-[36px] font-semibold tracking-heading">
          Company Intelligence
        </h1>
        <p className="mt-2 text-text-secondary">
          {companies.length} cached companies
        </p>

        <div className="mt-8 overflow-x-auto rounded-lg border border-ink-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-border bg-ink-surface text-left text-text-tertiary">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Sessions</th>
                <th className="px-4 py-3 font-medium">Last accessed</th>
                <th className="px-4 py-3 font-medium">Freshness</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => {
                const stale =
                  c.data != null ? isStale(c.data) : c.ttl_hours === 0;
                return (
                  <tr
                    key={c.company_name_normalized}
                    className="border-b border-ink-border last:border-b-0 hover:bg-ink-surface/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/intel/${encodeURIComponent(c.company_name_normalized)}`}
                        className="text-accent hover:underline"
                      >
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {c.session_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {c.last_accessed_at
                        ? new Date(c.last_accessed_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {c.freshness_generated_at
                        ? new Date(c.freshness_generated_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          stale
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {stale ? "stale" : "fresh"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {companies.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-text-tertiary"
                  >
                    No cached companies yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
