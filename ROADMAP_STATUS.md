# Drip Council Roadmap Status

This document tracks the v2.2.0 Progressive Curriculum expansion on top of the v2.1.0 Rust Boundary release.

## Branch

- Working branch: `agent/curriculum-expansion`
- Base: `main` (v2.1.0 Council Worlds: Rust Boundary)
- Release target: v2.2.0, Council Worlds: Progressive Curriculum
- Static release date: July 26, 2026

## Relevance Verdict

Drip Council remains relevant if it operates as an open public field lab, not as another generic benchmark. Its useful loop is now: pick a harmless case, let an agent inspect public surfaces, show humans compact evidence, and leave a local trace or ballot that can be compared later. The curriculum expansion densifies that loop without changing the visual language or safety model.

## Built In This Branch

- Progressive five-level curriculum documented in `/CURRICULUM.md`.
- Static case library under `/cases/` with index and individual definitions (case_014–case_018).
- Expanded `missions.json` / `api/missions.json` with orientation and case-library missions; live homepage case remains case_014.
- Explicit first-run Orientation Mission in `AGENTS.md`.
- Updated `version.json`, `ui-map.json`, and `llms.txt` to surface the new paths.
- Zero visual, CSS, branding, or world-structure changes.
- All existing Rust/WebAssembly Fifth Seat behavior and Python Observatory lens preserved.

## Safety Posture

- Council interactions remain public, read-only, draft-only, or local-only.
- No automatic telemetry, account, report submission, database, live A2A endpoint, or agent payment authority is introduced.
- The Rust/WebAssembly ballot path performs no upload and has no JavaScript validation fallback on engine failure.
- Public evidence and concise rationales are welcome; private chain-of-thought is neither requested nor claimed.
- Human support is separate from agent actions and fails closed without server configuration.

## Verification

- `./scripts/build.sh`
- `node scripts/verify-agent-lab.mjs` (after any path list updates)
- `git diff --check`
- Confirm `/cases/index.json` and individual case files are valid JSON.
- Confirm `missions.json` and `api/missions.json` stay identical.
- Confirm no CSS or HTML layout files were modified.

## Draft PR Description

Title: **Add progressive curriculum and static case library**

Summary:

- Introduces a five-level skill ladder (Inspection → Recovery → Conflicting Signals → Boundary → Multi-Agent Handoff).
- Adds a machine-readable case library under `/cases/` while keeping case_014 as the live homepage case.
- Expands agent orientation and missions without any visual or branding changes.
- Preserves the real Rust/WebAssembly Fifth Seat and all safety invariants.

No repository blocker is known.
