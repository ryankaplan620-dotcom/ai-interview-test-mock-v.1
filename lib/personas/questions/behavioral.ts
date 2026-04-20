import type { QuestionBank } from "../types";

/**
 * Behavioral question bank — shared across all personas.
 *
 * The orchestrator samples from this bank based on difficulty tier and tags.
 * Each question includes follow-ups the persona should keep ready.
 */
export const BEHAVIORAL_BANK: QuestionBank = [
  {
    id: "beh_disagree_teammate",
    category: "behavioral",
    prompt: "Tell me about a time you disagreed with a teammate. How did you handle it?",
    followups: [
      "What was their position, in their words?",
      "What did you change your mind about, if anything?",
      "How's your relationship with them now?",
    ],
    difficulty: "standard",
    tags: ["disagreement", "collaboration", "emotional-intelligence"],
  },
  {
    id: "beh_failure",
    category: "behavioral",
    prompt: "Tell me about a time you failed. What did you learn?",
    followups: [
      "What did you specifically get wrong?",
      "What would you do differently if it happened tomorrow?",
      "Who else was affected, and how did you handle that?",
    ],
    difficulty: "standard",
    tags: ["failure", "self-awareness", "growth"],
  },
  {
    id: "beh_ambiguity",
    category: "behavioral",
    prompt: "Tell me about a time you led through ambiguity — you didn't have a clear answer or a playbook.",
    followups: [
      "What was the first move you made, and why that one?",
      "Who did you lean on, and what did they actually help with?",
      "What did you get wrong in the moment that's clearer now?",
    ],
    difficulty: "standard",
    tags: ["leadership", "ambiguity", "decision-making"],
  },
  {
    id: "beh_change_mind",
    category: "behavioral",
    prompt: "Tell me about a time you changed someone's mind.",
    followups: [
      "What was the hardest part of their position to overcome?",
      "What would have happened if you didn't change it?",
      "Have you ever tried the same approach and had it fail?",
    ],
    difficulty: "standard",
    tags: ["persuasion", "communication"],
  },
  {
    id: "beh_deadline",
    category: "behavioral",
    prompt: "Tell me about a time you worked on a team under a tight deadline. What was your role?",
    followups: [
      "What would you have done with double the time?",
      "What did you have to cut?",
      "Who on the team carried the most weight, and what made them good?",
    ],
    difficulty: "easy",
    tags: ["teamwork", "execution", "pressure"],
  },
  {
    id: "beh_proud",
    category: "behavioral",
    prompt: "What's a piece of work you're most proud of, and why that one?",
    followups: [
      "What was the hardest moment in it?",
      "Who else would take credit for this if we asked them?",
      "What would you do differently?",
    ],
    difficulty: "easy",
    tags: ["motivation", "self-reflection"],
  },
  {
    id: "beh_initiative",
    category: "behavioral",
    prompt: "Tell me about a time you noticed a problem that wasn't yours to solve, and did something about it.",
    followups: [
      "Who could have stopped you from doing it?",
      "How did you know the problem was real and not just something that annoyed you?",
      "What was the outcome — honestly?",
    ],
    difficulty: "standard",
    tags: ["initiative", "ownership"],
  },
  {
    id: "beh_criticism",
    category: "behavioral",
    prompt: "Tell me about a piece of feedback you received that was hard to hear. What did you do with it?",
    followups: [
      "Did you agree with it in the moment?",
      "How has your behaviour actually changed?",
      "What's a piece of feedback you've rejected and not acted on?",
    ],
    difficulty: "hard",
    tags: ["feedback", "self-awareness", "growth"],
  },
  {
    id: "beh_changed_mind",
    category: "behavioral",
    prompt: "What's something important you've changed your mind about in the last year? What changed it?",
    followups: [
      "Who helped you see the other side?",
      "Is there anyone you'd need to go back to and say you were wrong?",
      "What's something you suspect you might be wrong about now?",
    ],
    difficulty: "hard",
    tags: ["intellectual-honesty", "growth"],
  },
  {
    id: "beh_push_back",
    category: "behavioral",
    prompt: "Tell me about a time you pushed back on your manager or someone senior to you.",
    followups: [
      "What were you risking by doing it?",
      "How did you frame it?",
      "If you could replay the conversation, what would you change?",
    ],
    difficulty: "hard",
    tags: ["leadership", "disagreement", "courage"],
  },
  {
    id: "beh_fast_learn",
    category: "behavioral",
    prompt: "Tell me about something you had to learn quickly when you had no background in it.",
    followups: [
      "What was your first step — concretely?",
      "Who did you go to first, and why them?",
      "How would you teach it to someone else now?",
    ],
    difficulty: "standard",
    tags: ["learning", "adaptability"],
  },
  {
    id: "beh_why_firm",
    category: "behavioral",
    prompt: "Why this firm, specifically. Not why the industry — why us.",
    followups: [
      "Who have you talked to here, and what did they tell you that stuck?",
      "What are we bad at, in your opinion?",
      "If you had to pick a second choice firm, who would it be and why?",
    ],
    difficulty: "standard",
    tags: ["motivation", "fit", "firm-specific"],
  },
];
