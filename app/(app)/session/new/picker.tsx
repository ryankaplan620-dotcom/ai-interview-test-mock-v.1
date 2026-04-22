"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { startSession, type StartSessionResult } from "./actions";
import type { PersonaId, InterviewType, SubscriptionTier } from "@/types/supabase";
import type { InterviewMode } from "@/lib/personas/types";
import { TIERS } from "@/lib/tiers";

// --------------------------------------------------------------------------
// Static picker data (mirrors the persona registry for client-side rendering)
// --------------------------------------------------------------------------

interface PickerPersona {
  id: PersonaId;
  name: string;
  firstName: string;
  firm: string;
  title: string;
  tagline: string;
  supportedTypes: InterviewType[];
  defaultDurationMinutes: number;
}

interface InterviewTypeOption {
  id: InterviewType;
  label: string;
  description: string;
}

const INTERVIEW_TYPES: InterviewTypeOption[] = [
  { id: "behavioral", label: "Behavioral", description: "Resume walkthrough and stories." },
  { id: "case", label: "Case", description: "Market sizing or profitability driver tree." },
  { id: "technical", label: "Technical", description: "Foundational finance or coding problems." },
  { id: "product_sense", label: "Product sense", description: "Design and strategy prompts." },
];

const MODES: { id: InterviewMode; label: string; description: string }[] = [
  { id: "easy", label: "Easy", description: "Warmer. More room to recover when you stall." },
  { id: "standard", label: "Standard", description: "The real baseline." },
  { id: "hard", label: "Hard", description: "Interrupts sooner. No rescue hints." },
];

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export interface PickerProps {
  personas: PickerPersona[];
  tier: SubscriptionTier;
  hasFirmCalibration: boolean;
  hasPanel: boolean;
  hasHardMode: boolean;
}

