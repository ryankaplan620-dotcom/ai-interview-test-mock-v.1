# folio-web

Folio — an AI interview-practice product. Users run live voice/video mock interviews
against AI personas (Sarah, Gemma), get structured feedback and Q&A scoring, track
progress across sessions, and use company-intel + outreach tooling to prep for real
interviews.

**Signature line:** Built to get you hired.
**Domain:** folio.io

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

Most external integrations (Tavus, ElevenLabs, Deepgram, Anthropic, R2, Upstash) fall
back to mock mode when their API keys are unset, so the app is usable locally without
full credentials. Supabase (auth + database) and Stripe (billing) are required for
their respective features to work — see `.env.example` for the full annotated list.

---

## Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** with the Folio brand token system
- **Supabase** for auth, Postgres, and file storage
- **Stripe** for subscription billing (Free/Basic/Pro/Max tiers)
- **Anthropic Claude API** for feedback generation, memory extraction, and Q&A scoring
- **Tavus** for the AI video-interviewer avatar + conversation orchestration
- **ElevenLabs** for TTS, **Deepgram** for speech-to-text
- **Cloudflare R2** for transcript/recording storage
- **Upstash Redis** for per-user rate limiting
- **Resend** for transactional email
- **Sentry** for error monitoring (via Next.js instrumentation hook)
- **Zod** for input validation

All fonts loaded via `next/font`: Open Sauce One/Two (sans/display) and JetBrains Mono
(labels and eyebrows).

---

## Project structure

```
folio-web/
├── app/
│   ├── (auth)/                    Login, signup
│   ├── (app)/                     Logged-in product: dashboard, sessions,
│   │                              practice, outreach, settings
│   ├── (session)/                 Live interview session UI
│   ├── admin/                     Internal company-intel admin views
│   ├── api/                       Route handlers (Stripe, Tavus, feedback,
│   │                              outreach, memory, verification, etc.)
│   ├── auth/callback/             Supabase OAuth callback
│   ├── legal/                     Terms, privacy, cookies
│   └── (about|careers|contact|faq|how-it-works|pricing|security)/
│                                  Marketing pages
├── components/
│   ├── FolioMark.tsx              Logo monogram SVG (brand-locked geometry)
│   ├── AppNav.tsx                 Logged-in product nav
│   ├── landing/                   Marketing-page sections (Hero, FAQ, Pricing, ...)
│   ├── legal/                     Legal-page components
│   └── marketing/                 Shared marketing components
├── lib/
│   ├── auth/                      Auth helpers
│   ├── stripe/                    Checkout, client, webhook handlers
│   ├── pipeline/                  Voice/video session pipeline (Tavus, R2, memory,
│   │                              QA feedback, persona registry)
│   ├── personas/                  Persona prompt composition
│   ├── practice/                  Practice-mode feedback generation
│   ├── outreach/                  Outreach draft/scout/send
│   ├── intel/                     Company-intel fetchers
│   ├── gates/                     Feature/quota gating
│   ├── rate-limit/                Upstash-backed rate limiting
│   ├── verification/              Student verification (SheerID / edu-email)
│   ├── db/                        Supabase client + queries
│   ├── legal/                     Legal-document constants
│   └── tiers.ts                   Subscription tier definitions
├── middleware.ts                  Route protection + session refresh
├── instrumentation.ts             Sentry server/edge init
├── supabase/                      Database migrations
├── scripts/                       Stress-test and bootstrap scripts
├── tailwind.config.ts             Brand token system
└── next.config.js                 Security headers + image optimization
```

---

## Environment variables

See `.env.example` for the complete, annotated list — it documents required vs.
optional variables per integration and what happens locally when a key is unset.

At minimum for local dev with auth working: the Supabase variables. For billing:
the Stripe variables. Everything else degrades gracefully to mock mode.

---

## Development scripts

```bash
npm run dev        # start the dev server
npm run build       # production build
npm run lint         # ESLint (next lint)
npm run typecheck    # tsc --noEmit
npm run db:push      # push Supabase migrations
```

`scripts/` also has one-off stress/smoke scripts (rate limiting, cookie consent,
Stripe webhooks, personas, memory) — run with `tsx scripts/<name>.ts`.

---

## Deployment

Deploys to Vercel.

```bash
# Connect the repo to Vercel
vercel link

# Set environment variables in the Vercel dashboard
# Then deploy
vercel --prod
```

Point folio.io DNS to Vercel (Project Settings → Domains).

---

## Design system reference

### Colors

| Token | Hex | Use |
|---|---|---|
| `accent` | #63D88A | Brand accent — Folio Mint |
| `accent-deep` | #41B06C | Hover/pressed state |
| `accent-highlight` | #82E8A5 | Gradients and lighter emphasis |
| `violet` | #885DEB | Secondary accent — Intelligence Violet |
| `cosmos` | #0D042B | Cover/hero canvas |
| `ink` | #0E1116 | Dark-mode canvas |
| `ink-surface` | #151923 | Elevated dark surfaces |
| `canvas` | #F7F8FA | Light marketing canvas |
| `text-primary` | #F2F4F8 | Primary text on dark |
| `text-secondary` | #A6ADBB | Muted text on dark |
| `text-onAccent` | #07140C | Text on accent-colored surfaces (always dark, never white) |

See `tailwind.config.ts` for the full token set (brand scale, paper/canvas surfaces,
shadows, animations).

### Typography

- Display headlines: `font-display` (Open Sauce Two) at `font-semibold` (600)
- Body: `font-sans` (Open Sauce One) at `font-normal` (400)
- Labels/eyebrows: `font-mono` (JetBrains Mono) at `font-medium` (500) with `tracking-label`
- No dedicated serif — italic accents render in Open Sauce One italic

### Critical brand rules

1. Never alter the Folio monogram geometry (see `components/FolioMark.tsx`).
2. Always use `text-onAccent` (dark ink) on accent-colored surfaces — never white.
3. No "AI" language in user-facing copy.
4. No emoji in product UI.
5. No exclamation marks except inside quoted user dialog.

---

*Folio — Built to get you hired.*
