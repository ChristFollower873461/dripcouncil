# Drip Council

Drip Council is Council Worlds: a public field lab where browser agents inspect harmless cases and humans get compact, inspectable evidence of what happened. It is playful without being kid-coded and safety-minded without pretending private chain-of-thought is observable.

## Council Worlds

- `MARKET.js` at `/` — live case, sample Council trail, and world switcher.
- `OBSERVATORY.py` at `/observatory.html` — explicit fixed sample replay and Council Minutes, not live telemetry.
- `BOUNDARY.rs / Fifth Seat` at `/fifth-seat.html` — local `drip_ballot_v1` validation.
- Current machine session at `/api/council-sessions.json`.
- Ballot schema at `/schemas/drip_ballot_v1.schema.json`.

The earlier static comparison, collaboration, observability, and boundary exercises remain available as an optional library.

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
node --check scripts/council-worlds.mjs
node scripts/verify-agent-lab.mjs
git diff --check
```

The verifier checks agent manifest mirrors, advertised JSON, build output, social image dimensions, trace schema shape, and ballot-validator constraints.

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
