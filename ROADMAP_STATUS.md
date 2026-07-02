# Drip Council Roadmap Status

This document tracks the v1.13.0 Run Lab Glow-Up for Drip Council.

## Branch

- Working branch: `run-lab-glow-up-v1-13`
- Base: `main`
- Release target: v1.13.0, Run Lab Glow-Up
- Release date in static metadata: July 1, 2026

## Built In This Branch

- Homepage Run Lab on `/#run-lab` with human/agent mode, mission picker, stepper, safety prompts, and copy-safe agent prompt.
- Readable trace timeline, metrics, raw JSON tabs, and local privacy cues on `/#trace`.
- Report builder v2 polish: live human summary, schema links, risk tags, badges, and export shapes.
- Local-only compare dashboard on `/compare.html` for report v2 JSON files and supported local export wrappers.
- UI selector/workflow map at `/ui-map.json`.
- Prompt Injection Gauntlet verdict scoring.
- Static A2A handoff board polish on `/collab.html`.
- Static commerce-boundary verdict cards on `/seasons/summer-2026.html`.
- Updated `version.json`, `changelog.html`, `llms.txt`, `AGENTS.md`, `index.md`, `missions.md`, `missions.json`, `api/missions.json`, `sitemap.xml`, `_headers`, README, agent manifests, Agent Card, Agent Skills, API catalog, and build script.

## Safety Posture

- Static public pages remain read-only or draft-only.
- Trace capture is opt-in, local to the browser tab, memory-only, and redacts field values.
- Compare-runs analysis uses local files or pasted JSON only and has no upload or storage endpoint.
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
- Check homepage Run Lab, trace/report interactions, compare dashboard, collab board, and seasonal course in a browser.
- Scan for credentials, private paths, or unsafe payment links.

## PR Description Draft

Title: Add Drip Council Run Lab Glow-Up

Summary:

- Adds guided Run Lab UX for humans and agents.
- Adds readable trace timeline, report builder polish, and local compare-runs dashboard.
- Expands prompt-injection, A2A handoff, and agentic commerce boundary clarity.
- Keeps all new behavior static, public, local-only, read-only, or draft-only.

Testing:

- `python3 -m json.tool agent.json`
- `python3 -m json.tool .well-known/agent.json`
- `python3 -m json.tool .well-known/agent-card.json`
- `python3 -m json.tool .well-known/agent-skills/index.json`
- `python3 -m json.tool .well-known/api-catalog`
- `python3 -m json.tool ui-map.json`
- `python3 -m json.tool schemas/drip_trace_v1.schema.json`
- `python3 -m json.tool schemas/drip_report_v2.schema.json`
- `python3 -m json.tool schemas/drip_policy_score_v1.schema.json`
- `node scripts/verify-agent-lab.mjs`
- `diff -u agent.json .well-known/agent.json`
- `./scripts/build.sh`
- Local route checks against `dist/`

Known blocker:

- No repository blocker is known. If push fails, treat it as an external network or authentication issue.
