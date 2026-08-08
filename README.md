# folio-web

Folio — AI-powered mock interview practice and job-search outreach.

**Signature line:** Built to get you hired.
**Domain:** folio.io
**Brand system:** Folio Mint (#63D88A) accent, Intelligence Violet (#885DEB) secondary, Ink-dark (#0E1116) canvas. See `tailwind.config.ts` for the full token system.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Every third-party integration (Supabase, Stripe, Deepgram, Tavus, Anthropic, Resend) falls back to a mock mode locally when its keys are unset — see `.env.example` for the annotated list of what each one unlocks.

---

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict mode)
- **Supabase** — Postgres, auth, and row-level security (`supabase/migrations/`)
- **Stripe** — subscription billing + one-off overage-session purchases
- **Anthropic Claude** — live interview turns, feedback generation, outreach drafting, company intel
- **Deepgram** — real-time (live interview) and pre-recorded (practice drills) speech-to-text
- **Tavus** — avatar video for live mock interviews
- **Resend** — transactional email
- **Tailwind CSS** with the full Folio brand token system
- **Zod** for input validation across API routes

## Project structure

```
folio-web/
├── app/
│   ├── (auth)/                  Login / signup
│   ├── (app)/                   Authenticated product: dashboard, sessions,
│   │                            practice drills, outreach, settings
│   ├── (session)/session/[id]/  Live mock-interview client pipeline
│   ├── admin/                   Internal company-intel admin views
│   ├── api/                     Route handlers — interview turns, feedback,
│   │                            practice attempts, outreach, Stripe/Tavus/
│   │                            Deepgram webhooks and integrations
│   └── (marketing pages)        /, /about, /pricing, /faq, /security, ...
├── lib/
│   ├── auth/                    Session helpers (getUser/requireUser)
│   ├── db/                      Supabase client factories
│   ├── stripe/                  Webhook handlers + billing logic
│   ├── pipeline/                Live-interview Claude/Deepgram/Tavus pipeline
│   ├── practice/                Drill definitions + feedback generation
│   ├── outreach/                Contact scouting + email drafting
│   ├── intel/                   Company intelligence fetch/cache/inject
│   ├── personas/                Interviewer persona prompts
│   └── rate-limit/               Per-user sliding-window rate limiting
├── supabase/migrations/         Tracked schema, in apply order
├── scripts/                     Stress-test harnesses (`npx tsx scripts/...`)
│                                 and one-off ops scripts (bootstrap, smoke)
├── tailwind.config.ts           Brand token system
└── next.config.js               Security headers + image optimization
```

---

## Environment variables

See `.env.example` for the complete annotated list, grouped by integration. Nothing is required to run the app locally — Supabase, Stripe, Deepgram, Tavus, and Anthropic all degrade to mock mode when unset. For a real deploy you need at minimum:

- `NEXT_PUBLIC_APP_URL` — your production URL (https://folio.io)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — auth + database
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_*` — billing
- `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `TAVUS_API_KEY` — the live interview pipeline

---

## Database

Schema lives in `supabase/migrations/`, applied in numeric order:

```bash
npm run db:push   # supabase db push
```

Every table that's read through the anon-key client (`lib/db/server.ts`) must have row-level security enabled with owner-scoped policies — see `0002_rls_policies.sql` and `0008_session_memory.sql` for the pattern new tables should follow.

---

## Testing

There's no Jest/Vitest suite yet. Correctness is checked via:

```bash
npm run typecheck
npm run lint
npm run build

# Scenario-based stress harnesses (in-memory mocks, no live keys needed)
npx tsx scripts/stress-stripe-webhook.ts
npx tsx scripts/stress-rate-limit.ts
npx tsx scripts/stress-personas.ts
npx tsx scripts/stress-cookie-consent.ts
npx tsx lib/intel/__tests__/intel.test.ts
```

---

## Deployment

This is ready to deploy to Vercel.

```bash
# Connect the repo to Vercel
vercel link

# Set environment variables in the Vercel dashboard
# Then deploy
vercel --prod
```

Point folio.io DNS to Vercel (Project Settings → Domains).

---

## Critical brand rules

1. Never alter the Folio monogram geometry (see `components/FolioMark.tsx`).
2. Always use `text-onAccent` (dark ink) on accent-colored surfaces — never white.
3. No "AI" language in user-facing copy.
4. No emoji in product UI.
5. No exclamation marks except inside quoted user dialog.

---

*Folio — Built to get you hired.*
