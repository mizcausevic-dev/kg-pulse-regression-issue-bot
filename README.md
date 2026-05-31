# kg-pulse-regression-issue-bot

> Compares two AI Procurement Pulse crawl snapshots (baseline + current). When a vendor's score regresses by ≥ threshold, generates a ready-to-file **GitHub issue body** + a **vendor-outreach email template** citing the specific field-level diff. Wire as a GH Action in the Pulse repo to auto-open issues on quarterly crawl regressions.

Part of the [Kinetic Gain Protocol Suite](https://suite.kineticgain.com).

## Why this exists

The Procurement Pulse engine produces quarterly crawl snapshots. Regression detection has been observational — eyeballing the JSON to spot drops. This tool productizes that signal:

- **Detect:** which vendors regressed by ≥ N points
- **Explain:** which specific Pulse fields flipped (decision_card_present, ai_tool_card_present, decision_card_signed, audit_stream_present, vault_contract_present)
- **Render:** a markdown issue body + a vendor-outreach email body that cites the specific diff

Result: a single CLI command (or GH Action step) produces outreach-ready material on every quarterly crawl.

## Usage

```bash
# CLI
npm install -g kg-pulse-regression-issue-bot
kg-pulse-regress baseline.json current.json --threshold 10 --out-dir ./regressions/
# → Compared 3 domains · 1 regression(s) at threshold 10
#   ✗ drift.example: 75 → 55 (Δ -20) — 2 field change(s)
#   Wrote 2 files to ./regressions/
#     drift.example.issue.md
#     drift.example.email.txt
```

```js
// Library
import { diffPulseSnapshots, renderIssueBody, renderOutreachEmail } from "kg-pulse-regression-issue-bot";

const { regressions } = diffPulseSnapshots(baseline, current, { threshold: 10 });
for (const r of regressions) {
  const issueBody = renderIssueBody(r);          // markdown for `gh issue create`
  const { subject, body } = renderOutreachEmail(r);  // email template
}
```

## GH Action recipe (drop into pulse-engine repo)

```yaml
# .github/workflows/quarterly-regression-issues.yml
on:
  schedule: [{ cron: "0 16 15 8,11,2,5 *" }]   # match quarterly Pulse crawl
  workflow_dispatch:
jobs:
  open-regressions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install -g kg-pulse-regression-issue-bot
      - run: kg-pulse-regress data/baseline.json data/issue-N.json --threshold 10 --out-dir ./regressions/
      - name: Open issues for each regression
        run: |
          for f in regressions/*.issue.md; do
            domain=$(basename "$f" .issue.md)
            gh issue create --title "Pulse regression: $domain" --body-file "$f" --label "pulse-regression"
          done
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
```

## Threshold tuning

| Threshold | When to use |
| --- | --- |
| `5` | Sensitive — picks up small per-spec changes (added decision-card, dropped ai-tool-card) |
| `10` (default) | Catches "spec dropped" without false alarms on score weight tweaks |
| `15` or `20` | Conservative — only catches material regressions, ignores minor signal flips |

## Composes with

- [`procurement-pulse-engine`](https://github.com/mizcausevic-dev/procurement-pulse-engine) — produces the snapshot JSONs this tool diffs
- [`procurement-pulse-action`](https://github.com/mizcausevic-dev/procurement-pulse-action) — GH Action that runs the crawl; this is the natural follow-up Action
- [pulse.kineticgain.com](https://pulse.kineticgain.com) — public dashboard
- [Kinetic Gain Protocol Suite](https://suite.kineticgain.com) — umbrella

## License

MIT.
