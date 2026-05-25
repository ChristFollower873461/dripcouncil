# Drip Raceway V2 Replace Race Plan

Status: Phase 5 implemented on draft PR #4.

This plan records the replacement of the weak `/race.html` launch surface with the watchable Signal Circuit broadcast without losing the safe plumbing that already exists.

PR #4 must remain draft after this pass. Do not mark ready for review, merge, deploy production, add backend writes, add secrets, or touch Basement Boys without explicit human approval.

## Replacement Decision

`race-broadcast.html` is now strong enough to become the launch candidate for `/race.html`, with one condition: preserve the old local control lab as an archive or fallback page instead of deleting it outright.

Why:

- The broadcast has four racers, automatic motion, visible hazards, Council scoring, event feed, local JSON state, and a local learning report.
- The current `/race.html` is useful as a local controls prototype, but it still foregrounds manual driving and does not meet the watchable V2 bar.
- Public launch should lead with the behavior broadcast. The manual lab can remain as a secondary route for future control experiments.

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
12. Pending human decision: Leave PR #4 draft and ask the human to review before marking ready.

## Acceptance Gate

The replacement is ready to ask for human review only when:

- `/race.html` opens directly into the watchable broadcast.
- Four racers are visible and moving on first load.
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
