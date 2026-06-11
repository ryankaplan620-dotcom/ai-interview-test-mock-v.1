/**
 * Sanity check for persona prompt composition. Run: npx tsx scripts/check-prompt-composition.ts
 * Asserts that everything composeSystemPrompt is supposed to wire in actually
 * lands in the prompt, and that no runtime template tokens leak through.
 */
import { PERSONAS, composeSystemPrompt } from "../lib/personas";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
}

// --- Sarah, technical, standard mode, firm calibration + memory + intel ---
const sarah = composeSystemPrompt(PERSONAS.sarah, {
  mode: "standard",
  interviewType: "technical",
  candidateFirstName: "Ryan",
  targetFirm: "Stripe",
  targetRole: "backend engineering",
  targetDurationMinutes: 30,
  sessionSeed: "session-abc",
  sessionMemorySummary: "MEMORY_PAYLOAD_MARKER: candidate previously described a Kafka pipeline.",
  companyIntelSummary: "INTEL_PAYLOAD_MARKER: Stripe runs a Ruby monolith with Go services.",
});

check("sarah: standard-mode overlay injected", sarah.systemPrompt.includes("DIFFICULTY: NORMAL"));
check("sarah: technical module injected", sarah.systemPrompt.includes("This is your home court"));
check("sarah: memory payload via hook", sarah.systemPrompt.includes("MEMORY_PAYLOAD_MARKER"));
check("sarah: intel payload via hook", sarah.systemPrompt.includes("INTEL_PAYLOAD_MARKER"));
check("sarah: seeded questions present", sarah.systemPrompt.includes("## Question material (private)"));
check("sarah: voice realism block present", sarah.systemPrompt.includes("## Live voice channel"));
check("sarah: firm calibration present", sarah.systemPrompt.includes("targeting Stripe"));
check("sarah: COMPANY resolved in opening", sarah.firstTurnInstruction.includes("Stripe"));
check("sarah: name resolved in opening", sarah.firstTurnInstruction.includes("Ryan"));
for (const token of ["{{COMPANY}}", "{{ROLE}}", "{{INTERVIEW_TYPE}}", "{{DURATION_MINUTES}}", "{{CANDIDATE_FIRST_NAME}}", "{{SESSION_MEMORY}}", "{{COMPANY_INTEL}}"]) {
  check(`sarah: no leaked ${token}`, !sarah.systemPrompt.includes(token) && !sarah.firstTurnInstruction.includes(token));
}

// Stability: same seed -> same questions
const sarah2 = composeSystemPrompt(PERSONAS.sarah, {
  mode: "standard",
  interviewType: "technical",
  candidateFirstName: "Ryan",
  targetFirm: "Stripe",
  targetRole: "backend engineering",
  targetDurationMinutes: 30,
  sessionSeed: "session-abc",
  sessionMemorySummary: "MEMORY_PAYLOAD_MARKER: candidate previously described a Kafka pipeline.",
  companyIntelSummary: "INTEL_PAYLOAD_MARKER: Stripe runs a Ruby monolith with Go services.",
});
check("sarah: prompt stable across turns (cacheable)", sarah.systemPrompt === sarah2.systemPrompt);

// --- Sarah, hard_mode stacks true-hard on top ---
const sarahHard = composeSystemPrompt(PERSONAS.sarah, {
  mode: "hard",
  interviewType: "hard_mode",
  targetDurationMinutes: 45,
  sessionSeed: "session-def",
});
check("sarah hard_mode: true-hard overlay stacked", sarahHard.systemPrompt.includes("DIFFICULTY: TRUE_HARD"));
check("sarah hard_mode: hard overlay from mode", sarahHard.systemPrompt.includes("DIFFICULTY: HARD"));

// --- Gemma, behavioral, easy, first session (no memory) ---
const gemma = composeSystemPrompt(PERSONAS.gemma, {
  mode: "easy",
  interviewType: "behavioral",
  targetDurationMinutes: 25,
  sessionSeed: "session-xyz",
});
check("gemma: easy overlay injected", gemma.systemPrompt.includes("DIFFICULTY: EASY"));
check("gemma: no memory hook without memory", !gemma.systemPrompt.includes("SESSION_MEMORY_HOOK POINT"));
check("gemma: voice realism block present", gemma.systemPrompt.includes("## Live voice channel"));
check("gemma: no-name guidance present", gemma.systemPrompt.includes("not been given the candidate's name"));
check("gemma: seeded questions present", gemma.systemPrompt.includes("## Question material (private)"));

// --- Gemma standard mode ---
const gemmaStd = composeSystemPrompt(PERSONAS.gemma, {
  mode: "standard",
  interviewType: "behavioral",
  targetDurationMinutes: 25,
  sessionSeed: "session-xyz",
});
check("gemma: standard overlay injected", gemmaStd.systemPrompt.includes("DIFFICULTY: STANDARD"));

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
