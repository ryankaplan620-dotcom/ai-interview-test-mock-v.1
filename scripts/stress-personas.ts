/**
 * Persona-quality audit — Phase #4.
 *
 * Context: Ryan observed that Sarah's persona feels the most coherent (voice
 * + face + conversation) in early testing. The hypothesis this script tests:
 * measurable differences in the prompts correlate with that observation,
 * and fixing those differences in the other four personas will close the gap.
 *
 * What this audit DOES:
 *   - Checks every persona prompt against a structural checklist:
 *     1. TTS guardrails (no em-dashes, no parentheticals, no stage directions)
 *     2. AI-break handling (exact response when asked "are you AI")
 *     3. Manipulation-resistance (prompt-injection counter-guidance)
 *     4. Opener is concrete (not vague)
 *     5. Four-item evaluation list (consistent across personas)
 *     6. Has both easy and hard overlays
 *     7. Abuse-handling close phrasing
 *   - Measures prompt length balance and subsection consistency.
 *   - Surfaces any asymmetries that might explain the Sarah advantage.
 *
 * What this audit does NOT do:
 *   - Evaluate actual Tavus rendering quality (replica/voice pair quality)
 *   - Run a live session or compare outputs
 *   - Make judgments about which persona is "better" — only what's
 *     structurally inconsistent.
 *
 * Output: written to stdout as a structured report with FINDINGS section
 * at the end if anything is inconsistent.
 *
 * Run: npx tsx scripts/stress-personas.ts
 */

import { SARAH_CORE_IDENTITY, SARAH_SELF_INTRODUCTION_TEMPLATE, SARAH_DIFFICULTY_OVERLAYS } from "../lib/personas/prompts/sarah";
import { GEMMA_CORE_IDENTITY, GEMMA_SELF_INTRODUCTION_TEMPLATE, GEMMA_DIFFICULTY_OVERLAYS } from "../lib/personas/prompts/gemma";

const SARAH_BASE_PROMPT = SARAH_CORE_IDENTITY;
const SARAH_EASY_OVERLAY = SARAH_DIFFICULTY_OVERLAYS.easy;
const SARAH_HARD_OVERLAY = SARAH_DIFFICULTY_OVERLAYS.hard;
const SARAH_OPENING = SARAH_SELF_INTRODUCTION_TEMPLATE;
const GEMMA_BASE_PROMPT = GEMMA_CORE_IDENTITY;
const GEMMA_EASY_OVERLAY = GEMMA_DIFFICULTY_OVERLAYS.easy;
const GEMMA_HARD_OVERLAY = GEMMA_DIFFICULTY_OVERLAYS.hard;
const GEMMA_OPENING = GEMMA_SELF_INTRODUCTION_TEMPLATE;

interface PersonaBundle {
  id: string;
  name: string;
  base: string;
  easy: string;
  hard: string;
  opening: string;
}

const PERSONAS: PersonaBundle[] = [
  { id: "sarah", name: "Sarah Chen",     base: SARAH_BASE_PROMPT,    easy: SARAH_EASY_OVERLAY,    hard: SARAH_HARD_OVERLAY,    opening: SARAH_OPENING },
  { id: "gemma", name: "Gemma Brooks",   base: GEMMA_BASE_PROMPT,    easy: GEMMA_EASY_OVERLAY,    hard: GEMMA_HARD_OVERLAY,    opening: GEMMA_OPENING },
];

// --------------------------------------------------------------------------
// Structural check definitions
// --------------------------------------------------------------------------

interface CheckResult {
  persona: string;
  check: string;
  pass: boolean;
  detail?: string;
}

const results: CheckResult[] = [];

function check(persona: string, label: string, pass: boolean, detail?: string) {
  results.push({ persona, check: label, pass, detail });
}

