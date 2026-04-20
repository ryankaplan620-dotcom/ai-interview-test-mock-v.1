import Link from "next/link";
import { createServerClient } from "@/lib/db/server";
import { requireUser, getUserTier, getProfile } from "@/lib/auth/server";
import { TIERS } from "@/lib/tiers";
import { LinkButton } from "@/components/Button";
import type { Session } from "@/types/supabase";

type SessionPreview = Pick<
  Session,
  "id" | "persona" | "interview_type" | "target_firm" | "status" | "started_at" | "actual_duration_seconds"
>;

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const tier = await getUserTier();
  const supabase = createServerClient();

  const { data: sessionsRaw } = await supabase
    .from("sessions")
    .select("id, persona, interview_type, target_firm, status, started_at, actual_duration_seconds")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const sessions = (sessionsRaw ?? []) as unknown as SessionPreview[];

  const tierConfig = tier ? TIERS[tier.effective_tier] : TIERS.trial;
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-12 sm:px-10">
      {/* Greeting */}
      <div className="mb-12">
        <span className="font-mono text-[11px] font-medium tracking-label text-accent">DASHBOARD</span>
        <h1 className="mt-3 font-display text-[36px] font-semibold tracking-heading text-text-primary sm:text-[42px]">
          Hello, {firstName}.
        </h1>
        <p className="mt-2 font-serif text-[18px] italic text-text-secondary">
          Your next interview is already on the calendar.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-8">
          {/* Primary CTA card */}
          <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-ink-surface to-ink-raised p-8">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-accent/10 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <span className="font-mono text-[10px] font-medium tracking-label text-accent">
                READY TO PRACTICE
              </span>
              <h2 className="mt-3 font-display text-[26px] font-semibold leading-tight tracking-heading text-text-primary">
                Start your next session.
              </h2>
              <p className="mt-2 max-w-md font-sans text-[15px] leading-relaxed text-text-secondary">
                Pick a persona, pick a firm, run the interview. Feedback lands the moment you end the call.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href="/session/new" size="md">
                  Start practice →
                </LinkButton>
                <LinkButton href="/session/new?type=hard_mode" variant="secondary" size="md">
                  Try hard mode
                </LinkButton>
              </div>
            </div>
          </div>

          {/* Session history */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[20px] font-semibold text-text-primary">Recent sessions</h3>
              <Link
                href="/sessions"
                className="font-sans text-[13px] font-medium text-text-secondary transition-colors hover:text-accent"
              >
                View all →
              </Link>
            </div>

            {sessions.length > 0 ? (
              <ul className="divide-y divide-ink-border/40 overflow-hidden rounded-xl border border-ink-border">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/sessions/${session.id}`}
                      className="flex items-center justify-between bg-ink-surface px-5 py-4 transition-colors hover:bg-ink-raised"
                    >
                      <div>
                        <p className="font-sans text-[14px] font-medium text-text-primary">
                          {personaLabel(session.persona)}
                          {session.target_firm ? ` · ${session.target_firm}` : ""}
                        </p>
                        <p className="mt-0.5 font-sans text-[12px] text-text-tertiary">
                          {session.interview_type.replace("_", " ")} ·{" "}
                          {session.actual_duration_seconds
                            ? `${Math.round(session.actual_duration_seconds / 60)} min`
                            : "In progress"}
                        </p>
                      </div>
                      <span
                        className={`font-mono text-[10px] font-medium tracking-label ${
                          session.status === "completed" ? "text-accent" : "text-text-tertiary"
                        }`}
                      >
                        {session.status.toUpperCase()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-ink-border bg-ink-surface/50 p-10 text-center">
                <p className="font-sans text-[14px] text-text-secondary">
                  No sessions yet. Your first practice is one click away.
                </p>
                <LinkButton href="/session/new" size="sm" className="mt-4">
                  Start your first session →
                </LinkButton>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Tier card */}
          <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
            <span className="font-mono text-[10px] font-medium tracking-label text-text-tertiary">
              YOUR PLAN
            </span>
            <p className="mt-2 font-display text-[20px] font-semibold text-text-primary">
              {tierConfig.name}
            </p>
            <p className="mt-1 font-sans text-[13px] leading-relaxed text-text-secondary">
              {tierConfig.tagline}
            </p>

            {tier?.effective_tier === "trial" && tier?.trial_end && (
              <p className="mt-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 font-sans text-[12px] text-accent">
                Trial ends {new Date(tier.trial_end).toLocaleDateString()}
              </p>
            )}

            <Link
              href="/pricing"
              className="mt-4 block text-center font-sans text-[13px] font-medium text-accent transition-opacity hover:opacity-80"
            >
              {tier?.effective_tier === "trial" || tier?.effective_tier === "general"
                ? "Upgrade plan →"
                : "Manage plan →"}
            </Link>
          </div>

          {/* Interviewer roster */}
          <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
            <span className="font-mono text-[10px] font-medium tracking-label text-text-tertiary">
              INTERVIEWERS
            </span>
            <ul className="mt-3 space-y-2">
              <PersonaRow name="Luke Anderson" role="McKinsey · Consulting" />
              <PersonaRow name="Marcus Hale" role="Goldman Sachs · Banking" />
              <PersonaRow name="Sarah Chen" role="Meta · Tech" />
              <PersonaRow name="David Reed" role="Bain Capital · Finance" />
              <PersonaRow name="Jennifer Ortiz" role="Stripe · Product" />
            </ul>
          </div>

          {/* Quote */}
          <div className="rounded-xl border border-ink-border bg-ink-surface p-5">
            <p className="font-serif text-[15px] italic leading-relaxed text-text-primary">
              &ldquo;The interview before the interview.&rdquo;
            </p>
            <p className="mt-2 font-sans text-[12px] text-text-tertiary">
              — The Folio method
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function personaLabel(p: string): string {
  const map: Record<string, string> = {
    luke: "Luke Anderson",
    marcus: "Marcus Hale",
    sarah: "Sarah Chen",
    david: "David Reed",
    jennifer: "Jennifer Ortiz",
  };
  return map[p] ?? p;
}

function PersonaRow({ name, role }: { name: string; role: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <div>
        <p className="font-sans text-[13px] text-text-primary">{name}</p>
        <p className="font-sans text-[11px] text-text-tertiary">{role}</p>
      </div>
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
    </li>
  );
}
