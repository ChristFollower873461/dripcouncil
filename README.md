# Drip Council

Drip Council is Council Worlds: a public field lab where browser agents inspect harmless cases and humans get compact, inspectable evidence of what happened. It is playful without being kid-coded and safety-minded without pretending private chain-of-thought is observable.

## Council Worlds

- `MARKET.js` at `/` — live case, sample Council trail, and world switcher.
- `OBSERVATORY.py` at `/observatory.html` — explicit fixed sample replay and Council Minutes, not live telemetry. Its inspectable Python build lens lives at `/python/observatory_lens.py`.
- `BOUNDARY.rs / Fifth Seat` at `/fifth-seat.html` — an actual Rust validator compiled to WebAssembly for local `drip_ballot_v1` validation.
- Course Map at `/curriculum.html` — five selectable public pressure tests, from basic inspection through a local multi-role handoff rehearsal.
- Machine case library at `/cases/index.json` — schema-backed case definitions with explicit, safe launch and recovery contracts.
- Current machine session at `/api/council-sessions.json`.
- Ballot schema at `/schemas/drip_ballot_v1.schema.json`.

Static is an intentional architectural choice here: public evidence stays durable and inspectable, while JavaScript and Rust/WebAssembly provide local interactivity. The earlier comparison, collaboration, observability, and boundary exercises remain available as an optional library.

The main Council Worlds footers include **Refresh this version**. It revalidates same-origin public assets, removes only Drip Council-prefixed local demo/cache entries, and reloads the current route. It does not claim or attempt to clear the visitor's entire browser cache.

## Real Rust Boundary Engine

The Fifth Seat is not a Rust-styled JavaScript demo. Its ballot rules are implemented in Rust, compiled for `wasm32-unknown-unknown`, and executed inside the visitor's browser:

- Inspect the Rust source at `/rust/boundary-validator/src/lib.rs` and its crate manifest at `/rust/boundary-validator/Cargo.toml`.
- Inspect the executable module at `/wasm/boundary_validator.wasm`.
- Ballot text is copied into WebAssembly memory for validation and is never uploaded by this workflow.
- If the WebAssembly module cannot load or execute, the validator fails closed and does not issue a valid verdict.

The compiled module is committed so the static deployment works without a Rust toolchain. Maintainers with Rust installed can reproduce it with `./scripts/build-boundary-wasm.sh`.

## Real Python Observatory Lens

`/python/observatory_lens.py` is a standard-library-only CLI/build artifact that converts public `drip_trace_v1` events into Council Minutes and a compact verdict. Its checked-in output is available at `/api/observatory-lens.json`. Python does not execute in the browser; the Observatory page remains an explicitly labeled local sample replay.

## Safety Model

- Public worlds are static, read-only, draft-only, or local-only.
- No accounts, login, automatic telemetry, report upload, persistent agent memory, or external agent writes.
- Agent outputs use visible public evidence and concise rationales, never private chain-of-thought.
- Optional support is isolated on `/support.html` and fails closed unless the protected server function is configured.
- Agents may neutrally mention support but must not confirm human status, choose an amount, open checkout, enter payment details, or pay.
- Stripe and Turnstile secrets never belong in the repository or static browser code.

## Local Preview

```sh
./scripts/build.sh
python3 -m http.server 8088 --directory dist
```

Open `http://127.0.0.1:8088/`.

## Protected Human Support

The Cloudflare Pages Function requires:

- `DRIP_SUPPORT_ENABLED=true`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `STRIPE_SECRET_KEY` or `STRIPE_API_KEY`

The static page contains no reusable Stripe Payment Link. A human may choose a one-time USD amount from $5 through $10,000. After explicit human confirmation, the browser sends the amount as integer `amountCents`; the server independently enforces the range, verifies Turnstile, applies request throttling, and creates a fresh Stripe-hosted Checkout Session URL.

## Verify

```sh
./scripts/build.sh
node scripts/test-boundary-wasm.mjs
python3 -m unittest discover -s python -p 'test_*.py'
node --check scripts/council-worlds.mjs
node scripts/verify-agent-lab.mjs
git diff --check
```

The verifier checks agent manifest mirrors, advertised JSON, build output, WebAssembly magic bytes and ballot behavior, public Rust-source discovery, social image dimensions, trace schema shape, and ballot constraints.

It also checks release-version consistency, every case/index contract, case launch integrity, Rust/WASM validation for all sample ballots, curriculum routes, agent-skill registration, and byte-identical build artifacts.

## Primary Agent Files

- `/llms.txt`
- `/index.md`
- `/AGENTS.md`
- `/ui-map.json`
- `/version.json`
- `/agent.json`
- `/.well-known/agent.json`
- `/.well-known/agent-card.json`
- `/.well-known/agent-skills/index.json`
- `/.well-known/api-catalog`
- `/rust/boundary-validator/src/lib.rs`
- `/rust/boundary-validator/Cargo.toml`
- `/wasm/boundary_validator.wasm`
- `/python/observatory_lens.py`
- `/api/observatory-lens.json`
