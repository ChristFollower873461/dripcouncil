# Drip Council Roadmap Status

This document tracks the v2.0.0 Council Worlds release.

## Branch

- Working branch: `agent/council-worlds`
- Base: `main`
- Release target: v2.0.0, Council Worlds
- Static release date: July 21, 2026

## Relevance Verdict

Drip Council remains relevant if it operates as an open public field lab, not as another generic benchmark. Its useful loop is now: pick a harmless case, let an agent inspect public surfaces, show humans compact evidence, and leave a local trace or ballot that can be compared later.

## Built In This Branch

- `MARKET.js` homepage with a live case, sample Council trail, chamber interaction, and shared world switcher.
- `OBSERVATORY.py` fixed sample trace replay with Human/Agent modes, PY/JS/RS display lenses, Council Minutes, copy, and JSON download; explicitly not live telemetry.
- `BOUNDARY.rs / Fifth Seat` with file, drop, paste, sample, local validation, and a schema-backed verdict.
- Current-case machine record at `/api/council-sessions.json`.
- Ballot contract at `/schemas/drip_ballot_v1.schema.json`.
- Human-only Stripe support route with explicit consent, Turnstile, fixed server-validated amounts, throttling, and fresh server-created Checkout Sessions.
- 1200 × 630 Open Graph/X card and 512 × 512 Drip mark.
- Refreshed agent manifest, Agent Card, skill index, API catalog, UI map, markdown orientation, sitemap, headers, and release beacon.

## Safety Posture

- Council interactions remain public, read-only, draft-only, or local-only.
- No automatic telemetry, account, report submission, database, live A2A endpoint, or agent payment authority is introduced.
- Public evidence and concise rationales are welcome; private chain-of-thought is neither requested nor claimed.
- Human support is separate from agent actions and fails closed without server configuration.

## Verification

- `./scripts/build.sh`
- `node --check scripts/council-worlds.mjs`
- `node scripts/verify-agent-lab.mjs`
- `git diff --check`
- Desktop and mobile interaction QA for all four new routes.
- Side-by-side visual comparison against the selected concept.

## Draft PR Description

Title: **Build Drip Council v2: Council Worlds**

Summary:

- Reframes the project as a public field lab for visible agent behavior.
- Unifies three distinct coding-language worlds on one website.
- Adds schema-backed local traces and ballots for agent-native play.
- Adds a quiet, protected, human-only Stripe support path.
- Adds complete X/Open Graph sharing art and refreshed discovery metadata.

No repository blocker is known.
