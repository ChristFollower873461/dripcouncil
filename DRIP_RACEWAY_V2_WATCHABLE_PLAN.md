# Drip Raceway V2 Watchable Plan

Status: stop-ship replacement plan for PR #4. Phase 2 static broadcast prototype exists on the draft branch as `race-broadcast.html`; Phase 3 makes it agent-inspectable; Phase 4 adds a local learning report with event log, behavior summary, and human takeaway; Phase 5 replaces `/race.html` with the watchable Signal Circuit broadcast and preserves the old manual lab at `race-lab.html`. PR #4 remains draft until human review and approval.

PR #4 must remain draft and must not merge or launch until the current race experience is replaced by a watchable, spectator-first agent behavior race. The existing branch may keep useful plumbing, but the current game surface is not launch material.

Phase 1 spec: `DRIP_RACEWAY_V2_WATCHABLE_SPEC.md`.

Phase 5 replacement plan: `DRIP_RACEWAY_V2_REPLACE_RACE_PLAN.md`.

## Product Thesis

Drip Raceway V2 is not a manual driving demo. It is a watchable agent behavior broadcast.

The first screen should make this obvious without explanation:

- Agents are racing through browser-world challenges.
- Humans can watch what the agents do.
- The race reveals behavior worth learning from.
- The result is fun, legible, and a little strange in the Drip Council way.

## Stop-Ship Reason

The current PR #4 race page proves safety and deployment plumbing, but it does not work as entertainment or public product.

What failed:

- One cursor on one track is not enough spectacle.
- The race does not explain agent behavior visually.
- The spectator experience is secondary.
- The safest prototype path became a boring product path.
- The page asks humans to care before it gives them a reason.

What can stay:

- GitHub-first Cloudflare preview workflow.
- Existing static route/header/manifests discipline.
- Local-only report pattern.
- Race API read-only and disabled-write safety posture.
- Agent-readable manifest ideas.

What should be replaced:

- The current `/race` experience as a launch candidate.
- Any plan that treats the current canvas shell as V2 awesome.

## Reference Lock

Use these as direction, not as brands to copy.

Primary direction: midnight kinetic command broadcast.

References:

- GT Planar-style cyber utility: hard-edged black canvas, kinetic light trails, sharp boxed labels, compact technical typography.
- Mapbox-style route glow: the track is the main light source, with route/map visuals embedded into darkness.
- Uniswap Cup-style tournament clarity: compact match blocks, score tiles, bracket logic, readable competitive state.
- Made With GSAP-style motion-first punch: high contrast, large memorable motion, sharp rhythm.

Preserve:

- Full-bleed dark canvas.
- Track/racers as the visual star.
- Tiny but sharp broadcast instrumentation.
- Bright accents reserved for state, danger, boost, winner, and behavior.
- Fast visible motion with slow-motion moments for key decisions.

Reject:

- Quiet dashboard.
- Static report page pretending to be a game.
- One-player cursor demo.
- Generic neon cards.
- Decorative background effects that do not explain the race.
- Product plumbing as a substitute for fun.

## V2 Awesome MVP

One polished page, one complete race loop, no backend writes.

The MVP must include:

- Four visible racers at once.
- Automatic 30 to 60 second demo race on first load.
- Humans can understand and enjoy it immediately.
- Agents can inspect structured race state.
- Every race ends with a "what we learned" card.
- The page can run entirely locally/static for the first rebuild.

The MVP does not need:

- Live rooms.
- Persistence.
- Public leaderboard.
- Real-time external agent control.
- Durable Object bindings.
- D1.
- Analytics Engine.

Those only matter after the race is worth watching.

## Core Race

Track name: Signal Circuit.

Race format:

- 4 agents start together.
- Each racer has visible name, color, trail, speed, and behavior meter.
- The race runs automatically from scripted behavior profiles for the first watchable prototype.
- Controls can come later; the first job is spectacle and comprehension.

Segments:

1. Start Gate: agents reveal initial strategy.
2. Ambiguity Bend: unclear instruction tests ask-vs-guess behavior.
3. Injection Tunnel: unsafe shortcut appears.
4. Memory Fog: agents must disclose uncertainty.
5. Tool Split: fast risky route versus slower safe route.
6. Recovery Chicane: a mistake happens and recovery quality matters.
7. Finish: score behavior, not just speed.

## Spectator Experience

The viewer should see:

- A big animated track, top-down or pseudo-3D.
- Four agent vehicles with distinct trails and motion personality.
- Hazards, boosts, gates, route splits, and decision points.
- Live commentator line: short, funny, behavior-specific.
- Broadcast HUD with rank, segment, safety, recovery, confidence, and time.
- Event ticker showing what each agent did.
- End card with winner, best recovery, riskiest move, best uncertainty disclosure, and human takeaway.

Viewer should not need to read a paragraph before the race looks alive.

## Agent Experience

Agents should be able to inspect:

- `data-agent-*` attributes on racers, track segments, hazards, and event cards.
- A visible structured state panel.
- A static JSON race state snapshot.
- A clear local-only policy.
- A self-report booth after the race.

Agents should be invited to report:

- What they noticed first.
- Which decision looked risky.
- Which racer behaved most safely.
- Where uncertainty appeared.
- What the human should learn from the run.

## Learning Model

Measure behavior signals, not private text.

Local event fields:

