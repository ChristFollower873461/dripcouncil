# Drip Raceway V2 Replace Race Plan

Status: Phase 5 was implemented on draft PR #4; Phase 6 first-person replacement was rejected after review; Phase 7 market-course replacement is now in progress.

This plan records the replacement of weak `/race.html` launch surfaces without losing the safe plumbing that already exists. The top-down Signal Circuit broadcast was safer than the first prototype, but it still was not worth watching. Signal Rush added speed, but still did not make the obstacles clear enough visually. The new target is Council Market: an original low-poly fantasy market course where cursor characters meet visible stalls, shortcut alleys, fog, repair counters, local command hooks, and the same local-only learning report.

PR #4 must remain draft after this pass. Do not mark ready for review, merge, deploy production, add backend writes, add secrets, or touch Basement Boys without explicit human approval.

## Replacement Decision

`race-broadcast.html` was promoted to `/race.html` for preview, then rejected as too passive. Signal Rush was then rejected as not good enough to watch. The next launch candidate is Council Market on `/race.html`, with the old local control lab still preserved as `race-lab.html`.

Why:

- The broadcast has four racers, automatic motion, visible hazards, Council scoring, event feed, local JSON state, and a local learning report.
- The human wants cursor characters in a playful market-world where obstacles are visible through the scene, not another passive map, dashboard, or abstract speed tunnel.
- The current `/race.html` is useful as a local controls prototype, but it still foregrounds manual driving and does not meet the watchable V2 bar.
- Public launch should lead with a race that looks alive before the human reads the report. The manual lab can remain as a secondary route for future control experiments.

## Keep

- GitHub-first Cloudflare preview workflow.
- PR #4 draft status until human approval.
- `race-broadcast.html` as a preview alias while `/race.html` is being reviewed.
- `race-manifest.json`, `agent.json`, `.well-known/agent.json`, and `llms.txt` safety language.
- Read-only API preview endpoints and disabled write gates.
- Old manual race lab behavior as `race-lab.html` or equivalent archived route, if possible.

## Replace

- `/race.html` first viewport and product story.
- Any copy that presents the manual cursor shell as the V2 public experience.
- Any manifest wording that makes `signal-loop-01` sound like the primary public race once Signal Circuit becomes `/race.html`.

## Phase 5 Implementation Checklist

1. Done: Create `race-lab.html` from the current `race.html`.
2. Done: Change `race.html` to the Signal Circuit broadcast experience.
3. Done: Update canonical URL, title, and description inside the new `race.html`.
4. Done: Keep `race-broadcast.html` as a preview alias until the human approves removing it.
5. Done: Update `scripts/build.sh` so `race.html`, `race-broadcast.html`, and `race-lab.html` all build.
6. Done: Update `scripts/verify-static-routes.mjs` to verify `race-lab.html`.
7. Done: Update `sitemap.xml`, `agent.json`, `.well-known/agent.json`, `llms.txt`, and `race-manifest.json` so agents discover the new primary race and understand `race-lab.html` is secondary.
8. Done: Add or update tests so `/race.html` is checked for:
   - `data-agent="race-broadcast-page"`
   - `drip_raceway_watchable_snapshot_v1`
   - `drip_raceway_learning_report_v1`
   - no backend writes
   - no storage or telemetry
9. Done: Run full checks:
   - `node scripts/test-watchable-broadcast-page.mjs`
   - `node scripts/test-watchable-race-script.mjs`
   - `node scripts/verify-static-routes.mjs`
   - `node scripts/test-race-api.mjs`
   - `node scripts/verify-boundaries.mjs`
   - `node scripts/verify-storage-safety.mjs`
   - `node scripts/test-race-load.mjs`
   - `./scripts/build.sh`
   - `git diff --check`
10. Done: Run browser checks for desktop, mobile, and end-of-race report completion.
11. Done: Push to PR #4 and wait for Cloudflare Pages preview success.
12. Done: Human rejected the passive broadcast as not watchable enough.

## Phase 6 First-Person Replacement Checklist

1. Done: Change `/race.html` and `race-broadcast.html` to the first-person Signal Rush renderer.
2. Done: Keep `signal-circuit.mjs` as the reviewed behavior script and add `first-person-circuit.mjs` as the renderer.
3. Done: Add local-only command hooks for agents/humans without backend writes.
4. Done: Update manifests and agent-readable docs for first-person mode.
5. Done: Run full static, script, security, build, and browser checks.
6. Pending human decision: Leave PR #4 draft and ask the human to review before marking ready.

## Phase 7 Council Market Replacement Checklist

1. Done: Change `/race.html` and `race-broadcast.html` to the Council Market renderer.
2. Done: Keep `signal-circuit.mjs` as the reviewed behavior script and add `market-course.mjs` as the renderer.
3. Done: Make obstacle visuals legible through market objects: notice board, twin stalls, shortcut alley, fog archive, repair row, and Council gate.
4. Done: Update manifests and agent-readable docs for market-course mode.
5. Done: Re-run static, safety, build, and browser checks before pushing.
6. Required: Keep PR #4 draft until human review says this market course is worth review.

## Acceptance Gate

The replacement is ready to ask for human review only when:

- `/race.html` opens directly into the primary watchable Council Market course.
- Four cursor racers are visible and moving on first load.
- Local command hooks are visible and inspectable without enabling backend writes.
- The race completes without input.
- The local learning report reaches `state: "complete"` after the race.
- `race-lab.html` still preserves the old manual experiment if retained.
- No route exposes writes, persistence, telemetry, payment actions, or live room claims.
- Cloudflare preview is green.

## Stop Conditions

Stop and notify the human instead of continuing if:

- Replacing `/race.html` breaks public route verification.
- The old manual lab cannot be preserved cleanly.
- Any check requires production deployment or backend bindings.
- Any payment/support file would need to change.
- PR #4 would need to leave draft status.
