import type { QuestionBank } from "../types";

/**
 * Product bank — for Jennifer (Stripe) and future product personas.
 *
 * Mix of product sense prompts and strategy zoom-outs. Jennifer opens with the
 * "product you think is poorly designed" opener (handled in her prompt),
 * then pulls from this bank for the main case and the hard-mode strategic question.
 */
export const PRODUCT_SENSE_BANK: QuestionBank = [
  // ------------------------------------------------------------------------
  // Product sense — main case prompts
  // ------------------------------------------------------------------------
  {
    id: "prod_first_time_stripe",
    category: "product_sense",
    prompt: "Design a feature for first-time Stripe users to help them ship their first payment integration faster.",
    followups: [
      "Who's the user, specifically — the developer, the founder, or someone else?",
      "What's the one metric that tells you it worked?",
      "What's the biggest risk to your design?",
    ],
    difficulty: "standard",
    firmTags: ["stripe"],
    tags: ["onboarding", "developer-experience"],
  },
  {
    id: "prod_maps_trucks",
    category: "product_sense",
    prompt: "How would you improve Google Maps for long-haul truck drivers?",
    followups: [
      "Before we get to features — what's actually different about their experience?",
      "If you could only ship one thing, what would it be?",
      "How would you roll this out — for everyone, or as a separate mode?",
    ],
    difficulty: "standard",
    tags: ["maps", "user-research", "segmentation"],
  },
  {
    id: "prod_linkedin_grads",
    category: "product_sense",
    prompt: "How would you improve LinkedIn for recent graduates?",
    followups: [
      "What's the graduate actually trying to do on LinkedIn?",
      "Which existing LinkedIn feature is most broken for them?",
      "How would your design change if you also had to protect revenue?",
    ],
    difficulty: "standard",
    tags: ["social", "career", "user-segment"],
  },
  {
    id: "prod_ig_less_content",
    category: "product_sense",
    prompt:
      "Design a feature for Instagram that helps people see less content — intentionally.",
    followups: [
      "Why would Instagram ship something that cuts engagement?",
      "Who's the user for this?",
      "How do you measure success for a feature that reduces usage?",
    ],
    difficulty: "hard",
    tags: ["wellbeing", "tradeoffs", "business-alignment"],
  },
  {
    id: "prod_airbnb_repeat",
    category: "product_sense",
    prompt:
      "Airbnb wants to increase the rate at which users book a second trip within six months of their first. How would you approach this?",
    followups: [
      "What do we need to know about why people don't book again?",
      "What's one thing you'd ship this quarter? What's one thing you'd research first?",
      "Are there segments you'd deprioritise?",
    ],
    difficulty: "standard",
    tags: ["retention", "marketplace"],
  },
  {
    id: "prod_spotify_discovery",
    category: "product_sense",
    prompt:
      "Spotify wants more users to discover new artists they end up listening to regularly. How do you approach it?",
    followups: [
      "What's the difference between discovery and retention in this context?",
      "What metric moves if you're doing this right?",
      "What's a version of this feature that would feel creepy to the user?",
    ],
    difficulty: "standard",
    tags: ["discovery", "recommendation", "music"],
  },

  // ------------------------------------------------------------------------
  // Product strategy — harder, more zoom-out
  // ------------------------------------------------------------------------
  {
    id: "prod_strat_stripe_lever",
    category: "product_strategy",
    prompt:
      "Zoom out. If you had one month to move one number at Stripe, what number and how?",
    followups: [
      "Why that number and not something adjacent?",
      "What's the biggest constraint on moving it in a month?",
      "What would you need to see to know you were failing?",
    ],
    difficulty: "hard",
    firmTags: ["stripe"],
    tags: ["strategy", "prioritisation", "altitude"],
  },
  {
    id: "prod_strat_bet",
    category: "product_strategy",
    prompt: "What's a bet you'd make about how our market is going to change in the next three years?",
    followups: [
      "What signal would confirm or deny your view?",
      "Who's the incumbent most at risk if you're right?",
      "What would you ship now to get ready for it?",
    ],
    difficulty: "hard",
    tags: ["strategy", "market", "foresight"],
  },
  {
    id: "prod_strat_kill",
    category: "product_strategy",
    prompt: "Tell me about a feature you'd kill if you were PM of a product you use daily. Why kill it?",
    followups: [
      "What would the users who love it say about your decision?",
      "How would you communicate the kill?",
      "What's a sign you were wrong to kill it?",
    ],
    difficulty: "hard",
    tags: ["prioritisation", "tradeoffs", "judgment"],
  },
];
