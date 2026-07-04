/**
 * Persona-quality audit — Phase #4 (v2, current roster).
 *
 * Context: the original version of this script (see git history and
 * docs/persona-audit-findings.md) audited a five-persona flat-prompt
 * architecture (Priya, Marcus, Sarah, David, Jennifer) against one
 * universal checklist. The product was rebranded to Folio Labs and the
 * roster collapsed to Sarah + Gemma, built on a modular prompt system
 * (lib/personas/prompts/*.ts composed in lib/personas/index.ts). The
 * personas are also deliberately NOT structural twins: Sarah bans
 * em-dashes as a TTS-hygiene rule, Gemma uses them on purpose for
 * spoken pacing; Sarah always denies being AI and redirects, Gemma
 * gives a brief honest acknowledgment if sincerely asked. A single
 * universal checklist flags both of those as "failures," which is
 * false signal. This version checks the actual composed base prompt
 * (imported straight from the persona registry, so it can't drift from
 * what a session really sends) against rules scoped per persona.
 *
 * What this audit DOES:
 *   - Checks each persona's composed base prompt (as used at runtime)
 *     for the guardrails that persona's own design commits to.
 *   - Verifies both easy and hard difficulty overlays exist and are
 *     substantive.
 *   - Flags prompts that are empty, truncated, or absurdly long as a
 *     drift signal — not a fixed cross-persona length band.
 *
 * What this audit does NOT do:
 *   - Evaluate actual Tavus rendering quality (replica/voice pair)
 *   - Run a live session or compare outputs
 *   - Enforce identical structure across personas with different
 *     designed voices
 *
 * Run: npx tsx scripts/stress-personas.ts
 */

import { PERSONAS } from "../lib/personas";

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

const META_WORD_BAN = /never say any meta-layer word|no words? from the meta layer/i;
const FRAME_BREAK_GUARDRAIL = /stay (sarah|gemma)|break character|frame break|prompt.?inject/i;
const SPOKEN_HYGIENE = /no markdown|no stage directions|no lists/i;

for (const persona of Object.values(PERSONAS)) {
  const base = persona.basePrompt;
  const name = persona.name;

  check(name, "Base prompt is non-empty and not truncated", base.trim().length > 1000, `${base.length} chars`);
  check(name, "Base prompt isn't absurdly long (drift signal)", base.length < 20000, `${base.length} chars`);

  check(name, "Bans meta-layer words in spoken output", META_WORD_BAN.test(base));
  check(name, "Has a frame-break / stay-in-character guardrail", FRAME_BREAK_GUARDRAIL.test(base));
  check(name, "Has spoken-output hygiene rule (no markdown/lists/stage directions)", SPOKEN_HYGIENE.test(base));

  check(name, "Has easy mode overlay", persona.easyModeOverlay.trim().length > 50);
  check(name, "Has hard mode overlay", persona.hardModeOverlay.trim().length > 50);
  check(name, "Has an opening instruction", persona.openingInstruction.trim().length > 50);
}

// --------------------------------------------------------------------------
// Persona-specific rules — these are deliberate design choices, not a
// shared checklist. Encode what each persona actually commits to, and only
// that.
// --------------------------------------------------------------------------

const sarah = PERSONAS.sarah;
if (sarah) {
  const emdashes = sarah.basePrompt.match(/—/g);
  check(
    sarah.name,
    "Sarah: no em-dashes in composed prompt (explicit TTS-hygiene rule)",
    emdashes === null,
    emdashes ? `${emdashes.length} em-dashes found` : undefined,
  );
  check(
    sarah.name,
    "Sarah: states the no-em-dash rule explicitly",
    /no em-dashes/i.test(sarah.basePrompt),
  );
  check(
    sarah.name,
    "Sarah: always denies being AI and redirects (her committed policy)",
    /stay sarah/i.test(sarah.basePrompt),
  );
}

const gemma = PERSONAS.gemma;
if (gemma) {
  check(
    gemma.name,
    "Gemma: documents em-dashes as an intentional pacing device",
    /em dash(es)? for a beat|em-dash(es)? for a beat/i.test(gemma.basePrompt),
  );
  check(
    gemma.name,
    "Gemma: gives a brief honest AI-acknowledgment if sincerely asked (her committed policy)",
    /asks whether you're an ai/i.test(gemma.basePrompt),
  );
}

// --------------------------------------------------------------------------
// Report
// --------------------------------------------------------------------------

console.log("\n=== Persona structural audit (v2 — current roster) ===\n");

for (const persona of Object.values(PERSONAS)) {
  console.log(`## ${persona.name} (${persona.id})`);
  console.log(`   Base prompt: ${persona.basePrompt.length} chars`);
  console.log(`   Easy overlay: ${persona.easyModeOverlay.length} chars`);
  console.log(`   Hard overlay: ${persona.hardModeOverlay.length} chars`);
  console.log(`   Opening:      ${persona.openingInstruction.length} chars`);
  const personaResults = results.filter((r) => r.persona === persona.name);
  const failed = personaResults.filter((r) => !r.pass);
  if (failed.length === 0) {
    console.log("   ✓ All checks passed");
  } else {
    console.log(`   ✗ ${failed.length} issues:`);
    for (const r of failed) {
      console.log(`     - ${r.check}${r.detail ? ` (${r.detail})` : ""}`);
    }
  }
  console.log("");
}

const totalChecks = results.length;
const passedChecks = results.filter((r) => r.pass).length;
const failedChecks = totalChecks - passedChecks;

console.log("=== Summary ===");
console.log(`Total checks: ${totalChecks}`);
console.log(`Passed:       ${passedChecks}`);
console.log(`Failed:       ${failedChecks}`);

if (failedChecks > 0) {
  console.log("\nFailed checks:");
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`  ✗ ${r.persona}: ${r.check}${r.detail ? ` (${r.detail})` : ""}`);
  }
  process.exit(1);
}
console.log("\n✓ All personas pass their own committed design rules.\n");
process.exit(0);
