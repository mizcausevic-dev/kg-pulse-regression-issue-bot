// index.mjs — Diff two Pulse snapshots, surface regressions, render issue + outreach bodies.
//
// Pulse snapshot shape (lightweight):
//   [{ domain, score, vertical, decision_card_present, vault_contract_present, ai_tool_card_present,
//      audit_stream_present, decision_card_signed, ... }]
//
// We compute per-domain { previous_score, current_score, delta } and surface
// any domain where delta ≤ -threshold as a regression.

export const DEFAULT_REGRESSION_THRESHOLD = 10;

export function diffPulseSnapshots(baseline, current, opts = {}) {
  const threshold = opts.threshold ?? DEFAULT_REGRESSION_THRESHOLD;
  const byDomain = new Map();
  for (const row of baseline) byDomain.set(row.domain, { previous: row });
  for (const row of current) {
    const e = byDomain.get(row.domain) ?? {};
    e.current = row;
    byDomain.set(row.domain, e);
  }
  const regressions = [];
  for (const [domain, e] of byDomain) {
    if (!e.previous || !e.current) continue;
    const delta = e.current.score - e.previous.score;
    if (delta <= -threshold) {
      regressions.push({
        domain,
        previous_score: e.previous.score,
        current_score: e.current.score,
        delta,
        vertical: e.current.vertical,
        field_changes: diffFields(e.previous, e.current)
      });
    }
  }
  regressions.sort((a, b) => a.delta - b.delta);
  return { regressions, total_compared: byDomain.size };
}

function diffFields(prev, curr) {
  const changes = [];
  const tracked = ["decision_card_present", "vault_contract_present", "ai_tool_card_present", "audit_stream_present", "decision_card_signed"];
  for (const field of tracked) {
    if (prev[field] !== undefined && curr[field] !== undefined && prev[field] !== curr[field]) {
      changes.push({ field, was: prev[field], now: curr[field] });
    }
  }
  return changes;
}

export function renderIssueBody(regression) {
  const lines = [
    `# Pulse regression: ${regression.domain}`,
    "",
    `**Score dropped from ${regression.previous_score} → ${regression.current_score} (Δ ${regression.delta})**`,
    `**Vertical:** ${regression.vertical ?? "(unknown)"}`,
    "",
    `## Specific field changes`,
    ""
  ];
  if (regression.field_changes.length === 0) {
    lines.push("- (no field-level changes detected; regression came from weight / scoring deltas)");
  } else {
    for (const c of regression.field_changes) {
      lines.push(`- \`${c.field}\`: ${JSON.stringify(c.was)} → ${JSON.stringify(c.now)}`);
    }
  }
  lines.push("");
  lines.push(`## Suggested next action`);
  lines.push("");
  lines.push("- Open outreach draft (see below)");
  lines.push("- Confirm regression is real (not crawl flake) by re-running the per-spec probe");
  lines.push("- If real and persistent into the next quarterly crawl, escalate to vendor's procurement contact");
  return lines.join("\n");
}

export function renderOutreachEmail(regression) {
  const subj = `[Procurement Pulse] ${regression.domain} score regression: ${regression.previous_score} → ${regression.current_score}`;
  const body = [
    `Hi,`,
    ``,
    `We're tracking your AI procurement disclosure posture via the public AI Procurement Pulse (https://pulse.kineticgain.com). The most recent quarterly crawl shows your overall score dropped from ${regression.previous_score} to ${regression.current_score} (Δ ${regression.delta}).`,
    ``,
    `Specific signals we're seeing:`,
    ...(regression.field_changes.length
      ? regression.field_changes.map((c) => `  - ${c.field}: was ${c.was}, now ${c.now}`)
      : ["  - (no specific field signals; investigating)"]),
    ``,
    `If this is intentional (e.g., a deliberate spec rollback or scope reduction), let us know and we'll annotate the Pulse with the rationale. If it's an oversight (CDN cache, deployment drift, etc.), here are the spec docs your tooling probably needs:`,
    `  - https://suite.kineticgain.com`,
    `  - https://aeo.kineticgain.com (AI Engine Optimization)`,
    ``,
    `Happy to talk through this — no enforcement, just transparency.`,
    ``,
    `Best,`,
    `Miz Causevic — Kinetic Gain`
  ].join("\n");
  return { subject: subj, body };
}
