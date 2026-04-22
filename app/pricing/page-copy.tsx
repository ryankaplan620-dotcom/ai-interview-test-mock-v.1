// app/pricing/page-copy.tsx
//
// Reference copy for the pricing page. Plug into your existing pricing page
// component, or use TIERS from lib/tiers.ts directly to render.
//
// Style notes:
// - No em dashes (AI-detection constraint).
// - No AI mentions in user-facing copy.
// - Feature lines use past-tense action framing where possible.
// - Free tier shows locked features with a subtle upgrade cue, not a hard
//   "UPGRADE NOW" banner. Conversion comes from the product experience,
//   not pricing page pressure.

export const PRICING_PAGE_COPY = {
  hero: {
    headline: 'Built to get you hired.',
    subhead: 'Practice interviews, sharpen your communication, and run targeted outreach. Four tiers. No filler.',
  },

  tiers: {
    free: {
      eyebrow: 'Try it',
      headline: 'Free',
      price: '$0',
      priceDetail: 'No card required',
      ctaLabel: 'Start free',
      bullets: [
        'One 10 minute interview session',
        'Access all interviewer personas',
        'Full post-session feedback',
      ],
      locked: [
        'Communication training',
        'Outreach',
      ],
      footnote: 'One session, lifetime. Upgrade to unlock the rest.',
    },

    basic: {
      eyebrow: 'Students',
      headline: 'Basic',
      price: '$49',
      priceDetail: 'for 90 days',
      ctaLabel: 'Verify and start',
      bullets: [
        '3 interview sessions, 30 minutes each',
        '4 communication training sessions',
        '10 outreach sends per month',
        'Student verified via SheerID',
      ],
      footnote: 'Overage: $20 per additional session.',
    },

    pro: {
      eyebrow: 'Most popular',
      headline: 'Pro',
      price: '$149',
      priceDetail: 'per year',
      ctaLabel: 'Go Pro',
      bullets: [
        '8 interview sessions, 30 minutes each',
        '10 communication training sessions',
        '30 outreach sends per month',
        'Full persona set and all modes',
        'Firm calibration',
      ],
      footnote: 'Overage: $20 per additional session.',
    },

    max: {
      eyebrow: 'Serious prep',
      headline: 'Max',
      price: '$249',
      priceDetail: 'per year',
      ctaLabel: 'Go Max',
      bullets: [
        '16 interview sessions, 30 minutes each',
        '20 communication training sessions',
        '100 outreach sends per month',
        'Panel and superday simulations',
        'Priority feedback queue',
        'Everything in Pro',
      ],
      footnote: 'Overage: $15 per additional session.',
    },
  },

  faq: [
    {
      q: 'Why is Basic only for students?',
      a: 'Basic uses discounted pricing verified through SheerID. If you are not a current student, Pro is the entry tier.',
    },
    {
      q: 'What counts as overage?',
      a: 'If you use every interview session included in your plan and want another, overage is a one time charge per session. You pay only for what you use past your allotment.',
    },
    {
      q: 'What is communication training?',
      a: 'Short 10 minute practice drills focused on presentation, storytelling, and answering behavioral prompts. Designed for reps between full interviews.',
    },
    {
      q: 'What is outreach?',
      a: 'Folio identifies relevant contacts at firms you target, drafts introduction emails in your voice, and sends them on your behalf. Outreach sends are capped per month by tier.',
    },
    {
      q: 'Can I cancel?',
      a: 'Yes. Basic ends automatically after 90 days. Pro and Max auto-renew yearly and can be canceled any time from your account settings.',
    },
  ],
};
