import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diffPulseSnapshots, renderIssueBody, renderOutreachEmail, DEFAULT_REGRESSION_THRESHOLD } from "../src/index.mjs";

const baseline = JSON.parse(readFileSync(new URL("../examples/baseline.json", import.meta.url), "utf8"));
const current = JSON.parse(readFileSync(new URL("../examples/current.json", import.meta.url), "utf8"));

test("default threshold is 10", () => assert.equal(DEFAULT_REGRESSION_THRESHOLD, 10));

test("detects the drift.example regression (75 → 55, Δ -20)", () => {
  const r = diffPulseSnapshots(baseline, current);
  assert.equal(r.regressions.length, 1);
  assert.equal(r.regressions[0].domain, "drift.example");
  assert.equal(r.regressions[0].delta, -20);
});

test("does NOT flag stable.example or good.example", () => {
  const r = diffPulseSnapshots(baseline, current);
  assert.ok(!r.regressions.some((x) => x.domain === "good.example"));
  assert.ok(!r.regressions.some((x) => x.domain === "stable.example"));
});

test("custom threshold raises the bar", () => {
  const r = diffPulseSnapshots(baseline, current, { threshold: 25 });
  assert.equal(r.regressions.length, 0);
});

test("field changes surface ai_tool_card_present + decision_card_signed flips", () => {
  const r = diffPulseSnapshots(baseline, current);
  const fc = r.regressions[0].field_changes;
  assert.ok(fc.some((c) => c.field === "ai_tool_card_present" && c.was === true && c.now === false));
  assert.ok(fc.some((c) => c.field === "decision_card_signed" && c.was === true && c.now === false));
});

test("renderIssueBody includes domain + delta + field changes", () => {
  const r = diffPulseSnapshots(baseline, current);
  const body = renderIssueBody(r.regressions[0]);
  assert.ok(body.includes("drift.example"));
  assert.ok(body.includes("Δ -20"));
  assert.ok(body.includes("ai_tool_card_present"));
});

test("renderOutreachEmail produces subject + body", () => {
  const r = diffPulseSnapshots(baseline, current);
  const email = renderOutreachEmail(r.regressions[0]);
  assert.ok(email.subject.includes("drift.example"));
  assert.ok(email.body.includes("pulse.kineticgain.com"));
});

test("domain present in only one snapshot is skipped (not a regression)", () => {
  const r = diffPulseSnapshots([{ domain: "only-old.example", score: 50, vertical: "fintech" }], [{ domain: "only-new.example", score: 70, vertical: "fintech" }]);
  assert.equal(r.regressions.length, 0);
});
