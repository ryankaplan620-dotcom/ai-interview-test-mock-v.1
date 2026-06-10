#!/usr/bin/env node
/**
 * One-shot diagnostic for the outreach scout. Loads .env.local, calls Anthropic
 * with the web_search server tool + suggest_contacts client tool, and prints
 * the result. Run with: node scripts/scout-smoke.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

// Manually load .env.local (no dotenv dep required)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", ".env.local");

try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch (e) {
  console.error("Could not read .env.local:", e.message);
  process.exit(1);
}

const apiKey = process.env.ANTHROPIC_API_KEY;
console.log("ANTHROPIC_API_KEY present:", !!apiKey);
if (!apiKey) process.exit(1);

const client = new Anthropic({ apiKey });

const WEB_SEARCH_TOOL = { type: "web_search_20250305", name: "web_search", max_uses: 4 };
const SUGGEST_TOOL = {
  name: "suggest_contacts",
  description: "Return real people found via web_search.",
  input_schema: {
    type: "object",
    properties: {
      contacts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            title: { type: "string" },
            company: { type: "string" },
            linkedin_url: { type: "string" },
          },
          required: ["name", "title", "company", "linkedin_url"],
        },
      },
    },
    required: ["contacts"],
  },
};

const targetCompany = "CBRE";
const targetRole = "Senior Recruiter";
const targetCity = "Dallas";

console.log(`\nScouting ${targetRole} @ ${targetCompany} (${targetCity})...\n`);

try {
  const start = Date.now();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      "Use web_search to find 3 real LinkedIn profiles matching the target. Then return them via suggest_contacts. Never invent.",
    tools: [WEB_SEARCH_TOOL, SUGGEST_TOOL],
    messages: [
      {
        role: "user",
        content: `Find 3 real people on LinkedIn who are ${targetRole}s at ${targetCompany} in ${targetCity}.`,
      },
    ],
  });

  const ms = Date.now() - start;
  console.log(`Response received in ${ms}ms`);
  console.log("stop_reason:", response.stop_reason);
  console.log("usage:", JSON.stringify(response.usage));
  console.log("\nContent blocks:");
  for (const block of response.content) {
    if (block.type === "text") {
      console.log(`  [text] "${block.text.slice(0, 120).replace(/\s+/g, " ")}..."`);
    } else if (block.type === "tool_use") {
      console.log(`  [tool_use] name=${block.name}`);
      console.log("    input:", JSON.stringify(block.input, null, 2).slice(0, 1500));
    } else if (block.type === "server_tool_use") {
      console.log(`  [server_tool_use] name=${block.name} input=${JSON.stringify(block.input).slice(0, 200)}`);
    } else if (block.type === "web_search_tool_result") {
      const content = Array.isArray(block.content) ? block.content : [block.content];
      console.log(`  [web_search_tool_result] (${content.length} results)`);
      for (const r of content.slice(0, 3)) {
        if (r?.url) console.log(`    - ${r.title?.slice(0, 80) ?? "(no title)"} :: ${r.url}`);
      }
    } else {
      console.log(`  [${block.type}] ${JSON.stringify(block).slice(0, 200)}`);
    }
  }
} catch (err) {
  console.error("\nAPI call failed:");
  console.error("  type:", err?.constructor?.name);
  console.error("  status:", err?.status);
  console.error("  message:", err?.message);
  if (err?.error) console.error("  error body:", JSON.stringify(err.error).slice(0, 800));
  process.exit(1);
}
