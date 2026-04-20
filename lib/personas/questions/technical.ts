import type { QuestionBank } from "../types";

/**
 * Tech bank — for Sarah (Meta) and future engineering personas.
 *
 * Keep coding problems approachable. This is a new-grad screen.
 * Problems are presented verbally; the candidate walks through approach
 * then pseudocode, not production code.
 */
export const TECH_BANK: QuestionBank = [
  // ------------------------------------------------------------------------
  // Behavioral (engineering-flavored)
  // ------------------------------------------------------------------------
  {
    id: "tech_beh_decision",
    category: "tech_behavioral",
    prompt: "Tell me about a technical decision you made that you'd revisit now.",
    followups: [
      "What were the alternatives you considered at the time?",
      "What signal would have told you earlier that you were wrong?",
      "What do you think drove the mistake — missing info or biased judgment?",
    ],
    difficulty: "standard",
    tags: ["decision-making", "self-awareness"],
  },
  {
    id: "tech_beh_debug",
    category: "tech_behavioral",
    prompt: "Walk me through the hardest bug you've debugged. What made it hard?",
    followups: [
      "How did you rule out possibilities?",
      "What tools or instrumentation did you use?",
      "What would have caught this earlier?",
    ],
    difficulty: "standard",
    tags: ["debugging", "engineering-craft"],
  },
  {
    id: "tech_beh_teammate",
    category: "tech_behavioral",
    prompt: "Tell me about a time you disagreed with another engineer on a technical decision.",
    followups: [
      "What was their argument, steelmanned?",
      "How did you resolve it?",
      "Who was right, in hindsight?",
    ],
    difficulty: "standard",
    tags: ["collaboration", "disagreement"],
  },

  // ------------------------------------------------------------------------
  // Coding problems — verbal walkthrough, pseudocode level
  // ------------------------------------------------------------------------
  {
    id: "tech_code_two_sum",
    category: "tech_coding",
    prompt:
      "I'll give you an array of integers and a target. Return the indices of the two numbers that add up to the target. Walk me through your approach before coding.",
    followups: [
      "What's the naive runtime?",
      "Can we do better than that?",
      "What if the array is sorted? Does your approach change?",
      "What if there are duplicates?",
    ],
    difficulty: "easy",
    tags: ["arrays", "hash-map"],
  },
  {
    id: "tech_code_dup",
    category: "tech_coding",
    prompt:
      "Given an array of integers where every number appears twice except one, find the number that appears once.",
    followups: [
      "What's your first instinct?",
      "Can you do this in constant space?",
      "How would you trace your approach on a small example?",
    ],
    difficulty: "standard",
    tags: ["arrays", "bit-manipulation"],
  },
  {
    id: "tech_code_valid_paren",
    category: "tech_coding",
    prompt:
      "Given a string containing parentheses, brackets, and braces, determine if the string is valid — every opening has a matching closing in the correct order.",
    followups: [
      "What's the core data structure you'd reach for?",
      "What are the edge cases I should be worried about?",
      "What if the input includes other characters too?",
    ],
    difficulty: "easy",
    tags: ["strings", "stack"],
  },
  {
    id: "tech_code_merge_intervals",
    category: "tech_coding",
    prompt:
      "I give you a list of intervals. Merge any overlapping ones and return the result.",
    followups: [
      "What do you do first?",
      "What does 'overlapping' mean precisely for your logic?",
      "What's the runtime of your solution, and where does the dominant cost come from?",
    ],
    difficulty: "standard",
    tags: ["arrays", "sorting", "intervals"],
  },
  {
    id: "tech_code_tree_bfs",
    category: "tech_coding",
    prompt:
      "Given a binary tree, return the values at each level of the tree as a list of lists.",
    followups: [
      "What's the data structure you need?",
      "How do you know when you've finished one level?",
      "What would change if I asked you to do this in depth-first order instead?",
    ],
    difficulty: "standard",
    tags: ["trees", "bfs"],
  },
  {
    id: "tech_code_longest_substring",
    category: "tech_coding",
    prompt:
      "Find the length of the longest substring without repeating characters.",
    followups: [
      "What's the brute-force approach and its runtime?",
      "How would you optimise it?",
      "Walk me through your approach on 'abcabcbb'.",
    ],
    difficulty: "standard",
    tags: ["strings", "sliding-window"],
  },

  // ------------------------------------------------------------------------
  // System design seeds — used lightly for new-grad, heavily for higher levels
  // ------------------------------------------------------------------------
  {
    id: "tech_sys_url_shortener",
    category: "tech_system_design",
    prompt:
      "At a high level, how would you design a URL shortener? Walk me through the pieces.",
    followups: [
      "How do you generate the short code?",
      "What does the read path look like at scale?",
      "How do you handle collisions?",
    ],
    difficulty: "hard",
    tags: ["system-design", "storage"],
  },
  {
    id: "tech_sys_news_feed",
    category: "tech_system_design",
    prompt:
      "How would you think about designing a simple news feed — show me users a ranked list of posts from people they follow.",
    followups: [
      "Push or pull? What are the tradeoffs?",
      "How does your design change if one user has 10 million followers?",
      "Where would you cache, and why there?",
    ],
    difficulty: "hard",
    tags: ["system-design", "scalability"],
  },
];
