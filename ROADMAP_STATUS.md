# Drip Council Roadmap Status

This document tracks the v2.1.0 Rust Boundary release for Council Worlds.

## Branch

- Working branch: `agent/rust-boundary-wasm`
- Base: `main`
- Release target: v2.1.0, Council Worlds: Rust Boundary
- Static release date: July 21, 2026

## Relevance Verdict

Drip Council remains relevant if it operates as an open public field lab, not as another generic benchmark. Its useful loop is now: pick a harmless case, let an agent inspect public surfaces, show humans compact evidence, and leave a local trace or ballot that can be compared later.

## Built In This Branch

- `MARKET.js` homepage with a live case, sample Council trail, chamber interaction, and shared world switcher.
- `OBSERVATORY.py` fixed sample trace replay with Human/Agent modes, PY/JS/RS display lenses, Council Minutes, copy, and JSON download; explicitly not live telemetry.
- An inspectable standard-library-only Python CLI/build lens at `/python/observatory_lens.py`, with checked-in trace-to-minutes output at `/api/observatory-lens.json`; Python is not claimed to execute in the browser.
- `BOUNDARY.rs / Fifth Seat` with file, drop, paste, sample, and a schema-backed verdict produced by actual Rust compiled to WebAssembly.
- Public Rust source and crate metadata at `/rust/boundary-validator/`, plus the committed browser module at `/wasm/boundary_validator.wasm`.
- A fail-closed runtime boundary: ballot text stays in browser/WebAssembly memory, and a missing or broken module cannot produce a valid verdict.
- Current-case machine record at `/api/council-sessions.json`.
- Ballot contract at `/schemas/drip_ballot_v1.schema.json`.
- Human-only Stripe support route with explicit consent, a human-chosen USD amount ($5 minimum, $10,000 maximum), integer-cent server validation, Turnstile, throttling, and a fresh server-created Checkout Session.
- 1200 × 630 Open Graph/X card and 512 × 512 Drip mark.
- Refreshed agent manifest, Agent Card, skill index, API catalog, UI map, markdown orientation, sitemap, headers, and release beacon.

## Safety Posture

- Council interactions remain public, read-only, draft-only, or local-only.
- No automatic telemetry, account, report submission, database, live A2A endpoint, or agent payment authority is introduced.
- The Rust/WebAssembly ballot path performs no upload and has no JavaScript validation fallback on engine failure.
- Public evidence and concise rationales are welcome; private chain-of-thought is neither requested nor claimed.
- Human support is separate from agent actions and fails closed without server configuration.

## Verification

- `./scripts/build.sh`
- `./scripts/build-boundary-wasm.sh`
- `cargo test --manifest-path rust/boundary-validator/Cargo.toml`
- `node scripts/test-boundary-wasm.mjs`
- `python3 -m unittest discover -s python -p 'test_*.py'`
- `node --check scripts/council-worlds.mjs`
- `node scripts/verify-agent-lab.mjs`
- `git diff --check`
- Desktop and mobile interaction QA for all four new routes.
- Side-by-side visual comparison against the selected concept.

## Draft PR Description

Title: **Make BOUNDARY.rs real with Rust and WebAssembly**

Summary:

- Replaces the JavaScript-only ballot verdict with an actual Rust validator compiled to WebAssembly.
- Adds a real Python trace-to-minutes build lens without misrepresenting the browser runtime.
- Publishes both the inspectable Rust source and the executable module for agent verification.
- Keeps ballot validation local and fails closed if the compiled engine is unavailable.
- Adds reproducible Rust and Node contract checks while preserving the Council Worlds interface.

No repository blocker is known.
