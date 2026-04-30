"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OutreachContact {
  id: string;
  name: string;
  title: string;
  company: string;
  source: string;
  status: string;
  relevance_reason: string | null;
  suggested_approach: string | null;
  created_at: string;
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
  const [scouting, setScouting] = useState(false);
  const [scoutError, setScoutError] = useState<string | null>(null);

  // Draft generation state
  const [draftingContactId, setDraftingContactId] = useState<string | null>(null);

  // Inline editor state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

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
        body: JSON.stringify({ targetCompany: targetCompany.trim(), targetRole: targetRole.trim() }),
      });
      if (!res.ok) throw new Error("Scout request failed");
      const { contacts: newContacts } = await res.json();
      setContacts((prev) => [...newContacts, ...prev]);
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
    } finally {
      setDraftingContactId(null);
    }
  }

  // -------------------------------------------------------------------------
  // Send handler
  // -------------------------------------------------------------------------
  async function handleSend(draftId: string) {
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
    }
  }

  // -------------------------------------------------------------------------
  // Delete handler (client-side only — removes from view)
  // -------------------------------------------------------------------------
  function handleDelete(draftId: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
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

  function saveEdit(draftId: string) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId ? { ...d, subject: editSubject, body: editBody } : d,
      ),
    );
    setEditingDraftId(null);
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
          targetCompany={targetCompany}
          targetRole={targetRole}
          scouting={scouting}
          scoutError={scoutError}
          draftingContactId={draftingContactId}
          onCompanyChange={setTargetCompany}
          onRoleChange={setTargetRole}
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
  targetCompany,
  targetRole,
  scouting,
  scoutError,
  draftingContactId,
  onCompanyChange,
  onRoleChange,
  onScout,
  onDraftEmail,
}: {
  contacts: OutreachContact[];
  targetCompany: string;
  targetRole: string;
  scouting: boolean;
  scoutError: string | null;
  draftingContactId: string | null;
  onCompanyChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onScout: () => void;
  onDraftEmail: (id: string) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Scout form */}
      <div className="rounded-xl border border-ink-border bg-ink-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold tracking-heading text-text-primary">
          Find contacts
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
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

      {/* Contact cards */}
      {contacts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-mono text-[10px] font-medium tracking-label text-text-tertiary">
            SCOUTED CONTACTS
          </h3>
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-xl border border-ink-border bg-ink-surface p-5 transition-colors hover:border-ink-border/80"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h4 className="font-display text-[15px] font-semibold text-text-primary">
                    {contact.name}
                  </h4>
                  <p className="mt-0.5 font-sans text-[13px] text-text-secondary">
                    {contact.title} at {contact.company}
                  </p>
                  {contact.relevance_reason && (
                    <p className="mt-2 font-sans text-[13px] leading-relaxed text-text-tertiary">
                      {contact.relevance_reason}
                    </p>
                  )}
                  {contact.suggested_approach && (
                    <p className="mt-1.5 font-serif text-[13px] italic text-text-secondary">
                      {contact.suggested_approach}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onDraftEmail(contact.id)}
                  disabled={draftingContactId === contact.id}
                  className="shrink-0 rounded-full border border-accent/30 px-3.5 py-1.5 font-sans text-[12px] font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
                >
                  {draftingContactId === contact.id ? "Drafting..." : "Draft email \u2192"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  onSaveEdit: (id: string) => void;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
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
