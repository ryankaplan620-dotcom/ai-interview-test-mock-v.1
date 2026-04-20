import Link from "next/link";
import { FolioMark } from "@/components/FolioMark";
import { requireUser } from "@/lib/auth/server";

const PERSONAS = [
  { id: "priya", name: "Priya Patel", firm: "McKinsey & Company", role: "Consulting" },
  { id: "marcus", name: "Marcus Hale", firm: "Goldman Sachs", role: "Banking" },
  { id: "sarah", name: "Sarah Chen", firm: "Meta", role: "Tech" },
  { id: "david", name: "David Reed", firm: "Bain Capital", role: "Finance" },
  { id: "jennifer", name: "Jennifer Ortiz", firm: "Stripe", role: "Product" },
];

const INTERVIEW_TYPES = [
  { id: "behavioral", label: "Behavioral" },
  { id: "case", label: "Case" },
  { id: "technical", label: "Technical" },
  { id: "product_sense", label: "Product sense" },
];

export default async function NewSessionPage() {
  await requireUser();

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

      {/* Persona picker */}
      <section className="mb-10">
        <h2 className="mb-4 font-display text-[16px] font-semibold text-text-primary">Choose your interviewer</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="group flex items-center gap-4 rounded-xl border border-ink-border bg-ink-surface p-4 text-left transition-all hover:border-accent hover:bg-ink-raised"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-deep font-serif text-[20px] font-semibold text-ink">
                {p.name[0]}
              </div>
              <div>
                <p className="font-sans text-[14px] font-semibold text-text-primary">{p.name}</p>
                <p className="mt-0.5 font-sans text-[12px] text-text-secondary">{p.firm}</p>
                <p className="font-mono text-[10px] tracking-label text-text-tertiary">
                  {p.role.toUpperCase()}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Interview type */}
      <section className="mb-10">
        <h2 className="mb-4 font-display text-[16px] font-semibold text-text-primary">Pick the format</h2>
        <div className="flex flex-wrap gap-2">
          {INTERVIEW_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="rounded-full border border-ink-border bg-ink-surface px-5 py-2 font-sans text-[13px] text-text-primary transition-all hover:border-accent hover:text-accent"
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Not-yet-built notice */}
      <section className="rounded-2xl border border-accent/20 bg-gradient-to-br from-ink-surface to-ink-raised p-10 text-center">
        <FolioMark className="mx-auto h-12 w-12" color="#00F590" />
        <h3 className="mt-4 font-display text-[20px] font-semibold text-text-primary">
          Voice pipeline coming online.
        </h3>
        <p className="mx-auto mt-3 max-w-md font-sans text-[14px] leading-relaxed text-text-secondary">
          The live interview call connects to Simli avatars, ElevenLabs voices, and Deepgram transcription. That
          integration ships in the next deploy.
        </p>
        <p className="mt-4 font-mono text-[11px] tracking-label text-accent">PIPELINE · IN DEVELOPMENT</p>
      </section>
    </div>
  );
}