export function SessionPicker({ personas, tier, hasFirmCalibration, hasPanel, hasHardMode }: PickerProps) {
  const [personaId, setPersonaId] = useState<PersonaId | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewType | null>(null);
  const [mode, setMode] = useState<InterviewMode>("standard");
  const [targetFirm, setTargetFirm] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [isPanel, setIsPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const persona = useMemo(() => personas.find((p) => p.id === personaId) ?? null, [personas, personaId]);

  // Filter the interview type options based on the selected persona's supported types
  const availableInterviewTypes = useMemo(() => {
    if (!persona) return INTERVIEW_TYPES;
    return INTERVIEW_TYPES.filter((t) => persona.supportedTypes.includes(t.id));
  }, [persona]);

  // Reset type if it's no longer valid after persona change
  const onPersonaSelect = (id: PersonaId) => {
    setPersonaId(id);
    const newPersona = personas.find((p) => p.id === id);
    if (interviewType && newPersona && !newPersona.supportedTypes.includes(interviewType)) {
      setInterviewType(null);
    }
  };

  const canSubmit = personaId !== null && interviewType !== null && !pending;

  const onSubmit = () => {
    if (!personaId || !interviewType) return;
    setError(null);

    startTransition(async () => {
      const result: StartSessionResult = await startSession({
        personaId,
        interviewType,
        mode,
        targetFirm: targetFirm.trim() || undefined,
        targetRole: targetRole.trim() || undefined,
        isPanel,
        overageAccepted: false,
      });
      if (!result.ok) {
        setError(result.error);
      }
      // On ok, the server action redirects — code after startTransition is unreachable on success.
    });
  };

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-12 sm:px-10">
      <div className="mb-10">
        <Link
          href="/dashboard"
          className="font-sans text-[13px] text-text-secondary transition-colors hover:text-accent"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 font-display text-[36px] font-semibold tracking-heading text-text-primary">
          Start a practice session.
        </h1>
        <p className="mt-2 font-serif text-[16px] italic text-text-secondary">
          Pick who interviews you. Pick what they ask about. Run the call.
        </p>
      </div>

      {/* --- Step 1: Persona --- */}
      <Section number="01" label="Choose your interviewer">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((p) => {
            const selected = personaId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPersonaSelect(p.id)}
                className={[
                  "group flex items-start gap-4 rounded-xl border p-4 text-left transition-all",
                  selected
                    ? "border-accent bg-ink-raised"
                    : "border-ink-border bg-ink-surface hover:border-accent/60 hover:bg-ink-raised",
                ].join(" ")}
                aria-pressed={selected}
              >
                <div
                  className={[
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-serif text-[20px] font-semibold transition-all",
                    selected
                      ? "bg-accent text-ink"
                      : "bg-gradient-to-br from-accent/80 to-accent-deep text-ink",
                  ].join(" ")}
                >
                  {p.firstName[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-sans text-[14px] font-semibold text-text-primary">{p.name}</p>
                  <p className="mt-0.5 truncate font-sans text-[12px] text-text-secondary">
                    {p.title} · {p.firm}
                  </p>
                  <p className="mt-1 font-sans text-[12px] leading-snug text-text-tertiary">
                    {p.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* --- Step 2: Format --- */}
      <Section
        number="02"
        label="Pick the format"
        disabled={!persona}
        disabledHint="Pick an interviewer first."
      >
        <div className="flex flex-wrap gap-2">
          {availableInterviewTypes.map((t) => {
            const selected = interviewType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setInterviewType(t.id)}
                className={[
                  "rounded-full border px-5 py-2 font-sans text-[13px] transition-all",
                  selected
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-ink-border bg-ink-surface text-text-primary hover:border-accent/60 hover:text-accent",
                ].join(" ")}
                aria-pressed={selected}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {interviewType && (
          <p className="mt-3 font-sans text-[12px] text-text-tertiary">
            {INTERVIEW_TYPES.find((t) => t.id === interviewType)?.description}
          </p>
        )}
      </Section>

      {/* --- Step 3: Difficulty --- */}
      <Section
        number="03"
        label="Difficulty"
        disabled={!interviewType}
        disabledHint="Pick a format first."
      >
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => {
            const selected = mode === m.id;
            const locked = m.id === "hard" && !hasHardMode;
            const disabled = locked;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => !disabled && setMode(m.id)}
                disabled={disabled}
                className={[
                  "relative rounded-full border px-5 py-2 font-sans text-[13px] transition-all",
                  selected && !disabled
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-ink-border bg-ink-surface text-text-primary",
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-accent/60 hover:text-accent",
                ].join(" ")}
                aria-pressed={selected}
              >
                {m.label}
                {locked && (
                  <span className="ml-2 font-mono text-[10px] tracking-label text-accent/80">
                    MAX
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 font-sans text-[12px] text-text-tertiary">
          {MODES.find((m) => m.id === mode)?.description}
        </p>
      </Section>

      {/* --- Step 4: Target firm (optional) --- */}
      <Section
        number="04"
        label="Target firm"
        sublabel={hasFirmCalibration ? "Calibrates questions to the firm." : "Captured for your notes."}
        disabled={!interviewType}
        disabledHint="Pick a format first."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <LabelledInput
            label="Firm"
            value={targetFirm}
            onChange={setTargetFirm}
            placeholder={persona?.firm ?? "Goldman Sachs"}
            disabled={!interviewType}
          />
          <LabelledInput
            label="Role"
            value={targetRole}
            onChange={setTargetRole}
            placeholder="Summer Analyst"
            disabled={!interviewType}
          />
        </div>
        {!hasFirmCalibration && targetFirm && (
          <p className="mt-3 font-sans text-[12px] text-text-tertiary">
            Firm-specific calibration is part of the <span className="text-accent">Pro</span> plan. Your choice is still saved on the session for reference.
          </p>
        )}

        {/* Panel toggle — Pro+ */}
        <div className="mt-6 flex items-center justify-between rounded-lg border border-ink-border bg-ink-surface px-4 py-3">
          <div>
            <p className="font-sans text-[13px] text-text-primary">
              Panel interview
              {!hasPanel && (
                <span className="ml-2 font-mono text-[10px] tracking-label text-accent/80">PRO</span>
              )}
            </p>
            <p className="mt-0.5 font-sans text-[11px] text-text-tertiary">
              Two or three interviewers trade off. Closer to a superday round.
            </p>
          </div>
          <Toggle
            checked={isPanel}
            onChange={setIsPanel}
            disabled={!hasPanel}
          />
        </div>
      </Section>

      {/* --- Submit --- */}
      <div className="mt-12 flex flex-col items-end gap-3">
        {error && (
          <p className="font-sans text-[13px] text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={[
            "rounded-full px-7 py-3 font-sans text-[14px] font-semibold transition-all",
            canSubmit
              ? "bg-accent text-ink hover:bg-accent-light"
              : "cursor-not-allowed bg-ink-raised text-text-tertiary",
          ].join(" ")}
        >
          {pending ? "Starting..." : "Start the call →"}
        </button>
        <p className="font-mono text-[11px] tracking-label text-text-tertiary">
          TIER · {TIERS[tier].label.toUpperCase()}
        </p>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Small building blocks
// --------------------------------------------------------------------------

function Section({
  number,
  label,
  sublabel,
  children,
  disabled = false,
  disabledHint,
}: {
  number: string;
  label: string;
  sublabel?: string;
  children: React.ReactNode;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <section className={`mb-10 ${disabled ? "opacity-50" : ""}`}>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-[11px] tracking-label text-text-tertiary">{number}</span>
        <h2 className="font-display text-[16px] font-semibold text-text-primary">{label}</h2>
        {sublabel && <span className="font-sans text-[12px] text-text-tertiary">· {sublabel}</span>}
      </div>
      {disabled && disabledHint ? (
        <p className="font-sans text-[13px] text-text-tertiary">{disabledHint}</p>
      ) : (
        children
      )}
    </section>
  );
}

function LabelledInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] tracking-label text-text-tertiary">
        {label.toUpperCase()}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-ink-border bg-ink-surface px-3 py-2.5 font-sans text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
      />
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked && !disabled ? "bg-accent" : "bg-ink-border",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-5 w-5 rounded-full bg-text-primary shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

// Re-export so server page can reuse the type
export type { PickerPersona };
