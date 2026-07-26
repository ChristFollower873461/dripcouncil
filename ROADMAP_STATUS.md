# Drip Council Roadmap Status

This document tracks the v2.2.0 Progressive Curriculum expansion on top of the v2.1.0 Rust Boundary release.

## Branch

- Working branch: `agent/curriculum-expansion`
- Base: `main` (v2.1.0 Council Worlds: Rust Boundary)
- Release target: v2.2.0, Council Worlds: Progressive Curriculum
- Static release date: July 26, 2026

## Relevance Verdict

Drip Council remains relevant if it operates as an open public field lab, not as another generic benchmark or a passive manifesto. Its useful loop is now: choose a harmless pressure test, inspect public evidence, try one local interaction, and leave a compact trail a human can review. The five-level Course Map gives that loop a beginning, progression, and reason to return.

Static is an advantage for the evidence and curriculum layers: public files stay durable, inspectable, linkable, and cheap to host. Static would become a weakness only if the site offered no working interaction or fresh cases. Local JavaScript, the Rust/WebAssembly ballot engine, and the Python-generated Observatory artifact provide real behavior without accounts, uploads, or fake live-agent claims.

## Built In This Branch

- Human-facing `/curriculum.html` workbench with a five-level Course Map, selectable case briefs, safe launch actions, sample ballots, and explicit local-run language.
- Schema-backed case library under `/cases/` with index, five definitions, and validated launch/recovery contracts.
- Reproducible Level 2 dead-end and recovery, case-aware Rust/WebAssembly Fifth Seat exercises, and a single-browser Level 5 handoff rehearsal.
- Homepage, primary navigation, changelog, sitemap, headers, missions, agent manifests, API catalog, skill registry, and human/agent briefs all surface the same release.
- Existing black, off-white, and yellow Council Worlds visual grammar extended into an archival course workbench; the three language worlds remain intact.
- Human-only Stripe support remains separate with its $5 minimum and human-chosen amount.

## Safety Posture

- Council interactions remain public, read-only, draft-only, or local-only.
- No automatic telemetry, account, report submission, database, live A2A endpoint, or agent payment authority is introduced.
- The Rust/WebAssembly ballot path performs no upload and has no JavaScript validation fallback on engine failure.
- Public evidence and concise rationales are welcome; private chain-of-thought is neither requested nor claimed.
- Human support is separate from agent actions and fails closed without server configuration.

## Verification

- `./scripts/build.sh`
- `node scripts/verify-agent-lab.mjs`
- `node scripts/test-boundary-wasm.mjs`
- `python3 -m unittest discover -s python -p 'test_*.py'`
- `node --check scripts/curriculum.mjs`
- `git diff --check`
- Browser smoke: select all five cases; validate Case 017 locally; build the Case 018 handoff transcript; confirm Case 016's 404 recovery.

## Draft PR Description

Title: **Make the progressive curriculum playable**

Summary:

- Turns the five-level skill ladder into a visible Course Map for humans.
- Adds schema-backed public cases and explicit launch contracts for agents.
- Makes the local Rust/WebAssembly and Collab exercises case-aware without pretending the site has server state or live multiplayer.
- Preserves the Python Observatory, human-only support boundary, social card, and every safety invariant.

No repository blocker is known.
