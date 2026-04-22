/**
 * Smoke test for Phase I.1 — session memory.
 *
 * Asserts the pure-function surface of lib/pipeline/memory.ts behaves the
 * way the routes depend on. Does NOT exercise the Claude extraction call
 * or the Supabase writes — those are integration concerns checked during
 * the live smoke test.
 *
 * Run with:
 *   npx tsx scripts/smoke-memory.ts
 *
 * Clean exit (code 0) means all assertions passed.
 */

import {
  MEMORY_CONTEXT_MAX,
  formatMemoriesForContext,
  memorySurfaceEnabled,
  type MemoryNote,
} from "../lib/pipeline/memory";

let failed = 0;

function assert(cond: unknown, label: string) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

function makeMemory(partial: Partial<MemoryNote>): MemoryNote {
  return {
    id: "mem-1",
    persona: "priya",
    memory_text: "Default memory text.",
    category: "default",
    confidence: 3,
    surfaced_count: 0,
    dismissed: false,
    created_at: new Date().toISOString(),
    source_session_id: null,
    ...partial,
  };
}

console.log("\n=== Phase I.1 — Session memory smoke test ===\n");

// --------------------------------------------------------------------------
// 1. Tunables
// --------------------------------------------------------------------------
console.log("1. Tunables");
assert(MEMORY_CONTEXT_MAX === 2, `MEMORY_CONTEXT_MAX is 2 (got ${MEMORY_CONTEXT_MAX})`);

// --------------------------------------------------------------------------
// 2. memorySurfaceEnabled toggle
// --------------------------------------------------------------------------
console.log("\n2. Feature flag");
delete process.env.MEMORY_SURFACE_ENABLED;
assert(memorySurfaceEnabled() === true, "defaults to true when env unset");

process.env.MEMORY_SURFACE_ENABLED = "true";
assert(memorySurfaceEnabled() === true, "true when explicitly 'true'");

process.env.MEMORY_SURFACE_ENABLED = "false";
assert(memorySurfaceEnabled() === false, "false only when explicitly 'false'");

process.env.MEMORY_SURFACE_ENABLED = "0";
assert(
  memorySurfaceEnabled() === true,
  "other falsy strings do NOT disable (only 'false' does)",
);

// Reset for remaining assertions
delete process.env.MEMORY_SURFACE_ENABLED;

// --------------------------------------------------------------------------
// 3. formatMemoriesForContext — empty + non-empty cases
// --------------------------------------------------------------------------
console.log("\n3. formatMemoriesForContext");
assert(formatMemoriesForContext([], "Priya") === "", "empty list returns empty string");

const single = formatMemoriesForContext(
  [makeMemory({ memory_text: "This candidate hedges on conflict questions." })],
  "Priya",
);
assert(single.includes("Priya"), "includes interviewer first name");
assert(
  single.includes("This candidate hedges on conflict questions."),
  "includes memory text verbatim",
);
assert(single.includes("You may reference"), "includes reference-sparingly instruction");
assert(single.includes("Do not open with a memory"), "includes do-not-lead guardrail");

const multi = formatMemoriesForContext(
  [
    makeMemory({ id: "m1", memory_text: "First observation." }),
    makeMemory({ id: "m2", memory_text: "Second observation." }),
  ],
  "Marcus",
);
assert(multi.includes("First observation."), "multi-item includes first");
assert(multi.includes("Second observation."), "multi-item includes second");
assert(
  multi.split("- ").length - 1 === 2,
  "each memory is rendered as one bullet",
);

// --------------------------------------------------------------------------
// 4. Memory text is injected verbatim, not summarized
//    (catches accidental truncation or rewording in the formatter)
// --------------------------------------------------------------------------
console.log("\n4. Memory fidelity");
const longish =
  "When the candidate is asked about conflict, they describe the situation but omit any " +
  "clear statement of their own position. Test this directly next time by asking them what " +
  "they personally decided, not just what happened.";
const withLong = formatMemoriesForContext([makeMemory({ memory_text: longish })], "Priya");
assert(withLong.includes(longish), "long memory text preserved verbatim");

// --------------------------------------------------------------------------
// 5. No memory is accidentally rendered when surface is disabled — this is
//    enforced by loadMemoriesForSession itself returning [], but we also
//    verify the formatter returns "" on an empty list so the conversation
//    route produces no memory block when suppressed.
// --------------------------------------------------------------------------
console.log("\n5. Disabled-state rendering");
assert(
  formatMemoriesForContext([], "Anyone") === "",
  "formatter on empty list never produces header-only output",
);

// --------------------------------------------------------------------------
// 6. Structure sanity — when memories are present the block ends with the
//    reference instruction, not mid-sentence
// --------------------------------------------------------------------------
console.log("\n6. Block structure");
const block = formatMemoriesForContext([makeMemory({})], "Sarah");
assert(
  block.trim().endsWith("if it fits organically."),
  "block ends with instruction closing sentence",
);

// --------------------------------------------------------------------------
// Final
// --------------------------------------------------------------------------
console.log(`\n=== ${failed === 0 ? "PASS" : "FAIL"} — ${failed} failures ===\n`);
process.exit(failed === 0 ? 0 : 1);
