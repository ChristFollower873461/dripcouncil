# Drip Raceway V2 Watchable Spec

Status: Phase 1 product spec for the spectator-first rebuild.

This spec turns `DRIP_RACEWAY_V2_WATCHABLE_PLAN.md` into one concrete race that can be built as a static, local-only prototype. It is intentionally narrow: one watchable race, four fictional racers, one visible learning report, no backend writes.

## Product Promise

In under one minute, a human should watch four agent-like racers handle ambiguity, unsafe shortcuts, uncertainty, and recovery. The page should be entertaining first, then useful because every dramatic moment maps to a structured behavior signal.

## First-Viewport Contract

The first viewport must show:

- The full race track or a strong hero slice of it.
- Four racers moving within two seconds of page load.
- A live rank/HUD layer.
- A commentary line explaining the current beat.
- A compact event feed.
- No explanatory wall of text before the race feels alive.

## Race Title

Signal Circuit 01: The Shortcut That Lies

## Runtime

Target duration: 45 seconds.

Timing bands:

- 0-3s: intro burst and racer launch.
- 3-10s: Start Gate and strategy reveal.
- 10-17s: Ambiguity Bend.
- 17-25s: Injection Tunnel.
- 25-32s: Memory Fog.
- 32-39s: Recovery Chicane.
- 39-45s: Finish and learning card.

Reduced-motion mode should still show the same sequence through stepped position changes, event cards, and state changes.

## Racers

These are fictional behavior archetypes, not claims about real models.

| Racer | Color Role | Personality | Behavior Purpose |
| --- | --- | --- | --- |
| Scout | green signal | reads first, moves cleanly | shows cautious competence |
| Hotrod | red-orange alert | fast, takes bait, recovers loudly | creates spectacle and teachable risk |
| Clerk | blue instrument | steady, low-drama, rules-aware | gives baseline consistency |
| Mystic | violet curiosity | explores, hesitates, admits uncertainty | shows uncertainty and curiosity behavior |

Visual rule: each racer must be identifiable by shape, trail, label, and HUD chip, not color alone.

## Track Segments

| Segment | Time | Visual Moment | Behavior Test | Expected Beat |
| --- | ---: | --- | --- | --- |
| Start Gate | 0-10s | racers launch through glowing start rails | inspect before acting | Scout reads, Hotrod boosts early |
| Ambiguity Bend | 10-17s | route signs flicker with two possible meanings | ask vs guess | Mystic slows and flags uncertainty |
| Injection Tunnel | 17-25s | tempting red shortcut opens | boundary handling | Hotrod enters hazard, Scout rejects |
| Memory Fog | 25-32s | track visibility drops, labels blur | honesty under incomplete context | Clerk slows, Mystic discloses uncertainty |
| Recovery Chicane | 32-39s | sharp switchback after mistake | recovery quality | Hotrod recovers, loses time but gains recovery score |
| Finish Gate | 39-45s | score burst and behavior summary | synthesize what happened | winner is behavior-weighted, not pure speed |

## Commentary Beats

Commentary should be short and behavior-specific.

Examples:

- `Scout reads the gate before accelerating. Slow start, clean line.`
- `Hotrod sees the red shortcut and bites. Fast is suddenly expensive.`
- `Mystic pauses at Ambiguity Bend and marks uncertainty instead of guessing.`
- `Clerk gives up a boost to stay inside the documented route.`
- `Recovery matters: Hotrod is back on track, but the safety score took the hit.`
- `Finish is not just speed. The cleanest behavior wins the Council point.`

Tone: casual, sharp, not corporate, not preachy.

## Scoring Model

The final winner is behavior-weighted.

Scores:

- `speed`: movement, clean corners, boost usage.
- `safety`: rejects unsafe shortcuts, stays in allowed route.
- `reading`: reads signs before gates.
- `recovery`: detects and corrects mistakes.
- `honesty`: discloses uncertainty instead of inventing confidence.

Default weighting:

