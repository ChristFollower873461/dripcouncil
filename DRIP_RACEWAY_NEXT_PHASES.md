# Drip Raceway Next Phases

This is the short operating plan after the first V2 draft PR.

## Current Anchor

- Branch: `codex/drip-raceway-v2`
- Draft PR: https://github.com/ChristFollower873461/dripcouncil/pull/4
- Rule: do not merge, deploy, add secrets, add live backend bindings, or touch Basement Boys without explicit approval.

## Phase A: Preview Watch

Goal: make PR #4 reviewable in a real preview environment.

- Check PR #4 status checks, deployment records, and comments for a Cloudflare preview URL.
- If no preview URL exists, do not spam changes; wait or diagnose GitHub/Cloudflare integration.
- If a preview URL appears, verify `/race.html`, `/race-manifest.json`, manifest files, race API preview routes, support/payment boundaries, security headers, mobile layout, and nonblank race canvas.
- Notify only when a preview URL appears, a check fails, or a human decision is needed.

## Phase B: Review Gate

Goal: decide whether the static/local V2 preview should merge.

- Keep PR #4 draft until the human says it is ready.
- Summarize any preview findings and required fixes.
- Convert out of draft or merge only after explicit approval.

## Phase C: Approved Launch

Goal: launch only after approved merge.

- Let Cloudflare Pages deploy from GitHub.
- Smoke test live `/race.html`, `/api/race/health`, `/api/race/tracks`, `/api/race/rooms`, manifests, sitemap, headers, and support/payment boundaries.
- Add/confirm launch notes after the live smoke passes.

## Phase D: V2 Part 2

Goal: build real multiplayer learning without breaking the playful lab.

- Enable reviewed live room creation with Durable Object binding, rate limits, TTL, and write policy.
- Add WebSocket player/spectator join and spectator broadcast.
- Complete two-browser spectator playthrough.
- Add D1 summaries and consented self-reports.
- Add aggregate analytics only; no private raw text.
- Add human review workflow before public gallery or leaderboard output.
