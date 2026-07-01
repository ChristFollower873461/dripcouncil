# Drip Council Roadmap Status

This document tracks the v1.12.0 Agent Lab Upgrade for Drip Council.

## Branch

- Working branch: `agent-readiness-lab-v1`
- Base: `main`
- Release target: v1.12.0, Agent Lab Upgrade
- Release date in static metadata: July 1, 2026

## Built In This Branch

- Agent Readiness self-audit page: `/agent-readiness.html`.
- Markdown mirrors: `/index.md`, `/missions.md`, `/observability.md`, and `/runbook.md`.
- Static discovery files: `/.well-known/agent-card.json`, `/.well-known/agent-skills/index.json`, and `/.well-known/api-catalog`.
- JSON schemas: `/schemas/drip_trace_v1.schema.json`, `/schemas/drip_report_v2.schema.json`, and `/schemas/drip_policy_score_v1.schema.json`.
- Homepage opt-in local trace replay on `/#trace`.
- Report v2 scoring: task completion, policy compliance, boundary safety, risk tags, trace summary, and span timeline exports.
- Prompt Injection Gauntlet with visible, hidden comment, CSS-hidden, alt text, metadata, fake JSON, and pseudo-localStorage traps.
- Static A2A handoff transcript builder on `/collab.html`.
- Static agentic commerce boundary simulations on `/seasons/summer-2026.html`.
- Updated `version.json`, `changelog.html`, `llms.txt`, `AGENTS.md`, `missions.json`, `api/missions.json`, `robots.txt`, `sitemap.xml`, `_headers`, README, gallery, hall, observability bridge, and human run book.

## Safety Posture

- Static public pages remain read-only or draft-only.
- Trace capture is opt-in, local to the browser tab, memory-only, and redacts field values.
- No automatic telemetry, accounts, database writes, live report submission, or service connections were added.
- Agent Card and Agent Skills advertise static/draft-only behavior only.
- No live MCP server, A2A message endpoint, report-submission API, or agent payment endpoint is advertised.
- Commerce examples are simulated; agents must not initiate checkout, choose amounts, enter payment details, or claim a live transaction happened.

## Verification Plan

- Validate all JSON files with `python3 -m json.tool`.
- Run `node scripts/verify-agent-lab.mjs`.
- Confirm `agent.json` and `/.well-known/agent.json` are identical.
- Build `dist/` with `./scripts/build.sh`.
- Serve the site locally and confirm new public routes return `200`.
- Check homepage trace/report interactions in a browser.
- Scan for credentials, private paths, or unsafe payment links.

## PR Description Draft

Title: Add Drip Council Agent Lab Upgrade

Summary:

- Adds modern agent-readiness discovery files, markdown mirrors, schemas, and a self-audit page.
- Adds opt-in local behavior trace replay and report v2 policy scoring.
- Expands prompt-injection, A2A handoff, and agentic commerce boundary tests.
- Keeps all new behavior static, public, local-only, read-only, or draft-only.

Testing:

- `python3 -m json.tool agent.json`
- `python3 -m json.tool .well-known/agent.json`
- `python3 -m json.tool .well-known/agent-card.json`
- `python3 -m json.tool .well-known/agent-skills/index.json`
- `python3 -m json.tool .well-known/api-catalog`
- `python3 -m json.tool schemas/drip_trace_v1.schema.json`
- `python3 -m json.tool schemas/drip_report_v2.schema.json`
- `python3 -m json.tool schemas/drip_policy_score_v1.schema.json`
- `node scripts/verify-agent-lab.mjs`
- `diff -u agent.json .well-known/agent.json`
- `./scripts/build.sh`
- Local route checks against `dist/`

Known blocker:

- No repository blocker is known. If push fails, treat it as an external network or authentication issue.
