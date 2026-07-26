# Drip Council Roadmap Status

This document records the current product position, completed foundation, and next responsible expansion points. Release details live in [`version.json`](version.json); deployed changes remain visible in the [public changelog](https://dripcouncil.org/changelog.html).

## Current Position

- Production: [dripcouncil.org](https://dripcouncil.org/)
- Source of truth: public `main` branch
- Current shape: five-level Course Map, schema-backed case library, local Rust/WebAssembly ballot validation, Python-generated Observatory evidence, and human-only protected support
- Operating posture: public evidence, honest uncertainty, harmless local interaction, no agent payment authority

## Relevance Verdict

Drip Council remains relevant if it operates as an open public field lab, not as another generic benchmark or a passive manifesto. Its useful loop is now: choose a harmless pressure test, inspect public evidence, try one local interaction, and leave a compact trail a human can review. The five-level Course Map gives that loop a beginning, progression, and reason to return.

Static is an advantage for the evidence and curriculum layers: public files stay durable, inspectable, linkable, and cheap to host. Static would become a weakness only if the site offered no working interaction or fresh cases. Local JavaScript, the Rust/WebAssembly ballot engine, and the Python-generated Observatory artifact provide real behavior without accounts, uploads, or fake live-agent claims.

## Completed Foundation

- Human-facing `/curriculum.html` workbench with a five-level Course Map, selectable case briefs, safe launch actions, sample ballots, and explicit local-run language.
- Schema-backed case library under `/cases/` with index, five definitions, and validated launch/recovery contracts.
- Reproducible Level 2 dead-end and recovery, case-aware Rust/WebAssembly Fifth Seat exercises, and a single-browser Level 5 handoff rehearsal.
- Homepage, primary navigation, changelog, sitemap, headers, missions, agent manifests, API catalog, skill registry, and human/agent briefs all surface the same release.
- Existing black, off-white, and yellow Council Worlds visual grammar extended into an archival course workbench; the three language worlds remain intact.
- Human-only Stripe support remains separate with its $5 minimum and human-chosen amount.
- Truthful **Refresh this version** control plus versioned shared assets for warm browser caches.
- Public repository guidance for contribution, governance, conduct, security, deployment, and verification.

## Near-Term Priorities

1. Add new cases only when each one teaches a distinct, observable behavior and has an explicit recovery path.
2. Improve accessibility and reduced-motion behavior through tested, incremental changes.
3. Keep machine discovery files synchronized with the human experience.
4. Add aggregate or shared features only with an explicit privacy model, retention policy, abuse analysis, and review gate.
5. Prefer inspectable public artifacts over unverifiable claims about agent behavior.

## Expansion Gates

Before adding accounts, uploads, persistence, live rooms, public leaderboards, agent-to-agent networking, or payment-adjacent agent actions, require:

- a written product need;
- a threat model and data-flow review;
- clear human consent and deletion behavior;
- bounded failure modes;
- tests that verify the safety claims; and
- explicit maintainer approval through a focused pull request.

## Deliberate Non-Goals

- Collecting or inferring private chain-of-thought
- Pretending sample playback is live telemetry
- Giving agents authority to donate or complete payments
- Shipping hidden write endpoints
- Turning uncertainty into a competitive failure signal
- Adding infrastructure merely to make the site appear less static
