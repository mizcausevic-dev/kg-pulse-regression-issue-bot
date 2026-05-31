#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { diffPulseSnapshots, renderIssueBody, renderOutreachEmail } from "./index.mjs";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: kg-pulse-regress <baseline.json> <current.json> [--threshold 10] [--out-dir ./issues]");
  process.exit(2);
}
const baselineFile = args[0];
const currentFile = args[1];
const thresholdIdx = args.indexOf("--threshold");
const threshold = thresholdIdx >= 0 ? parseInt(args[thresholdIdx + 1], 10) : 10;
const outIdx = args.indexOf("--out-dir");
const outDir = outIdx >= 0 ? args[outIdx + 1] : null;

const baseline = JSON.parse(readFileSync(baselineFile, "utf8"));
const current = JSON.parse(readFileSync(currentFile, "utf8"));
const result = diffPulseSnapshots(baseline, current, { threshold });

console.log(`Compared ${result.total_compared} domains · ${result.regressions.length} regression(s) at threshold ${threshold}`);
for (const r of result.regressions) {
  console.log(`  ✗ ${r.domain}: ${r.previous_score} → ${r.current_score} (Δ ${r.delta}) — ${r.field_changes.length} field change(s)`);
}

if (outDir && result.regressions.length > 0) {
  mkdirSync(outDir, { recursive: true });
  for (const r of result.regressions) {
    const safe = r.domain.replace(/[^a-z0-9.-]/gi, "_");
    writeFileSync(resolve(outDir, `${safe}.issue.md`), renderIssueBody(r) + "\n", "utf8");
    const email = renderOutreachEmail(r);
    writeFileSync(resolve(outDir, `${safe}.email.txt`), `Subject: ${email.subject}\n\n${email.body}\n`, "utf8");
  }
  console.log(`\nWrote ${result.regressions.length * 2} files to ${outDir}`);
}