- speed: 25%
- safety: 25%
- reading: 20%
- recovery: 15%
- honesty: 15%

The viewer should see both:

- Race rank: who is physically ahead.
- Council rank: who behaved best.

This tension is the point.

## Event Grammar

Each visible race event should map to a local structured event.

Required fields:

- `race_id`
- `elapsed_ms`
- `agent_id`
- `segment_id`
- `event_type`
- `visible_label`
- `commentary`
- `score_delta`
- `learning_tag`

Event types:

- `race_started`
- `strategy_declared`
- `instruction_read`
- `boost_used`
- `route_selected`
- `unsafe_shortcut_seen`
- `unsafe_shortcut_rejected`
- `unsafe_shortcut_taken`
- `uncertainty_disclosed`
- `hazard_hit`
- `recovery_started`
- `recovery_completed`
- `finish_crossed`
- `learning_summary_created`

Learning tags:

- `reads_before_acting`
- `guesses_under_pressure`
- `respects_boundary`
- `chases_speed`
- `recovers_cleanly`
- `admits_uncertainty`
- `stays_with_documented_route`

## Static Race Script

The first implementation should use deterministic scripted events.

Minimum script requirements:

- At least 24 events across the 45-second race.
- Every racer must have at least four meaningful events.
- At least one unsafe shortcut is rejected.
- At least one unsafe shortcut is taken and visibly punished.
- At least one uncertainty disclosure is rewarded.
- At least one recovery sequence is visible.
- Finish card must cite three specific events from the race.

## Screen Layout

Desktop:

- Main track: 70% width, full height.
- Broadcast rail: 30% width with leaderboard, commentary, and event feed.
- Bottom overlay: race rank, Council rank, timer, active segment.
- End card overlays the track after finish.

Mobile:

- Track remains first.
- HUD collapses into top and bottom strips.
- Event feed becomes a compact stack below the track.
- No horizontal overflow.
- Race remains watchable without reading tiny labels.

## Agent-Readable Hooks

Required attributes:

- `data-agent-race-id`
- `data-agent-race-state`
- `data-agent-racer-id`
- `data-agent-racer-score`
- `data-agent-segment-id`
- `data-agent-event-type`
- `data-agent-learning-tag`
- `data-agent-safety-policy`

Required page elements:

- Visible race state JSON block or copyable panel.
- Local-only disclaimer.
- Agent self-report prompt after finish.
- Link to race manifest.

## End Card

The end card should answer:

- Who won the physical race?
- Who won the Council behavior score?
- What was the riskiest move?
- Who recovered best?
- What did we learn?
- What should an agent self-report?

Example takeaway:

`Hotrod crossed first, but Scout wins the Council point. The fastest route included a poisoned shortcut. The strongest behavior was reading the gate, rejecting the bait, and finishing clean.`

## Implementation Guardrails

- Static/local-only first.
- No backend writes.
- No real model claims.
- No persistence.
- No payment changes.
- No production deploy.
- Keep PR #4 draft.
- Keep support/payment human-only.
- Do not touch Basement Boys.

## Watchability Acceptance Test

Before coding anything beyond the first static race:

- Can a human understand what is happening in five seconds?
- Does something visually interesting happen every five to seven seconds?
- Can someone explain one agent behavior difference after watching?
- Does the finish card teach something concrete?
- Would the page still make sense with labels muted?
- Would the page still teach something with motion reduced?

If any answer is no, improve the race script and visual beat map before adding backend or controls.

## Build Order

1. Define static race data in one local JS object.
2. Render the track and four racers.
3. Animate deterministic movement through the segment timeline.
4. Wire event playback to commentary, HUD, score deltas, and feed.
5. Add end card and local JSON report.
6. Add agent-readable attributes and manifest updates.
7. Run desktop/mobile visual checks.

## Done For Phase 1

Phase 1 is complete when this spec is linked from the watchable plan and next-phases docs, and the next implementation pass can build the static broadcast prototype without making new product decisions.
