"use client";

import { useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContactEnrichment {
  city?: string | null;
  linkedin_url?: string | null;
  inferred_email?: string | null;
  email_confidence?: "guessed" | "verified" | "unknown" | null;
  role_signal?: string | null;
  tenure_signal?: string | null;
}

interface OutreachContact {
  id: string;
  name: string;
  title: string;
  company: string;
  source: string;
  status: string;
  relevance_reason: string | null;
  suggested_approach: string | null;
  enrichment?: ContactEnrichment | null;
  created_at: string;
}

interface ScoutContact {
  name: string;
  title: string;
  company: string;
  city: string;
  linkedin_url: string | null;
  inferred_email: string | null;
  email_confidence: "guessed" | "verified" | "unknown";
  role_signal: string | null;
  tenure_signal: string | null;
  relevance_reason: string;
  suggested_approach: string;
}

interface OutreachDraft {
  id: string;
  contact_id: string | null;
  subject: string;
  body: string;
  status: string;
  tone: string | null;
  sent_at: string | null;
  created_at: string;
}

type Tab = "scout" | "drafts" | "sent";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OutreachClient({
  contacts: initialContacts,
  drafts: initialDrafts,
}: {
  contacts: OutreachContact[];
  drafts: OutreachDraft[];
}) {
  const [tab, setTab] = useState<Tab>("scout");
  const [contacts, setContacts] = useState(initialContacts);
  const [drafts, setDrafts] = useState(initialDrafts);

  // Scout form state
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetCity, setTargetCity] = useState("");
  const [scouting, setScouting] = useState(false);
  const [scoutError, setScoutError] = useState<string | null>(null);
  const [scoutResults, setScoutResults] = useState<ScoutContact[]>([]);

  // Draft generation state
  const [draftingContactId, setDraftingContactId] = useState<string | null>(null);

  // Inline editor state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  // Action error (send / delete / edit failures)
  const [actionError, setActionError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Scout handler
  // -------------------------------------------------------------------------
  async function handleScout() {
    if (!targetCompany.trim() || !targetRole.trim()) return;
    setScouting(true);
    setScoutError(null);
    try {
      const res = await fetch("/api/outreach/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCompany: targetCompany.trim(), targetRole: targetRole.trim(), targetCity: targetCity.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Scout request failed");
      const { contacts: newContacts } = await res.json();
      setScoutResults(newContacts);
    } catch {
      setScoutError("Failed to find contacts. Please try again.");
    } finally {
      setScouting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Draft handler
  // -------------------------------------------------------------------------
  async function handleDraftEmail(contactId: string) {
    setDraftingContactId(contactId);
    setActionError(null);
    try {
      const res = await fetch("/api/outreach/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) throw new Error("Draft generation failed");
      const { draft } = await res.json();
      setDrafts((prev) => [draft, ...prev]);
      setTab("drafts");
    } catch (err) {
      console.error("[outreach] draft failed:", err);
      setActionError("Failed to generate draft. Please try again.");
    } finally {
      setDraftingContactId(null);
    }
  }

  // -------------------------------------------------------------------------
  // Send handler
  // -------------------------------------------------------------------------
  async function handleSend(draftId: string) {
    setActionError(null);
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      if (!res.ok) throw new Error("Send failed");
      const { sentAt } = await res.json();
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, status: "sent", sent_at: sentAt } : d)),
      );
    } catch (err) {
      console.error("[outreach] send failed:", err);
      setActionError("Failed to mark as sent. Please try again.");
    }
  }

  // -------------------------------------------------------------------------
  // Delete handler — persists to backend
  // -------------------------------------------------------------------------
  async function handleDelete(draftId: string) {
    setActionError(null);
    try {
      const res = await fetch("/api/outreach/draft", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    } catch (err) {
      console.error("[outreach] delete failed:", err);
      setActionError("Failed to delete draft. Please try again.");
    }
  }

  // -------------------------------------------------------------------------
  // Edit handlers
  // -------------------------------------------------------------------------
  function startEditing(draft: OutreachDraft) {
    setEditingDraftId(draft.id);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
  }

  function cancelEditing() {
    setEditingDraftId(null);
    setEditSubject("");
    setEditBody("");
  }

  async function saveEdit(draftId: string) {
    setActionError(null);
    try {
      const res = await fetch("/api/outreach/draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, subject: editSubject, body: editBody }),
      });
      if (!res.ok) throw new Error("Save failed");
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === draftId ? { ...d, subject: editSubject, body: editBody } : d,
        ),
      );
      setEditingDraftId(null);
    } catch (err) {
      console.error("[outreach] save failed:", err);
      setActionError("Failed to save changes. Please try again.");
    }
  }

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------
  const activeDrafts = drafts.filter((d) => d.status !== "sent");
  const sentDrafts = drafts.filter((d) => d.status === "sent");

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "scout", label: "Scout", count: contacts.length },
    { key: "drafts", label: "Drafts", count: activeDrafts.length },
    { key: "sent", label: "Sent", count: sentDrafts.length },
  ];

  return (
    <div className="mx-auto max-w-[960px] px-6 py-12 sm:px-10">
      {/* Header */}
      <div className="mb-10">
        <span className="font-mono text-[11px] font-medium tracking-label text-accent">
          OUTREACH
        </span>
        <h1 className="mt-3 font-display text-[36px] font-semibold tracking-heading text-text-primary sm:text-[42px]">
          Network smarter.
        </h1>
        <p className="mt-2 font-serif text-[18px] italic text-text-secondary">
          Scout contacts, draft outreach, and track your pipeline.
        </p>
      </div>

      {/* Action error banner */}
      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3">
          <p className="font-sans text-[13px] text-red-400">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="ml-4 font-sans text-[12px] text-red-400/60 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8 flex gap-1 rounded-lg border border-ink-border bg-ink-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-4 py-2 font-sans text-[13.5px] font-medium tracking-body transition-colors ${
              tab === t.key
                ? "bg-ink-raised text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-2 rounded-full bg-ink-border px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "scout" && (
        <ScoutTab
          contacts={contacts}
          scoutResults={scoutResults}
          targetCompany={targetCompany}
          targetRole={targetRole}
          targetCity={targetCity}
          scouting={scouting}
          scoutError={scoutError}
          draftingContactId={draftingContactId}
          onCompanyChange={setTargetCompany}
          onRoleChange={setTargetRole}
          onCityChange={setTargetCity}
          onScout={handleScout}
          onDraftEmail={handleDraftEmail}
        />
      )}

      {tab === "drafts" && (
        <DraftsTab
          drafts={activeDrafts}
          contacts={contacts}
          editingDraftId={editingDraftId}
          editSubject={editSubject}
          editBody={editBody}
          onEditSubjectChange={setEditSubject}
          onEditBodyChange={setEditBody}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          onSaveEdit={saveEdit}
          onSend={handleSend}
          onDelete={handleDelete}
        />
      )}

      {tab === "sent" && <SentTab drafts={sentDrafts} contacts={contacts} />}
    </div>
  );
}

