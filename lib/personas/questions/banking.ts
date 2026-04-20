import type { QuestionBank } from "../types";

/**
 * Banking bank — for Marcus (Goldman) and future banking personas.
 *
 * Mix of fit questions and foundational technicals. Keep technicals conceptual —
 * these are screens, not superday rounds. Marcus selects based on mode.
 */
export const BANKING_BANK: QuestionBank = [
  // ------------------------------------------------------------------------
  // Fit
  // ------------------------------------------------------------------------
  {
    id: "bank_why_banking",
    category: "banking_fit",
    prompt: "Why banking?",
    followups: [
      "What specifically about the day-to-day work draws you?",
      "What do you think the downside of this job is?",
      "What would make you reconsider after your first year?",
    ],
    difficulty: "standard",
    tags: ["motivation", "fit"],
  },
  {
    id: "bank_why_goldman",
    category: "banking_fit",
    prompt: "Why Goldman specifically. Not why banking — why us over JP Morgan, Morgan Stanley, or Evercore.",
    followups: [
      "Who have you talked to here?",
      "What's one thing you think we do worse than the others?",
      "If we don't offer, who's your second choice, honestly?",
    ],
    difficulty: "hard",
    firmTags: ["goldman-sachs"],
    tags: ["fit", "firm-specific"],
  },
  {
    id: "bank_walk_resume",
    category: "banking_fit",
    prompt: "Walk me through your story. Ninety seconds.",
    followups: [
      "You mentioned X — why that, and not something else?",
      "What's the thread connecting all of these?",
      "What would your last manager say your biggest growth area is?",
    ],
    difficulty: "standard",
    tags: ["story", "resume"],
  },

  // ------------------------------------------------------------------------
  // Technicals — foundational
  // ------------------------------------------------------------------------
  {
    id: "bank_three_statements",
    category: "banking_technical",
    prompt: "How do the three financial statements link together?",
    followups: [
      "If depreciation increases by 10 dollars, walk me through the full impact assuming a 25% tax rate.",
      "Which statement would you look at first if you wanted to understand the business?",
    ],
    difficulty: "standard",
    tags: ["accounting", "statements"],
  },
  {
    id: "bank_wc_change",
    category: "banking_technical",
    prompt: "A company's working capital increases by 10 dollars. What happens to free cash flow, and why?",
    followups: [
      "What does an increase in working capital actually look like operationally?",
      "Is increasing working capital always bad?",
    ],
    difficulty: "standard",
    tags: ["cash-flow", "working-capital"],
  },
  {
    id: "bank_dcf_basics",
    category: "banking_technical",
    prompt: "What's a DCF, and what are the main drivers of the output?",
    followups: [
      "Which assumption is the DCF most sensitive to in most cases?",
      "When would a DCF give you a misleading answer?",
    ],
    difficulty: "standard",
    tags: ["valuation", "dcf"],
  },
  {
    id: "bank_accretion_dilution",
    category: "banking_technical",
    prompt: "What does an accretion/dilution analysis test, at a high level?",
    followups: [
      "If an acquirer trades at a higher PE than the target, is the deal accretive or dilutive and why?",
      "What's a reason a dilutive deal might still be a good deal?",
    ],
    difficulty: "standard",
    tags: ["m-and-a", "accretion-dilution"],
  },
  {
    id: "bank_lbo_conceptual",
    category: "banking_technical",
    prompt: "Walk me through an LBO at a conceptual level. No math.",
    followups: [
      "What makes a good LBO candidate?",
      "What are the main drivers of sponsor returns?",
      "What kills an LBO return most often in practice?",
    ],
    difficulty: "standard",
    tags: ["lbo", "private-equity"],
  },
  {
    id: "bank_ev_equity",
    category: "banking_technical",
    prompt: "What's the difference between enterprise value and equity value?",
    followups: [
      "Why do we use EV/EBITDA instead of P/E for most M&A analyses?",
      "When would you use a revenue multiple over an EBITDA multiple?",
    ],
    difficulty: "easy",
    tags: ["valuation", "multiples"],
  },
  {
    id: "bank_goodwill",
    category: "banking_technical",
    prompt: "A company buys another company for more than its book value. What happens on the balance sheet?",
    followups: [
      "Does goodwill get amortised?",
      "When does goodwill get impaired, and what's the impact?",
    ],
    difficulty: "hard",
    tags: ["accounting", "m-and-a"],
  },
];
