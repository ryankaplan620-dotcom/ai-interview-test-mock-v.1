import type { QuestionBank } from "../types";

/**
 * PE/Finance bank — for David (Bain Capital) and future PE personas.
 *
 * Mix of fit, deal walkthroughs, and conceptual technicals.
 * David's interview assumes banking analyst background; questions calibrate accordingly.
 */
export const PE_FINANCE_BANK: QuestionBank = [
  // ------------------------------------------------------------------------
  // Fit
  // ------------------------------------------------------------------------
  {
    id: "pe_why_pe",
    category: "pe_fit",
    prompt: "Why PE?",
    followups: [
      "What specifically about investing — not diligence, investing.",
      "What do you think the downside of this job is?",
      "What would make you not want to stay past associate?",
    ],
    difficulty: "standard",
    tags: ["motivation", "fit"],
  },
  {
    id: "pe_deal_walkthrough",
    category: "pe_fit",
    prompt: "Walk me through a deal you worked on as an analyst.",
    followups: [
      "How did the sponsor think about the purchase price?",
      "What was the value creation thesis? Was it credible?",
      "What would you have done differently if you were the sponsor?",
    ],
    difficulty: "standard",
    tags: ["deal-experience", "investment-judgment"],
  },
  {
    id: "pe_pitch_deal",
    category: "pe_fit",
    prompt:
      "Pitch me a deal. A public company you'd take private, or a private company you've been following. Give me the thesis.",
    followups: [
      "What's the bear case?",
      "What do you have to believe for this to work?",
      "At what price does the deal stop being attractive?",
    ],
    difficulty: "hard",
    tags: ["deal-pitch", "thesis", "judgment"],
  },
  {
    id: "pe_why_bcap",
    category: "pe_fit",
    prompt: "Why Bain Capital specifically — not KKR, not Blackstone, not Apollo. Us.",
    followups: [
      "Who have you talked to here?",
      "What do you think we do differently than the megafunds?",
      "Where would you want to focus — consumer, industrials, tech, healthcare?",
    ],
    difficulty: "hard",
    firmTags: ["bain-capital"],
    tags: ["fit", "firm-specific"],
  },

  // ------------------------------------------------------------------------
  // Conceptual technicals
  // ------------------------------------------------------------------------
  {
    id: "pe_lbo_conceptual",
    category: "pe_technical",
    prompt:
      "Walk me through an LBO at a conceptual level. Assume 10x EBITDA entry, 50% equity, 8% EBITDA growth, same exit multiple in year five. Rough IRR.",
    followups: [
      "Which assumption is the most sensitive one in this math?",
      "If debt paydown is 20% of EBITDA per year, how does that change the answer?",
      "Sanity-check your number against typical PE return targets — does it make sense?",
    ],
    difficulty: "standard",
    tags: ["lbo", "returns", "math"],
  },
  {
    id: "pe_irr_drivers",
    category: "pe_technical",
    prompt: "What are the main drivers of IRR in an LBO?",
    followups: [
      "Which driver does a sponsor have the most control over?",
      "Which driver is most at risk from macro factors the sponsor doesn't control?",
      "What's a deal you'd walk away from even if the financial engineering looked fine?",
    ],
    difficulty: "standard",
    tags: ["returns", "value-creation"],
  },
  {
    id: "pe_good_target",
    category: "pe_technical",
    prompt: "What makes a good LBO target?",
    followups: [
      "You said stable cash flows. What makes cash flows actually stable? Is stability durable?",
      "Can you think of a business with stable cash flows today that won't have them in five years?",
      "How do you think about pricing power in this context?",
    ],
    difficulty: "hard",
    tags: ["investment-criteria", "judgment"],
  },
  {
    id: "pe_leverage",
    category: "pe_technical",
    prompt: "How do you think about how much leverage to put on a deal?",
    followups: [
      "What's the relationship between leverage and IRR, holding everything else constant?",
      "What breaks down when leverage is too high — practically, not theoretically?",
      "How does the current rate environment change your view?",
    ],
    difficulty: "hard",
    tags: ["capital-structure", "risk"],
  },
  {
    id: "pe_multiple_expansion",
    category: "pe_technical",
    prompt: "When does multiple expansion actually happen in PE, and when is it wishful thinking?",
    followups: [
      "Give me an example of a fund that earned real multiple expansion — why?",
      "What's a tell that a thesis is relying on multiple expansion as a crutch?",
      "How do you underwrite without assuming it?",
    ],
    difficulty: "hard",
    tags: ["returns", "judgment", "value-creation"],
  },
];
