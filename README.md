# folio-web

Production landing page for Folio.

**Primary tagline:** The interview before the interview.
**Signature line:** Built to get you hired.
**Domain:** folio.io
**Brand color:** Electric Emerald (#00F590) on Ink-navy (#0D1117)

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

The waitlist form will work locally without any configuration — signups just log to the console. When you add a `RESEND_API_KEY`, the form sends real welcome emails and adds contacts to a Resend audience.

---

## Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** with full Folio brand token system
- **Resend** for transactional email (optional for local dev)
- **Zod** for input validation

All fonts loaded via `next/font/google`:

- **Inter / Inter Display** — sans (headlines + body)
- **Georgia** — system serif for italic display accents
- **JetBrains Mono** — labels and eyebrows
- **Cinzel / Playfair Display / Spectral / Crimson Text** — wordmark-style serifs for the proof row

---

## Project structure

```
folio-web/
├── app/
│   ├── api/waitlist/route.ts     Waitlist signup endpoint (Resend-backed)
│   ├── globals.css               Base styles + brand CSS variables
│   ├── layout.tsx                Root layout with all fonts + SEO meta
│   └── page.tsx                  Landing page
├── components/
│   ├── FolioMark.tsx             Logo monogram SVG (brand-locked geometry)
│   └── landing/
│       ├── Nav.tsx               Top navigation
│       ├── Hero.tsx              Hero section + DemoCard + proof row
│       ├── Waitlist.tsx          Waitlist section
│       ├── WaitlistForm.tsx      Client-side form with optimistic UI
│       └── Footer.tsx            Footer with signature line + domain
├── public/
│   ├── images/luke.jpg           Interviewer portrait (Luke Anderson)
│   ├── favicon-*.png             Favicon set (16/32/48)
│   ├── apple-touch-icon.png      iOS homescreen icon
│   ├── og-default.png            OpenGraph social share image
│   └── site.webmanifest          Web app manifest
├── tailwind.config.ts            Brand token system
├── next.config.js                Security headers + image optimization
└── tsconfig.json                 TypeScript strict config
```

---

## Environment variables

### Required for production

- `NEXT_PUBLIC_APP_URL` — your production URL (https://folio.io)

### Optional (graceful degradation if not set)

- `RESEND_API_KEY` — enables real welcome emails + waitlist audience
- `RESEND_AUDIENCE_ID` — Resend audience ID for the waitlist
- `WAITLIST_NOTIFY_EMAIL` — email address to notify of new signups

See `FOLIO-SETUP-PLAN.md` for the complete environment variable list that Phase 1 codebase adds.

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

Point folio.io DNS to Vercel per the instructions in `FOLIO-SETUP-PLAN.md` Phase 6.

---

## Design system reference

### Colors

| Token | Hex | Use |
|---|---|---|
| `accent` | #00F590 | Brand accent — Electric Emerald |
| `accent-deep` | #00D478 | Hover/pressed state |
| `accent-highlight` | #33FAA6 | Gradients and lighter emphasis |
| `ink` | #0D1117 | Primary canvas |
| `ink-surface` | #161B22 | Elevated surfaces |
| `ink-border` | #2A3139 | Subtle borders |
| `text-primary` | #F0F6FC | Primary text on dark |
| `text-secondary` | #A8B0BA | Muted text on dark |
| `text-tertiary` | #6E7681 | Most muted text on dark |
| `text-onAccent` | #0D1117 | Text on accent buttons (always dark, never white) |

### Typography

- Display headlines: `font-display` (Inter Display) at `font-semibold` (600)
- Italic accents: `font-serif` (Georgia) at `italic font-normal`
- Body: `font-sans` (Inter) at `font-normal` (400)
- Labels/eyebrows: `font-mono` (JetBrains Mono) at `font-medium` (500) with `tracking-label`

### Critical brand rules

1. Never alter the Folio monogram geometry (see `components/FolioMark.tsx`).
2. Always use `text-onAccent` (dark ink) on accent-colored surfaces — never white.
3. No "AI" language in user-facing copy.
4. No emoji in product UI.
5. No exclamation marks except inside quoted user dialog.

---

*Folio — Built to get you hired.*
