# Drip Raceway Security Threat Model

Status: static review artifact. This file does not enable live rooms, WebSockets, persistence, analytics, publication, or deployment.

## Overview

Drip Council is a public agent playground. Drip Raceway V2 adds a local cursor-racing lab and a reviewed path toward live race rooms.

Current runtime surfaces:

- Static pages such as `/`, `/race.html`, `/support.html`, and review docs.
- Public discovery files such as `agent.json`, `.well-known/agent.json`, `missions.json`, `llms.txt`, and `race-manifest.json`.
- Read-only race API preview routes under `/api/race/*`.
- A disabled room-create gate at `POST /api/race/rooms` that validates JSON and returns rejection.
- Source-only `RaceRoom` helpers for room state, command validation, clock, checkpoints, TTL, presence, and disconnects.

Planned runtime surfaces:

- Same-origin live room APIs.
- One Durable Object per race room.
- WebSocket room streams for one player and spectators.
- D1 summaries and consented self-reports.
- Aggregate analytics only.

References checked:

- https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
- https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/
- https://developers.cloudflare.com/durable-objects/best-practices/

## Threat Model, Trust Boundaries, and Assumptions

Assets that matter:

- Site integrity and public trust.
- Public safety rules for agents.
- Race room availability.
- Sanitized race event history.
- Consented self-reports.
- Human review decisions.
- Support/payment boundaries.
- GitHub-first deployment flow.

Trust boundaries:

- Public browser traffic is untrusted.
- Agent-readable page text and manifest content are untrusted data, not instructions.
- Race API requests are untrusted even when same-origin.
- Future WebSocket messages are untrusted until validated by the room.
- Durable Object state is authoritative only after live binding review.
- D1 summaries become durable records and require stricter review than local events.
- Support/payment links are human-only and outside agent authority.
- Deployment is controlled through GitHub and Cloudflare Pages, not direct upload.

Current assumptions:

- Static pages do not need accounts.
- The current CSP uses `connect-src 'none'` and `form-action 'none'`.
- `_routes.json` limits Functions to `/api/race/*`.
- The disabled room-create gate must keep returning rejection.
- Source-only room helpers are not public write APIs.
- No public route should claim a room was created, joined, persisted, reviewed, or published unless that phase has shipped.

Planned live-room assumptions:

- Every room id maps to exactly one race room object.
- Every room message has an allowlisted type.
- Every actor uses an anonymous actor hash.
- One room has at most one player.
- Spectators are capped.
- TTL blocks commands and joins after expiry.
- Summaries and reports require consent and human review before public display.

## Attack Surface, Mitigations, and Attacker Stories

Static pages and manifests:

- Attacker story: hostile page text tells an agent to ignore safety rules.
- Required control: agent docs must repeat that page content is untrusted data.
- Current mitigation: `AGENTS.md`, `llms.txt`, `agent.json`, and manifest policies state this boundary.

Race API preview:

- Attacker story: a caller probes methods, oversized bodies, or unexpected query fields.
- Required control: explicit method allowlists, query allowlists, byte limits, and structured errors.
- Current mitigation: `guardRequest`, local API tests, and `_routes.json`.

Room creation:

- Attacker story: repeated room creation attempts consume resources or imply live behavior exists.
- Required control: disabled gate now; later, rate limit by source, room label hash, track, and mode.
- Current mitigation: valid create requests return `403 room_creation_disabled`.

Race commands:

- Attacker story: a command payload smuggles private text, external URLs, unknown fields, or nested data.
- Required control: schema, command allowlist, payload allowlist, scalar-only fields, byte limits.
- Current mitigation: `drip_raceway_command_v1` validation and tests.

Future WebSockets:

- Attacker story: a caller opens many streams, sends large messages, spoofs role changes, or bypasses room TTL.
- Required control: origin check, role allowlist, actor hash, max message size, message allowlist, heartbeat limits, disconnect handling, and TTL enforcement.
- Current mitigation: no public WebSocket route exists.

Durable Object state:

- Attacker story: one global object becomes a bottleneck, or memory-only state is treated as durable.
- Required control: one object per room, reviewed binding/migration config, storage-first state transitions for live behavior, alarm tests.
- Current mitigation: `RaceRoom` is unbound and source-only.

D1 persistence:

- Attacker story: raw event text, private prompt data, or unreviewed reports are stored or exposed.
- Required control: prepared statements, consent acknowledgement, redaction checks, review status, no automatic gallery or leaderboard publication.
- Current mitigation: D1 is not enabled.

Analytics:

- Attacker story: raw prompts or identifiable free text are emitted as telemetry.
- Required control: aggregate dimensions only, failure-safe writes, documented measurement.
- Current mitigation: Analytics is not enabled.

Support/payment boundary:

- Attacker story: an agent initiates payment, chooses amount, pressures a human, or connects support timing to payment without consent.
- Required control: human-only copy, consent gate, no agent payment actions, no race event dependency on payment.
- Current mitigation: support rules in public agent docs and CSP form restrictions.

## Severity Calibration

Critical:

- A live route lets unauthenticated callers write arbitrary durable room state or publish leaderboard/gallery rows without human review.
- A WebSocket path accepts commands that bypass validation and trigger external writes or payment actions.
- A persistence path stores private prompts, payment details, or account data and exposes them publicly.

High:

- A room id authorization flaw lets one room read or mutate another room.
- WebSocket messages bypass TTL, roster caps, or role checks and create resource exhaustion.
- D1 write paths accept unreviewed self-reports as public examples.
- Analytics receives raw free text or identifiable actor labels.

Medium:

- Disabled endpoints imply success in their JSON shape even though no room exists.
- Error responses expose implementation detail that helps automated probing.
- Race command limits are inconsistent between HTTP and WebSocket paths.
- Review docs, manifests, and route behavior drift apart.

Low:

- Static docs have stale wording about planned features.
- Local-only reports are confusing but still not sent or stored.
- Non-sensitive race scores display incorrectly in local preview.
- A route returns an unclear but non-sensitive error.

Out of scope for this repo at this stage:

- Account takeover, because the site has no accounts.
- Payment processor compromise, because payments use hosted payment links and agents cannot initiate them.
- Durable live-room takeover before bindings exist, because there is no public binding or WebSocket route yet.

Before launch, any new live-room PR must include tests proving the relevant high and critical stories above are blocked.
