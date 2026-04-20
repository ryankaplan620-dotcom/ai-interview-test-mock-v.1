import { getProfile, getUserTier, requireUser } from "@/lib/auth/server";
import { TIERS, formatPrice } from "@/lib/tiers";
import { BillingActions } from "./billing-actions";

export default async function SettingsPage() {
  await requireUser();
  const profile = await getProfile();
  const tier = await getUserTier();

  const tierConfig = tier ? TIERS[tier.effective_tier] : TIERS.trial;

  return (
    <div className="mx-auto max-w-[840px] px-6 py-12 sm:px-10">
      <div className="mb-10">
        <span className="font-mono text-[11px] font-medium tracking-label text-accent">SETTINGS</span>
        <h1 className="mt-3 font-display text-[32px] font-semibold tracking-heading text-text-primary">
          Account
        </h1>
      </div>

      <div className="space-y-8">
        {/* Profile */}
        <Panel title="Profile">
          <Row label="Name" value={profile?.full_name ?? "—"} />
          <Row label="Email" value={profile?.email ?? "—"} />
          <Row
            label="Student verified"
            value={tier?.is_verified_student ? "Yes · verified through SheerID" : "No"}
          />
        </Panel>

        {/* Subscription */}
        <Panel title="Subscription">
          <Row label="Plan" value={tierConfig.name} />
          <Row
            label="Price"
            value={
              tier?.effective_tier === "trial"
                ? "Free trial"
                : `${formatPrice(tierConfig.monthlyPrice)}/mo`
            }
          />
          {tier?.trial_end && tier.effective_tier === "trial" && (
            <Row label="Trial ends" value={new Date(tier.trial_end).toLocaleDateString()} />
          )}
          {tier?.current_period_end && tier.effective_tier !== "trial" && (
            <Row
              label={tier.cancel_at_period_end ? "Access until" : "Renews"}
              value={new Date(tier.current_period_end).toLocaleDateString()}
            />
          )}

          <div className="mt-5 border-t border-ink-border/40 pt-5">
            <BillingActions tier={tier?.effective_tier ?? "trial"} />
          </div>
        </Panel>

        {/* Data */}
        <Panel title="Your data">
          <p className="font-sans text-[14px] leading-relaxed text-text-secondary">
            Folio stores your session recordings, transcripts, and feedback. You can export or delete this
            data at any time, in accordance with GDPR and CCPA.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="mailto:support@folio.io?subject=Data%20export%20request"
              className="inline-flex h-9 items-center rounded-full border border-ink-border bg-ink-raised px-4 font-sans text-[13px] font-medium text-text-primary transition-colors hover:border-accent hover:text-accent"
            >
              Request data export
            </a>
            <a
              href="mailto:support@folio.io?subject=Account%20deletion%20request"
              className="inline-flex h-9 items-center rounded-full border border-rose-900 bg-transparent px-4 font-sans text-[13px] font-medium text-rose-400 transition-colors hover:bg-rose-950"
            >
              Delete account
            </a>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-border bg-ink-surface p-6">
      <h2 className="mb-5 font-display text-[18px] font-semibold text-text-primary">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-mono text-[11px] font-medium tracking-label text-text-tertiary">
        {label.toUpperCase()}
      </span>
      <span className="font-sans text-[14px] text-text-primary">{value}</span>
    </div>
  );
}