// ===========================================================================
// Scout Tab
// ===========================================================================

function ScoutTab({
  contacts,
  scoutResults,
  targetCompany,
  targetRole,
  targetCity,
  scouting,
  scoutError,
  draftingContactId,
  onCompanyChange,
  onRoleChange,
  onCityChange,
  onScout,
  onDraftEmail,
}: {
  contacts: OutreachContact[];
  scoutResults: ScoutContact[];
  targetCompany: string;
  targetRole: string;
  targetCity: string;
  scouting: boolean;
  scoutError: string | null;
  draftingContactId: string | null;
  onCompanyChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onScout: () => void;
  onDraftEmail: (id: string) => void;
}) {
  const CITIES = [
    "", "New York", "San Francisco", "Los Angeles", "Chicago", "Boston",
    "Seattle", "Austin", "Denver", "Atlanta", "Miami", "Dallas", "Houston",
    "Washington DC", "Philadelphia", "Minneapolis", "Charlotte", "Nashville",
    "Portland", "Salt Lake City", "Remote",
  ];

  return (
    <div className="space-y-8">
      {/* Scout form */}
      <div className="rounded-xl border border-ink-border bg-ink-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold tracking-heading text-text-primary">
          Find contacts
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-medium tracking-label text-text-tertiary">
              TARGET COMPANY
            </label>
            <input
              type="text"
              value={targetCompany}
              onChange={(e) => onCompanyChange(e.target.value)}
              placeholder="e.g. Stripe"
              className="w-full rounded-lg border border-ink-border bg-ink px-3.5 py-2.5 font-sans text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-medium tracking-label text-text-tertiary">
              TARGET ROLE
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => onRoleChange(e.target.value)}
              placeholder="e.g. Product Manager"
              className="w-full rounded-lg border border-ink-border bg-ink px-3.5 py-2.5 font-sans text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-medium tracking-label text-text-tertiary">
              CITY / OFFICE
            </label>
            <select
              value={targetCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="w-full rounded-lg border border-ink-border bg-ink px-3.5 py-2.5 font-sans text-[14px] text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Any location</option>
              {CITIES.filter(Boolean).map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={onScout}
          disabled={scouting || !targetCompany.trim() || !targetRole.trim()}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-sans text-[13.5px] font-semibold text-text-onAccent transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {scouting ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-onAccent border-t-transparent" />
              Scouting...
            </>
          ) : (
            "Find contacts"
          )}
        </button>
        {scoutError && (
          <p className="mt-3 font-sans text-[13px] text-red-400">{scoutError}</p>
        )}
      </div>

      {/* Scout results (from latest search) */}
      {scoutResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-mono text-[10px] font-medium tracking-label text-text-tertiary">
            SUGGESTED CONTACTS ({scoutResults.length})
          </h3>
          {scoutResults.map((c, i) => (
            <MiniProfile
              key={i}
              name={c.name}
              title={c.title}
              company={c.company}
              city={c.city || null}
              linkedinUrl={c.linkedin_url}
              email={c.inferred_email}
              emailConfidence={c.email_confidence}
              roleSignal={c.role_signal}
              tenureSignal={c.tenure_signal}
              relevanceReason={c.relevance_reason}
              suggestedApproach={c.suggested_approach}
            />
          ))}
        </div>
      )}

      {/* Contact cards */}
      {contacts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-mono text-[10px] font-medium tracking-label text-text-tertiary">
            SCOUTED CONTACTS
          </h3>
          {contacts.map((contact) => (
            <MiniProfile
              key={contact.id}
              name={contact.name}
              title={contact.title}
              company={contact.company}
              city={contact.enrichment?.city ?? null}
              linkedinUrl={contact.enrichment?.linkedin_url ?? null}
              email={contact.enrichment?.inferred_email ?? null}
              emailConfidence={contact.enrichment?.email_confidence ?? "unknown"}
              roleSignal={contact.enrichment?.role_signal ?? null}
              tenureSignal={contact.enrichment?.tenure_signal ?? null}
              relevanceReason={contact.relevance_reason ?? ""}
              suggestedApproach={contact.suggested_approach ?? ""}
              action={
                <button
                  onClick={() => onDraftEmail(contact.id)}
                  disabled={draftingContactId === contact.id}
                  className="shrink-0 rounded-full border border-accent/30 px-3.5 py-1.5 font-sans text-[12px] font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
                >
                  {draftingContactId === contact.id ? "Drafting..." : "Draft email \u2192"}
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Mini-profile card
// ===========================================================================

function MiniProfile({
  name,
  title,
  company,
  city,
  linkedinUrl,
  email,
  emailConfidence,
  roleSignal,
  tenureSignal,
  relevanceReason,
  suggestedApproach,
  action,
}: {
  name: string;
  title: string;
  company: string;
  city: string | null;
  linkedinUrl: string | null;
  email: string | null;
  emailConfidence: "guessed" | "verified" | "unknown";
  roleSignal: string | null;
  tenureSignal: string | null;
  relevanceReason: string;
  suggestedApproach: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-border bg-ink-surface p-5 transition-colors hover:border-ink-border/80">
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent/5 font-display text-[14px] font-semibold text-text-primary"
        >
          {initials(name)}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="font-display text-[15px] font-semibold text-text-primary">{name}</h4>
          <p className="mt-0.5 font-sans text-[13px] text-text-secondary">
            {title}
            {company ? (
              <>
                {" · "}
                <span className="text-text-primary">{company}</span>
              </>
            ) : null}
          </p>
          {(city || roleSignal) && (
            <p className="mt-0.5 font-mono text-[11px] text-text-tertiary">
              {[city, roleSignal].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {(linkedinUrl || email) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-border pt-3">
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-sans text-[12.5px] text-accent transition-opacity hover:opacity-80"
            >
              <LinkedInGlyph />
              View LinkedIn
            </a>
          )}
          {email && <EmailChip email={email} confidence={emailConfidence} />}
        </div>
      )}

      {tenureSignal && (
        <div className="mt-4 rounded-lg border border-ink-border bg-ink-raised/40 px-3.5 py-2.5">
          <p className="font-mono text-[10px] tracking-label text-text-tertiary">PUBLIC SIGNAL</p>
          <p className="mt-1 font-serif text-[13px] italic leading-[1.5] text-text-primary">
            {tenureSignal}
          </p>
        </div>
      )}

      {(relevanceReason || suggestedApproach) && (
        <div className="mt-3 space-y-1.5">
          {relevanceReason && (
            <p className="font-sans text-[13px] leading-relaxed text-text-secondary">
              <span className="font-medium text-accent">Why: </span>
              {relevanceReason}
            </p>
          )}
          {suggestedApproach && (
            <p className="font-sans text-[13px] leading-relaxed text-text-secondary">
              <span className="font-medium text-text-primary">Approach: </span>
              {suggestedApproach}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EmailChip({
  email,
  confidence,
}: {
  email: string;
  confidence: "guessed" | "verified" | "unknown";
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard write can fail (older browsers, denied permissions) — fall silent
    }
  };

  const isGuessed = confidence !== "verified";
  return (
    <button
      type="button"
      onClick={copy}
      className="group inline-flex items-center gap-1.5 rounded-md border border-ink-border bg-ink-raised/40 px-2.5 py-1 font-mono text-[11.5px] text-text-primary transition-colors hover:border-accent/60"
    >
      <span>{copied ? "Copied" : email}</span>
      {isGuessed && (
        <span className="rounded-sm bg-amber-300/15 px-1 py-0.5 text-[9.5px] uppercase tracking-wider text-amber-300/90">
          {confidence === "guessed" ? "guessed" : "?"}
        </span>
      )}
    </button>
  );
}

function LinkedInGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// ===========================================================================
// Drafts Tab
// ===========================================================================

function DraftsTab({
  drafts,
  contacts,
  editingDraftId,
  editSubject,
  editBody,
  onEditSubjectChange,
  onEditBodyChange,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onSend,
  onDelete,
}: {
  drafts: OutreachDraft[];
  contacts: OutreachContact[];
  editingDraftId: string | null;
  editSubject: string;
  editBody: string;
  onEditSubjectChange: (v: string) => void;
  onEditBodyChange: (v: string) => void;
  onStartEditing: (d: OutreachDraft) => void;
  onCancelEditing: () => void;
  onSaveEdit: (id: string) => Promise<void>;
  onSend: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  if (drafts.length === 0) {
    return (
      <div className="rounded-xl border border-ink-border bg-ink-surface p-12 text-center">
        <p className="font-sans text-[14px] text-text-tertiary">
          No drafts yet. Scout some contacts and click &ldquo;Draft email&rdquo; to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => {
        const contact = contacts.find((c) => c.id === draft.contact_id);
        const isEditing = editingDraftId === draft.id;

        return (
          <div
            key={draft.id}
            className="rounded-xl border border-ink-border bg-ink-surface p-5"
          >
            {/* Status badge + contact name */}
            <div className="mb-3 flex items-center gap-2">
              <StatusBadge status={draft.status} />
              {contact && (
                <span className="font-sans text-[12px] text-text-tertiary">
                  to {contact.name} at {contact.company}
                </span>
              )}
            </div>

            {isEditing ? (
              /* Inline editor */
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-medium tracking-label text-text-tertiary">
                    SUBJECT
                  </label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => onEditSubjectChange(e.target.value)}
                    className="w-full rounded-lg border border-ink-border bg-ink px-3.5 py-2 font-sans text-[14px] text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-medium tracking-label text-text-tertiary">
                    BODY
                  </label>
                  <textarea
                    value={editBody}
                    onChange={(e) => onEditBodyChange(e.target.value)}
                    rows={6}
                    className="w-full resize-y rounded-lg border border-ink-border bg-ink px-3.5 py-2 font-sans text-[14px] leading-relaxed text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSaveEdit(draft.id)}
                    className="rounded-full bg-accent px-4 py-1.5 font-sans text-[12px] font-semibold text-text-onAccent transition-opacity hover:opacity-90"
                  >
                    Save
                  </button>
                  <button
                    onClick={onCancelEditing}
                    className="rounded-full border border-ink-border px-4 py-1.5 font-sans text-[12px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Read view */
              <>
                <h4 className="font-display text-[15px] font-semibold text-text-primary">
                  {draft.subject}
                </h4>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-text-secondary">
                  {draft.body}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onStartEditing(draft)}
                    className="rounded-full border border-ink-border px-3.5 py-1.5 font-sans text-[12px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onSend(draft.id)}
                    className="rounded-full bg-accent px-3.5 py-1.5 font-sans text-[12px] font-semibold text-text-onAccent transition-opacity hover:opacity-90"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => onDelete(draft.id)}
                    className="rounded-full border border-ink-border px-3.5 py-1.5 font-sans text-[12px] font-medium text-red-400 transition-colors hover:border-red-400/30"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================================
// Sent Tab
// ===========================================================================

function SentTab({
  drafts,
  contacts,
}: {
  drafts: OutreachDraft[];
  contacts: OutreachContact[];
}) {
  if (drafts.length === 0) {
    return (
      <div className="rounded-xl border border-ink-border bg-ink-surface p-12 text-center">
        <p className="font-sans text-[14px] text-text-tertiary">
          No sent emails yet. Draft and send your first outreach above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => {
        const contact = contacts.find((c) => c.id === draft.contact_id);
        return (
          <div
            key={draft.id}
            className="rounded-xl border border-ink-border bg-ink-surface p-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge status="sent" />
              {contact && (
                <span className="font-sans text-[12px] text-text-tertiary">
                  to {contact.name} at {contact.company}
                </span>
              )}
              {draft.sent_at && (
                <span className="ml-auto font-mono text-[10px] text-text-tertiary">
                  {new Date(draft.sent_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <h4 className="font-display text-[15px] font-semibold text-text-primary">
              {draft.subject}
            </h4>
            <p className="mt-2 line-clamp-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-text-secondary">
              {draft.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================================
// Status badge
// ===========================================================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "border-yellow-500/30 text-yellow-400",
    ready: "border-accent/30 text-accent",
    sent: "border-blue-500/30 text-blue-400",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium tracking-label ${
        styles[status] ?? "border-ink-border text-text-tertiary"
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
}
