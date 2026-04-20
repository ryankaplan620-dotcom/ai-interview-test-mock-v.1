import type { QuestionBank } from "../types";

/**
 * Consulting case bank — for Priya (McKinsey) and future consulting personas.
 *
 * Cases are short-form; Priya uses them as the back half of a 30-minute screen.
 * Each case includes the setup and key data the interviewer should reveal on demand.
 */
export const CONSULTING_CASE_BANK: QuestionBank = [
  {
    id: "case_coffee_shop",
    category: "consulting_case",
    prompt:
      "Our client is a regional coffee chain. They've opened 40 stores over the last five years, all profitable. They just opened their 41st store in a new city and it's losing money after three months. What could be going on?",
    followups: [
      "Walk me through how you'd structure this.",
      "If revenue per customer is the same as other stores, what does that tell us?",
      "How would you test whether it's a location issue versus an operations issue?",
    ],
    difficulty: "standard",
    tags: ["profitability", "expansion", "unit-economics"],
  },
  {
    id: "case_airline_profit",
    category: "consulting_case",
    prompt:
      "A major US airline has seen revenue grow 8% year over year but profit margin drop from 12% to 4%. Walk me through what could be driving this.",
    followups: [
      "Of the drivers you listed, which would you investigate first and why?",
      "If fuel costs are the culprit, what levers does the airline have?",
      "How would this change if the industry as a whole is seeing the same pattern?",
    ],
    difficulty: "standard",
    tags: ["profitability", "macro", "cost-structure"],
  },
  {
    id: "case_hospital_bed",
    category: "consulting_case",
    prompt:
      "A hospital CEO calls us. Their emergency department has seen wait times double in the last year with the same patient volume. What's going on and what do we do?",
    followups: [
      "Is this a supply problem or a demand problem?",
      "How would you prioritise the levers you'd consider?",
      "What's the lowest-cost intervention you'd try first?",
    ],
    difficulty: "hard",
    tags: ["healthcare", "operations", "throughput"],
  },
  {
    id: "case_market_size_umbrellas",
    category: "consulting_case",
    prompt:
      "Estimate the total annual revenue from umbrella sales in the United States.",
    followups: [
      "Walk me through your assumptions.",
      "Which of those assumptions is the one you're least sure about?",
      "How would the answer change if you included bulk corporate purchases?",
    ],
    difficulty: "easy",
    tags: ["market-sizing"],
  },
  {
    id: "case_market_size_ev",
    category: "consulting_case",
    prompt:
      "Estimate the number of electric vehicle charging stations that will exist in the US in five years.",
    followups: [
      "What are the two biggest drivers of that number?",
      "How confident are you in your growth rate assumption?",
      "What policy changes would move this number the most?",
    ],
    difficulty: "standard",
    tags: ["market-sizing", "forecasting"],
  },
  {
    id: "case_subscription_churn",
    category: "consulting_case",
    prompt:
      "A consumer software company has monthly churn of 8%. Their target is 4%. What's your approach to cutting it in half?",
    followups: [
      "How would you segment their customers to find the biggest churn pocket?",
      "Product fixes versus pricing versus service — which lever first, and why?",
      "What would make you say the 4% target is unrealistic?",
    ],
    difficulty: "hard",
    tags: ["churn", "subscription", "retention"],
  },
];
