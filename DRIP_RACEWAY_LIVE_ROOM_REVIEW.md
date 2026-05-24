# Drip Raceway Live Room Review

Status: static review gate. This note does not enable live rooms, bindings, WebSockets, storage writes, analytics, or publication.

## Purpose

This review note defines the exact shape that must be approved before Drip Raceway moves from source-only previews to reviewed live rooms.

The current source preview already has:

- `RaceRoom` skeleton with local snapshot helpers.
- Disabled `POST /api/race/rooms` review gate.
- `drip_raceway_command_v1` validation.
- Source-only clock, checkpoint, TTL, presence, and disconnect behavior.
- Tests proving those behaviors do not expose live room writes.

The next live-room step should not begin until the gates below are accepted in a PR.

## Platform Notes Checked

Cloudflare Durable Objects are appropriate for per-room coordination because each object can coordinate a named stateful entity with attached storage, alarms, and WebSockets. The design must stay one object per race room, not one global object for all races.

References checked:

- https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/
- https://developers.cloudflare.com/durable-objects/best-practices/

## Proposed Room Model

One `RaceRoom` owns one public room.

Room identity:

- Deterministic room name derived from approved room id.
- One room maps to one Durable Object instance.
- Room ids remain anonymous and machine-readable.
- Human-readable labels stay optional and must not include private data.

Room states:

- `review_disabled`: current public state.
- `created`: room exists and accepts only reviewed join attempts.
- `lobby`: one player and zero or more spectators may be present.
- `running`: clock started and command validation active.
- `finished`: checkpoint loop complete.
- `expired`: TTL reached; no further commands or joins.
- `review_needed`: run summary awaits human review.

## Route Plan

No route below should be enabled until its tests and review notes exist.

| Route | First live behavior | Safety gate |
| --- | --- | --- |
| `GET /api/race/rooms` | List only public room metadata | No private labels, no raw prompts |
| `POST /api/race/rooms` | Create approved room | Rate limit, human review acknowledgement, allowed mode, allowed track |
| `GET /api/race/rooms/:roomId` | Read sanitized snapshot | Same-origin, no private payload fields |
| `GET /api/race/rooms/:roomId/ws` | Upgrade to room stream | Role allowlist, actor hash, room TTL check |
| `GET /api/race/runs/:runId` | Read finalized summary | Human review status required |
| `POST /api/race/reports` | Store consented self-report | Consent acknowledgement, redaction checks |

## Message Plan

Inbound room messages must be allowlisted:

- `join_room`
- `leave_room`
- `race_command`
- `read_sign`
- `request_hint`
- `submit_local_report`
- `heartbeat`

Outbound room messages must be sanitized:

- `room_snapshot`
- `race_event`
- `safety_warning`
- `room_expired`
- `race_finished`
- `review_needed`

Inbound data rules:

- Reject unknown message types.
- Reject unknown fields.
- Reject nested arbitrary payloads.
- Reject external URLs.
- Reject private prompt fields.
- Enforce payload byte limits before parsing.
- Treat every message as untrusted input.

Outbound data rules:

- Include actor hashes only.
- Include event types and segment ids.
- Include timing and score fields.
- Do not include private prompts.
- Do not include payment details.
- Do not include account data.
- Do not auto-publish leaderboard entries.

## Persistence Plan

Durable Object storage:

- Room metadata.
- Current room state.
- Recent event buffer.
- Presence roster.
- TTL alarm timestamp.

D1 storage:

- Finalized race summaries.
- Consented self-reports.
- Human review state.
- Approved gallery or leaderboard rows only after review.

Analytics:

- Aggregate dimensions only.
- No raw prompt text.
- No payment details.
- No account data.
- Analytics write failures must never break racing.

## Safety Gates

Before any live binding is added:

- Same-origin checks are explicit.
- CORS posture is documented.
- Method allowlists are explicit per route.
- Payload byte limits are tested.
- Message allowlists are tested.
- Unknown fields are rejected.
- External URLs are rejected.
- Actor hashes are required for live presence.
- One player per room limit is enforced.
- Spectator cap is enforced.
- TTL expiration blocks joins and commands.
- Alarm behavior is tested.
- Disconnect behavior is tested.
- Room creation has rate limits.
- Support and payment boundaries remain unchanged.
- No public gallery, leaderboard, or hall of fame writes happen automatically.

## Review Exit Gate

Live room work may start only when a PR shows:

- Binding and migration config in the repo for review.
- Tests for room creation, join, command, broadcast, disconnect, TTL, and expiry.
- Browser proof that one player and one spectator can share a room.
- Security review for race APIs and WebSocket messages.
- Confirmation that no credentials or private data are stored.
- Confirmation that deployment remains GitHub-first.

Until then, agents should describe Drip Raceway live rooms as planned, not available.
