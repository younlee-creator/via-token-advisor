#!/usr/bin/env tsx
/**
 * Eval runner for via-token-advisor explain_token.
 * Tests resolution accuracy, notFor presence, and not-found handling.
 *
 * Usage: npm run eval:explain
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { explainToken } from "../src/explain.js";
import type { TokenRecord } from "../src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// Load advisor data
const advisorRaw = readFileSync(join(ROOT, "data", "generated", "advisor-tokens.json"), "utf-8");
const advisorData = JSON.parse(advisorRaw) as { records: TokenRecord[] };
const records = advisorData.records;

// Load eval cases
interface EvalCase {
  id: string;
  identifier: string;
  expectedFound: boolean;
  expectedPath?: string;
  notForMustContain?: string;
  expectedSuggestion?: string;
  tags: string[];
  _note?: string;
}

const evalRaw = readFileSync(join(ROOT, "evals", "explain-eval.json"), "utf-8");
const evalData = JSON.parse(evalRaw) as { version: number; description: string; cases: EvalCase[] };

// Run eval
type Status = "PASS" | "FAIL";
type Result = {
  id: string;
  identifier: string;
  status: Status;
  failures: string[];
};

const results: Result[] = [];

for (const c of evalData.cases) {
  const result = explainToken(records, c.identifier);
  const failures: string[] = [];

  // Check found/not-found
  if (result.found !== c.expectedFound) {
    failures.push(`expected found=${c.expectedFound}, got found=${result.found}`);
  }

  if (result.found && c.expectedFound) {
    // Check resolved path
    if (c.expectedPath && result.token.path !== c.expectedPath) {
      failures.push(`expected path "${c.expectedPath}", got "${result.token.path}"`);
    }

    // Check notFor content
    if (c.notForMustContain) {
      const phrase = c.notForMustContain.toLowerCase();
      const matched = result.token.notFor.some((n) => n.toLowerCase().includes(phrase));
      if (!matched) {
        failures.push(
          `notFor must contain "${c.notForMustContain}" — got: ${JSON.stringify(result.token.notFor)}`
        );
      }
    }
  }

  if (!result.found && !c.expectedFound) {
    // Check that suggestions include the expected one
    if (c.expectedSuggestion) {
      const hasSuggestion = result.suggestions.some((s) => s.path === c.expectedSuggestion);
      if (!hasSuggestion) {
        failures.push(
          `expected suggestion "${c.expectedSuggestion}" not found in: ${result.suggestions.map((s) => s.path).join(", ")}`
        );
      }
    }
  }

  results.push({
    id: c.id,
    identifier: c.identifier,
    status: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  });
}

// Print report
const passed = results.filter((r) => r.status === "PASS").length;
const failed = results.filter((r) => r.status === "FAIL").length;
const total = results.length;

console.log(`\nvia-token-advisor explain eval — ${total} cases\n`);

for (const r of results) {
  const icon = r.status === "PASS" ? "✓" : "✗";
  if (r.status === "PASS") {
    console.log(`  ${icon} [${r.id}]`);
  } else {
    console.log(`  ${icon} [${r.id}]`);
    console.log(`      identifier: "${r.identifier}"`);
    for (const f of r.failures) {
      console.log(`      ✗ ${f}`);
    }
  }
}

console.log(`\n  ✓ PASS ${passed}/${total}   ✗ FAIL ${failed}\n`);

if (failed > 0) {
  process.exit(1);
}
