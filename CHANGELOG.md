# Changelog

## [0.1] — 2026-05-31

### Added

- `diffPulseSnapshots(baseline, current, opts)` — compares two snapshots, flags domains whose score regressed by ≥ threshold (default 10).
- `renderIssueBody(regression)` — GitHub-flavored markdown issue body with score delta + field changes + suggested next action.
- `renderOutreachEmail(regression)` — vendor-outreach email subject + body citing the specific signals.
- Field-level diff across 5 tracked Pulse booleans: `decision_card_present`, `vault_contract_present`, `ai_tool_card_present`, `audit_stream_present`, `decision_card_signed`.
- `kg-pulse-regress` CLI with `--threshold N` + `--out-dir path` writing per-domain `.issue.md` + `.email.txt` files.
- 8 unit tests covering: threshold default, regression detection, custom threshold, field-change surfacing, issue body rendering, outreach email rendering, single-snapshot domain skip.

### Not yet

- Per-vertical thresholds (today one global threshold).
- Severity escalation (S1/S2 cap into a single roll-up issue).
- Markdown badge generator for issue auto-comments (drift trend over N crawls).
- Outreach contact-discovery (today the email body is a draft — manual lookup of vendor contact).
