#!/usr/bin/env tsx
/**
 * Eval runner for via-token-advisor search ranking.
 * Loads the real ranker and advisor data, runs each case, and reports results.
 *
 * Usage: npm run eval
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { rankTokens } from "../src/ranking.js";
import type { RankableTokenRecord } from "../src/ranking.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// Load advisor data
const advisorRaw = readFileSync(join(ROOT, "data", "generated", "advisor-tokens.json"), "utf-8");
const advisorData = JSON.parse(advisorRaw) as {
  records: RankableTokenRecord[];
};
const records = advisorData.records;

// Load eval cases
const evalRaw = readFileSync(join(ROOT, "evals", "query-eval.json"), "utf-8");
const evalData = JSON.parse(evalRaw) as {
  version: number;
  description: string;
  cases: Array<{ id: string; query: string; expectedTop: string; tags: string[] }>;
};

// Run eval
type Result = { id: string; query: string; expectedTop: string; status: "PASS" | "WARN" | "FAIL"; actualTop: string; top5: string[] };
const results: Result[] = [];

for (const testCase of evalData.cases) {
  const ranked = rankTokens(records, testCase.query, { limit: 5 });
  const top5 = ranked.map((r) => r.record.path);
  const rank = top5.indexOf(testCase.expectedTop);

  let status: "PASS" | "WARN" | "FAIL";
  if (rank === 0) {
    status = "PASS";
  } else if (rank >= 1 && rank <= 2) {
    status = "WARN"; // correct but not #1
  } else {
    status = "FAIL"; // not in top 3
  }

  results.push({ id: testCase.id, query: testCase.query, expectedTop: testCase.expectedTop, status, actualTop: top5[0] ?? "(no results)", top5 });
}

// Print report
const passed = results.filter((r) => r.status === "PASS").length;
const warned = results.filter((r) => r.status === "WARN").length;
const failed = results.filter((r) => r.status === "FAIL").length;
const total = results.length;

console.log(`\nvia-token-advisor eval — ${total} cases\n`);

for (const r of results) {
  const icon = r.status === "PASS" ? "✓" : r.status === "WARN" ? "~" : "✗";
  if (r.status === "PASS") {
    console.log(`  ${icon} [${r.id}]`);
  } else {
    console.log(`  ${icon} [${r.id}]`);
    console.log(`      query:    "${r.query}"`);
    console.log(`      expected: ${r.expectedTop}`);
    console.log(`      got:      ${r.actualTop}`);
    console.log(`      top 5:    ${r.top5.join(", ")}`);
  }
}

console.log(`\n  ✓ PASS ${passed}/${total}   ~ WARN ${warned}   ✗ FAIL ${failed}\n`);

if (failed > 0) {
  process.exit(1);
}
