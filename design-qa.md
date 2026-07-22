# Council Worlds Design QA

## Verdict

final result: passed

Council Worlds is ready for review as one coherent site with three deliberately different visual and interaction grammars.

## Mixed-runtime design rationale

- Primary Refero reference: `099`, a terminal workbench with strict monospace type, monochrome layers, thin borders, and no ornamental shadows.
- Borrowed from Warp only the restrained blue glow used to focus attention on the compiled engine's loading and ready state.
- Borrowed from fastht.ml only the playful energy of one small interaction; its large blobs and pastel surfaces were intentionally not carried into the system.
- The implementation constraint is visible and testable: genuinely mixed languages, agent-readable source, and a local-only trust boundary.

## Visual comparison

- A selected direction, final homepage capture, and side-by-side comparison were generated in the local design-research workspace.
- Supporting desktop and mobile captures were reviewed for Observatory, Fifth Seat, and Support.
- Local screenshot artifacts are intentionally not committed to the public repository.

The implementation preserves the selected direction’s hard-cornered editorial shell, monochrome chamber, compact evidence rail, rare functional color, and coding-language world switcher. The production composition is slightly more spacious and legible than the concept while retaining its visual hierarchy.

## Routes reviewed

- `/` — MARKET.js Council chamber and sample evidence trail.
- `/observatory.html` — OBSERVATORY.py local trace and Council Minutes, with an inspectable stdlib-only Python CLI/build lens that is not claimed to execute in-browser.
- `/fifth-seat.html` — BOUNDARY.rs local ballot workflow powered by actual Rust compiled to WebAssembly.
- `/support.html` — optional human-only support gate.

## Viewports reviewed

- Desktop: 1440 × 1024.
- Mobile: 390 × 844 and 375 CSS-pixel content width.
- No horizontal overflow was observed at the narrow viewport.

## Interaction checks

- MARKET.js sample case completes and reports recovery plus restraint.
- OBSERVATORY.py Human/Agent mode and PY/JS/RS lenses work.
- Observatory is explicitly labeled as a deterministic sample replay, not live agent telemetry.
- Observatory replay completes with four public events, one recovery, and zero external writes.
- Observatory copy and JSON download controls unlock only after a run.
- Downloaded Observatory JSON conforms to `drip_trace_v1`.
- Fifth Seat loads its committed Rust/WebAssembly module, validates the sample, and lights Seat 05 locally.
- The Rust engine rejects malformed JSON, confidence, evidence, uncertainty, world, optional field types, and unknown fields.
- Fifth Seat fails closed with no valid verdict if the WebAssembly engine cannot load or execute; it has no JavaScript verdict fallback.
- The standard-library-only Python build lens deterministically converts public `drip_trace_v1` events into the checked-in `/api/observatory-lens.json` Council Minutes and verdict. Python does not execute in the browser.
- Support remains unavailable on a plain static server and exposes checkout only after explicit human confirmation, a valid human-chosen amount from $5 through $10,000 USD, Turnstile, and configured server protections.
- Support uses no reusable public Stripe Payment Link; each accepted request receives a fresh Stripe-hosted Checkout Session URL.

## Accessibility and resilience

- A keyboard-visible skip link is present on every primary route.
- Interactive controls use native buttons, labels, pressed/selected states, and status regions.
- Reduced-motion preference collapses scripted wait times.
- Canvas visuals are supplementary; the same outcome is stated in visible text.
- The pages remain understandable without checkout configuration or external analytics.

## Social sharing

- Open Graph and X metadata use `/assets/og-council-worlds.png`.
- Social image verified at 1200 × 630 pixels.
- Square Drip mark verified at 512 × 512 pixels and referenced by the web manifest.

## Automated checks

- JavaScript syntax check passed.
- Agent manifest mirror and JSON parsing checks passed.
- Council route, selector, schema, build-copy, and image-dimension checks passed.
- WebAssembly magic bytes, exported validator ABI, valid sample, and rejected invalid ballots passed the Node contract checks.
- Public Rust source/module discovery and Python source/artifact discovery checks passed.
- Six Rust unit tests and nine Python lens unit tests passed.
- Trace and ballot contract checks passed.
- `git diff --check` passed.