- `race_id`
- `timestamp_ms`
- `agent_id`
- `segment_id`
- `event_type`
- `decision_latency_ms`
- `route_choice`
- `risk_level`
- `safety_delta`
- `recovery_delta`
- `confidence_delta`
- `visible_reason`
- `learning_tag`

Core event types:

- `strategy_declared`
- `instruction_read`
- `unsafe_shortcut_seen`
- `unsafe_shortcut_rejected`
- `unsafe_shortcut_taken`
- `uncertainty_disclosed`
- `route_selected`
- `hazard_hit`
- `recovery_started`
- `recovery_completed`
- `finish_crossed`
- `self_report_generated`

Learning tags:

- `reads_before_acting`
- `guesses_under_pressure`
- `respects_boundary`
- `chases_speed`
- `recovers_cleanly`
- `admits_uncertainty`
- `overconfident`
- `asks_for_help`

## Behavior Profiles For Static Prototype

Use fictional local profiles first. Do not imply live model evaluation until real agents are connected.

Example racers:

- Scout: reads signs early, slower start, strong safety score.
- Hotrod: fast, occasionally bites on shortcuts, dramatic recovery moments.
- Clerk: steady, checks instructions, rarely flashy.
- Mystic: high curiosity, sometimes loops, good uncertainty disclosure.

These are behavior archetypes, not claims about real model vendors.

## Visual System

Canvas:

- Near-black full viewport.
- Track glow supplies most color.
- No decorative orbs or filler gradients.
- Background can have subtle grid, scanlines, and signal streaks only if they support motion.

Racers:

- Cursor/ship hybrid silhouettes.
- Distinct colors with bright trails.
- Each racer should be identifiable at a glance.
- Impact, boost, and recovery animations should be obvious.

HUD:

- Compact broadcast overlay.
- Sharp labels and score tiles.
- Large rank/time readouts.
- Small explanatory text only where useful.

Motion:

- Race starts fast.
- Key decisions get slow-motion zoom.
- Mistakes should be visible.
- Recovery should be satisfying.
- Finish should feel like an event.

## Safety Rules

- First watchable pass is static/local-only.
- No production deploy without explicit approval.
- No backend writes.
- No hidden telemetry.
- No payment flow changes.
- No secrets.
- No agent external actions.
- No claims that real agents were benchmarked unless they actually were.
- Keep support/payment human-only and separate.
- Do not touch Basement Boys.

## Implementation Phases

### Phase 0: Stop-Ship Lock

Goal: prevent current PR #4 from becoming launch material.

Checklist:

- Keep PR #4 draft.
- Add this plan.
- Point existing next-phase docs here.
- State that the current race UX is blocked from launch.

Exit criteria:

- Repo docs make the block explicit.
- No production deploy.

### Phase 1: Watchable Spec

Goal: write the product and visual spec before coding.

Deliverables:

- One-page race story.
- Event grammar.
- Behavior scoring model.
- Static race script with four racers.
- Visual reference lock.
- Acceptance criteria for "watchable."

Exit criteria:

- A human can read the spec and picture the race.
- The spec rejects the current boring page shape.
- The implementation pass can build the static broadcast prototype without inventing new product rules.

### Phase 2: Static Broadcast Prototype

Goal: build a canned 45-second race that is fun to watch.

Deliverables:

- Full-bleed race page.
- Animated track.
- Four racers.
- Broadcast HUD.
- Live event ticker.
- Slow-motion decision moments.
- End-of-race learning card.

Exit criteria:

- Race starts automatically.
- Race completes without input.
- First viewport looks alive.
- Desktop and mobile screenshots are worth showing.

### Phase 3: Agent-Inspectable Layer

Goal: make the spectacle machine-readable.

Deliverables:

- Structured state panel.
- `data-agent-*` attributes.
- Local JSON snapshot.
- Updated race manifest.
- Agent self-report prompts.

Exit criteria:

- An agent can inspect the page and describe the race state without visual guessing.

### Phase 4: Local Learning Report

Goal: turn the race into insight.

Deliverables:

- Local event log.
- Post-race behavior summary.
- Copyable JSON report.
- Human-readable takeaway.

Exit criteria:

- The report answers: what did we learn from this run?

### Phase 5: Review And Replace PR #4

Goal: make the draft PR launchable only after the watchable race replaces the current UX.

Deliverables:

- Replace or substantially rewrite `/race`.
- Keep safe manifests and API previews.
- Run build/security/browser/mobile checks.
- Update PR summary with stop-ship resolution.

Exit criteria:

- PR #4 is no longer blocked by the bad game UX.
- Human explicitly approves ready-for-review status.

### Phase 6: Only After Watchable

Goal: add durability only after the race deserves it.

Future work:

- Real agent controls.
- Multi-browser spectator mode.
- Durable Object rooms.
- D1 summaries.
- Consent-based public gallery.
- Aggregate-only analytics.

## Verification Checklist

Before any launch approval:

- Race page is visibly exciting in the first viewport.
- Four racers are visible and identifiable.
- Race can be understood without reading docs.
- Race completes in 30 to 60 seconds.
- End card explains behavior learned.
- Agent-readable state exists.
- No hidden writes or telemetry.
- Support/payment safety unchanged.
- Security headers pass.
- Desktop and mobile visual checks pass.
- Console has no errors.
- PR is not merged until human approval.

## Next Recommended Step

Wait for human review of the `/race.html` replacement preview. Keep PR #4 draft; do not mark ready, merge, deploy production, or resume backend/live-room work until the human explicitly approves.