for (const p of PERSONAS) {
  // --- 1. TTS guardrail: no em-dashes in base prompt text ---
  //    Em-dashes cause awkward pauses in some TTS voices. All five current
  //    base prompts were written to avoid them; regressions would harm voice
  //    quality.
  const emdashMatches = p.base.match(/—/g);
  check(
    p.name,
    "No em-dashes in base prompt (TTS hygiene)",
    emdashMatches === null,
    emdashMatches ? `${emdashMatches.length} em-dashes found` : undefined,
  );

  // --- 2. TTS guardrail: explicit "no parentheticals / no stage directions" ---
  const hasStageDirGuard =
    /no stage directions/i.test(p.base) || /do not describe your tone/i.test(p.base);
  check(p.name, "Contains 'no stage directions' guardrail", hasStageDirGuard);

  // --- 3. TTS guardrail: explicit "write the way someone talks" guidance ---
  const hasSpokenGuidance = /write the way someone talks|spoken output/i.test(p.base);
  check(p.name, "Contains 'write for speech' guidance", hasSpokenGuidance);

  // --- 4. AI-break response is EXACT — not paraphrased ---
  //    Personas should refuse the "are you AI" question with a specific short
  //    response. Spec says "respond exactly: ..." followed by a quoted phrase.
  const aiBreakMatch = p.base.match(/respond exactly:\s*"([^"]+)"/);
  check(
    p.name,
    "Has exact AI-break response",
    aiBreakMatch !== null,
    aiBreakMatch ? `exact phrase: "${aiBreakMatch[1]}"` : "missing or paraphrased",
  );

  // --- 5. Prompt-injection resistance: explicit "stay in character" clause ---
  const hasInjectionGuard = /prompt.?inject|stay.*character|go meta|derail/i.test(p.base);
  check(p.name, "Contains prompt-injection guardrail", hasInjectionGuard);

  // --- 6. Abuse close: explicit phrasing for "end the call" ---
  const hasAbuseClose =
    /end the call|we're done here|end here|wrap here|stop engaging|stop\.?\s*$/im.test(p.base);
  check(p.name, "Contains abuse-handling close", hasAbuseClose);

  // --- 7. Evaluation list: exactly 4 numbered items under "What you are evaluating" ---
  //    Sarah, Priya, Marcus all use a 4-item list. Consistency
  //    matters because the feedback rubric maps to these 4 dimensions.
  const evalSection = p.base.match(/## What you are evaluating\n([\s\S]*?)(?=\n## )/);
  if (evalSection) {
    const numbered = evalSection[1].match(/^\d+\./gm);
    const count = numbered?.length ?? 0;
    check(
      p.name,
      "Evaluation list has 4 items",
      count === 4,
      `found ${count} items`,
    );
  } else {
    check(p.name, "Evaluation list has 4 items", false, "no '## What you are evaluating' section");
  }

  // --- 8. Has both easy and hard overlays ---
  check(p.name, "Has easy mode overlay", p.easy.trim().length > 50);
  check(p.name, "Has hard mode overlay", p.hard.trim().length > 50);

  // --- 9. Opening is a complete instruction, not a placeholder ---
  check(p.name, "Has concrete opening", p.opening.trim().length > 50 && /begin/i.test(p.opening));

  // --- 10. Length balance — base prompts should cluster in a reasonable range ---
  //    Under 3500 chars = likely under-specified; over 8000 = risks context
  //    issues with Tavus. Sarah at 6347 is near the upper cluster; Marcus at
  //    5571 is near the lower. Neither is anomalous but this check flags
  //    drift in either direction.
  const charCount = p.base.length;
  check(
    p.name,
    "Base prompt in healthy length range (3500-8000 chars)",
    charCount >= 3500 && charCount <= 8000,
    `${charCount} chars`,
  );
}

// --------------------------------------------------------------------------
// Cross-persona structural symmetry
// --------------------------------------------------------------------------

console.log("\n=== Persona structural audit ===\n");

for (const p of PERSONAS) {
  console.log(`## ${p.name} (${p.id})`);
  console.log(`   Base prompt: ${p.base.length} chars`);
  console.log(`   Easy overlay: ${p.easy.length} chars`);
  console.log(`   Hard overlay: ${p.hard.length} chars`);
  console.log(`   Opening:     ${p.opening.length} chars`);
  const personaResults = results.filter((r) => r.persona === p.name);
  const failed = personaResults.filter((r) => !r.pass);
  if (failed.length === 0) {
    console.log("   ✓ All structural checks passed");
  } else {
    console.log(`   ✗ ${failed.length} structural issues:`);
    for (const r of failed) {
      console.log(`     - ${r.check}${r.detail ? ` (${r.detail})` : ""}`);
    }
  }
  console.log("");
}

// --------------------------------------------------------------------------
// Cross-persona comparisons — what's asymmetric
// --------------------------------------------------------------------------

console.log("=== Cross-persona comparisons ===\n");

// Length symmetry — flag if ANY persona is >2000 chars away from the mean
const lengths = PERSONAS.map((p) => p.base.length);
const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
const outliers = PERSONAS.filter((p) => Math.abs(p.base.length - mean) > 2000);
console.log(`Mean base-prompt length: ${Math.round(mean)} chars`);
console.log(`Outliers (>2000 chars from mean): ${outliers.length === 0 ? "none" : outliers.map((p) => p.name).join(", ")}`);

// Opening-length symmetry — this matters because the opening is the user's
// first impression of each persona. Wide variance here could explain why
// some personas feel more 'put together' than others.
const openingLengths = PERSONAS.map((p) => ({ name: p.name, len: p.opening.length }));
console.log("\nOpening lengths:");
for (const o of openingLengths) {
  console.log(`  ${o.name.padEnd(18)} ${o.len} chars`);
}

// Easy/hard overlay symmetry
console.log("\nEasy overlay lengths:");
for (const p of PERSONAS) {
  console.log(`  ${p.name.padEnd(18)} ${p.easy.length} chars`);
}
console.log("\nHard overlay lengths:");
for (const p of PERSONAS) {
  console.log(`  ${p.name.padEnd(18)} ${p.hard.length} chars`);
}

// --------------------------------------------------------------------------
// Summary
// --------------------------------------------------------------------------

const totalChecks = results.length;
const passedChecks = results.filter((r) => r.pass).length;
const failedChecks = totalChecks - passedChecks;

console.log("\n=== Summary ===");
console.log(`Total structural checks: ${totalChecks}`);
console.log(`Passed:                  ${passedChecks}`);
console.log(`Failed:                  ${failedChecks}`);

if (failedChecks > 0) {
  console.log("\nFailed checks:");
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`  ✗ ${r.persona}: ${r.check}${r.detail ? ` (${r.detail})` : ""}`);
  }
  process.exit(1);
}
console.log("\n✓ All personas structurally consistent.\n");
process.exit(0);
