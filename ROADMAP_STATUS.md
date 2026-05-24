# Drip Council Roadmap Status

This branch collects the static Grok expansion work for Drip Council. It preserves the live site and keeps the work reviewable as one feature branch.

## Branch

- Branch: `codex/grok-expansion-pack`
- Base: `main`
- Deployment: not deployed from this branch
- GitHub status: PR open and ready for review at https://github.com/ChristFollower873461/dripcouncil/pull/2

## Built In This Branch

- Agent-native expansion pack: `AGENTS.md`, `llms.txt`, `agent.json`, `missions.json`, and `/api/missions.json`.
- Benchmark Lane and obstacle-course metadata for comparable local agent reports.
- Static Report Gallery and Hall of Fame examples: `/gallery.html` and `/hall-of-fame.html`.
- Static Multi-Agent Collab Course: `/collab.html`.
- Static Summer 2026 seasonal course: `/seasons/summer-2026.html`.
- Static Challenge Courses sponsor-safety page: `/challenges.html`.
- Static Domain Edition template guide: `/template.html`.
- Static Observability Bridge: `/observability.html`.
- Static Human Run Book: `/runbook.html`.
- Static Report Intake Queue: `/intake.html`.

## Safety Posture

- Static files only.
- No accounts, login, database, server writes, or automatic report collection.
- No agent-initiated payments or checkout actions.
- No service connections for observability.
- Local report and export examples are text-only until a human reviews them.
- Gallery entries and badges stay static examples until a human approves exact public wording in a code change.

## Verification Used Per Pass

- Validate `agent.json`, `/.well-known/agent.json`, `missions.json`, and `/api/missions.json`.
- Diff manifest mirrors and mission mirrors.
- Build `dist/` with `./scripts/build.sh`.
- Scan for credentials, local paths, private project names, and unsafe network additions.
- Serve `dist/` locally and check all public routes return `200`.
- Parse HTML for missing links, external links, forms, scripts, and `data-agent` coverage.
- Check mobile and desktop layout with Playwright.
- Confirm the unrelated landing repo guard files kept their timestamps.

## PR Description Draft

Title: Add Drip Council static agent playground expansion pack

Summary:

- Adds agent-native public files and static JSON mission metadata.
- Adds static pages for report examples, badge examples, multi-agent collab, seasonal courses, sponsor-safe challenge courses, domain templates, observability export mapping, human review, and local intake triage.
- Keeps all new surfaces read-only, static, and public.
- Preserves human-only payment boundaries and avoids service connections.

Testing:

- `python3 -m json.tool agent.json`
- `python3 -m json.tool .well-known/agent.json`
- `python3 -m json.tool missions.json`
- `python3 -m json.tool api/missions.json`
- `diff -u agent.json .well-known/agent.json`
- `diff -u missions.json api/missions.json`
- `./scripts/build.sh`
- Local route and link checks against `dist/`
- Credential scan
- Playwright mobile and desktop layout checks

Known blocker:

- No repository blocker is known. If push fails, treat it as an external network or authentication issue.

Next recommended pass:

- Let a human review PR #2.
- Merge only after approval.
- Deploy only after merge approval.
