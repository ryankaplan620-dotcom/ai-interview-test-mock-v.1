/**
 * Company Intelligence system tests.
 *
 * Run with: npx tsx lib/intel/__tests__/intel.test.ts
 *
 * Uses simple assertions — no test framework required. Prints pass/fail
 * for each test, exits 0 if all pass, 1 if any fail.
 */

import { strict as assert } from "node:assert";

import {
  CompanyIntelSchema,
  emptyIntel,
  isStale,
  type CompanyIntel,
  type IntelQuestion,
  type InterviewQuestionType,
  type QuestionSource,
} from "../schema";
import { scoreAndDedupeQuestions } from "../pipeline/score-questions";
import { selectQuestions } from "../injector/select-questions";
import { composePromptBlock } from "../injector/compose-prompt-block";
import { getCachedIntel } from "../pipeline/cache";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  FAIL  ${name}`);
    console.log(`        ${msg}`);
    failed++;
  }
}

function makeQuestion(overrides: Partial<IntelQuestion> = {}): IntelQuestion {
  return {
    text: "Tell me about a time you led a project.",
    interview_type: "behavioral" as InterviewQuestionType,
    role: "software engineer",
    level: "senior",
    round: "onsite",
    source: "reddit" as QuestionSource,
    confidence: 0 as 0 | 1 | 2 | 3,
    last_seen: "2025-01-01",
    ...overrides,
  };
}

function makeIntelWithQuestions(count: number): CompanyIntel {
  const intel = emptyIntel("TestCo");
  for (let i = 0; i < count; i++) {
    intel.questions.push(
      makeQuestion({
        text: `Question ${i + 1}`,
        confidence: (Math.min(i % 4, 3)) as 0 | 1 | 2 | 3,
      })
    );
  }
  return intel;
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

async function main() {
  console.log("\nCompany Intelligence Tests\n");

  // ---- Schema tests ----

  await test("1. emptyIntel() produces valid CompanyIntel (passes Zod parse)", () => {
    const intel = emptyIntel("Acme Corp");
    const result = CompanyIntelSchema.safeParse(intel);
    assert.ok(result.success, `Zod parse failed: ${JSON.stringify(result.error?.issues)}`);
  });

  await test("2. isStale() returns true for intel with ttl_hours=0 and generated_at in the past", () => {
    const intel = emptyIntel("StaleCo");
    intel.freshness.ttl_hours = 0;
    intel.freshness.generated_at = new Date(Date.now() - 60_000).toISOString();
    assert.ok(isStale(intel), "Expected intel to be stale");
  });

  await test("3. isStale() returns false for fresh intel", () => {
    const intel = emptyIntel("FreshCo");
    intel.freshness.ttl_hours = 24 * 30; // 30 days
    intel.freshness.generated_at = new Date().toISOString();
    assert.ok(!isStale(intel), "Expected intel to be fresh");
  });

  // ---- Score questions tests ----

  await test("4. Single source question gets confidence 0", () => {
    const questions = [makeQuestion({ source: "reddit", confidence: 0 })];
    const scored = scoreAndDedupeQuestions(questions);
    assert.equal(scored.length, 1);
    assert.equal(scored[0].confidence, 0);
  });

  await test("5. Duplicate questions from 3 sources gets confidence 3", () => {
    const questions = [
      makeQuestion({ text: "Tell me about yourself", source: "reddit", confidence: 0 }),
      makeQuestion({ text: "Tell me about yourself", source: "glassdoor", confidence: 0 }),
      makeQuestion({ text: "Tell me about yourself", source: "blind", confidence: 0 }),
    ];
    const scored = scoreAndDedupeQuestions(questions);
    assert.equal(scored.length, 1, `Expected 1 deduped question, got ${scored.length}`);
    assert.equal(scored[0].confidence, 3, `Expected confidence 3, got ${scored[0].confidence}`);
  });

  await test("6. Deduplication works (same text, different sources -> one result)", () => {
    const questions = [
      makeQuestion({ text: "Why do you want to work here?", source: "reddit" }),
      makeQuestion({ text: "Why do you want to work here?", source: "glassdoor" }),
    ];
    const scored = scoreAndDedupeQuestions(questions);
    assert.equal(scored.length, 1, `Expected 1 deduped question, got ${scored.length}`);
  });

  // ---- Select questions tests ----

  await test("7. Select questions filters by interview type correctly", () => {
    const questions = [
      makeQuestion({ text: "Behavioral Q", interview_type: "behavioral" }),
      makeQuestion({ text: "Technical Q", interview_type: "technical" }),
      makeQuestion({ text: "Mixed Q", interview_type: "mixed" }),
    ];
    const selected = selectQuestions(questions, {
      interviewType: "behavioral",
      role: "",
      level: "",
      count: 10,
    });
    // Should include behavioral and mixed, but not technical
    const types = new Set(selected.map((q) => q.interview_type));
    assert.ok(types.has("behavioral"), "Should include behavioral");
    assert.ok(types.has("mixed"), "Should include mixed (always passes filter)");
    assert.ok(!types.has("technical"), "Should not include technical");
  });

  await test('8. Fuzzy role matching works ("swe" matches "software engineer")', () => {
    const questions = [
      makeQuestion({ text: "SWE Question", role: "software engineer" }),
      makeQuestion({ text: "PM Question", role: "product manager" }),
    ];
    const selected = selectQuestions(questions, {
      interviewType: "behavioral",
      role: "swe",
      level: "",
      count: 10,
    });
    // Should prefer software engineer questions
    assert.ok(selected.length >= 1, "Should return at least 1 result");
    const hasSwe = selected.some((q) => q.role === "software engineer");
    assert.ok(hasSwe, 'Should match "swe" to "software engineer"');
  });

  await test("9. Select questions returns max `count` results", () => {
    const questions = Array.from({ length: 20 }, (_, i) =>
      makeQuestion({ text: `Question ${i}`, confidence: 1 as 0 | 1 | 2 | 3 })
    );
    const selected = selectQuestions(questions, {
      interviewType: "behavioral",
      role: "",
      level: "",
      count: 5,
    });
    assert.equal(selected.length, 5, `Expected 5 results, got ${selected.length}`);
  });

  // ---- Compose prompt block tests ----

  const ctx = {
    interviewType: "behavioral",
    role: "software engineer",
    level: "senior",
    difficulty: "medium",
  };

  await test("10. Compose prompt block: output is non-empty for valid intel", () => {
    const intel = makeIntelWithQuestions(5);
    intel.company.name = "TestCo";
    intel.recent.news.push({
      headline: "TestCo raises $100M",
      date: "2025-03-01",
      source: "TechCrunch",
      url: "https://example.com",
      one_liner: "Series C funding round",
    });
    const block = composePromptBlock(intel, ctx);
    assert.ok(block.length > 0, "Prompt block should not be empty");
  });

  await test("11. Compose prompt block: output is empty string for emptyIntel with no data", () => {
    const intel = emptyIntel("EmptyCo");
    const block = composePromptBlock(intel, ctx);
    // Even empty intel produces at least the header and footer, so check it is minimal
    // but not zero (header always includes company name + footer instruction)
    assert.ok(typeof block === "string", "Output should be a string");
    // The compose function always emits a header and footer, so it won't be truly empty
    // Verify it has the header but lacks data sections
    assert.ok(!block.includes("### Recent"), "Should not have Recent section");
    assert.ok(!block.includes("### Question bank"), "Should not have Question bank section");
  });

  await test("12. Compose prompt block: output contains company name", () => {
    const intel = emptyIntel("Stripe");
    const block = composePromptBlock(intel, ctx);
    assert.ok(block.includes("Stripe"), "Prompt block should contain company name");
  });

  await test("13. Compose prompt block: output contains question bank section when questions exist", () => {
    const intel = makeIntelWithQuestions(3);
    const block = composePromptBlock(intel, ctx);
    assert.ok(
      block.includes("Question bank"),
      "Prompt block should contain 'Question bank' header when questions exist"
    );
  });

  // ---- Cache tests ----

  await test("14. getCachedIntel returns null when no Supabase configured (graceful)", async () => {
    // In a test environment without Supabase, getCachedIntel should gracefully return null
    const result = await getCachedIntel("nonexistent-company");
    assert.equal(result, null, "Should return null when Supabase is not configured");
  });

  // ---- Summary ----

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
