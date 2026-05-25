# Drip Raceway Next Phases

This is the short operating plan after the first V2 draft PR.

## Current Anchor

- Branch: `codex/drip-raceway-v2`
- Draft PR: https://github.com/ChristFollower873461/dripcouncil/pull/4
- Rule: do not merge, deploy, add secrets, add live backend bindings, or touch Basement Boys without explicit approval.
- Stop-ship rule: PR #4 is blocked from launch until the current race experience is replaced by the spectator-first plan in `DRIP_RACEWAY_V2_WATCHABLE_PLAN.md`.
- Watchable race spec: `DRIP_RACEWAY_V2_WATCHABLE_SPEC.md`.
- Current product verdict: the existing race page is useful only as plumbing/reference work; it is not V2 awesome and ready.

## Phase A: Preview Watch

Goal: make PR #4 reviewable in a real preview environment.

- Check PR #4 status checks, deployment records, and comments for a Cloudflare preview URL.
- If no preview URL exists, do not spam changes; wait or diagnose GitHub/Cloudflare integration.
- If a preview URL appears, verify `/race.html`, `/race-manifest.json`, manifest files, race API preview routes, support/payment boundaries, security headers, mobile layout, and nonblank race canvas.
- Notify only when a preview URL appears, a check fails, or a human decision is needed.

### Preview Diagnosis: 2026-05-24 19:05 EDT

- Cloudflare project `dripcouncil` is GitHub-connected to `ChristFollower873461/dripcouncil`.
- Cloudflare project config reports preview deployments enabled for all non-production branches.
- Cloudflare docs say same-repo pull requests should create preview URLs and status checks.
- GitHub PR #4 is open/draft/clean from `codex/drip-raceway-v2` into `main`.
- GitHub PR #4 has no Cloudflare comments, status checks, or usable deployment status.
- Cloudflare Pages deployment list shows only three old `main` production deployments, all triggered as `ad_hoc`.
- Cloudflare has no deployment for PR #4's latest commit.
- Live `/race.html` and guessed preview aliases are 404, so V2 has not accidentally gone live.

Recommended next decision:

1. Prefer a dashboard/GitHub-integration fix: refresh the Cloudflare Pages GitHub connection or re-save the Pages build/deploy settings, then let GitHub trigger the preview normally.
2. If the human approves, convert PR #4 out of draft to test whether Cloudflare only creates previews for ready PRs in this project.
3. Avoid direct Pages upload or retrying old production deployments as the normal path.

Detailed repair runbook: `DRIP_RACEWAY_PREVIEW_REPAIR_PLAN.md`.

## Phase B: Review Gate

Goal: decide whether the static/local V2 preview should merge.

- Blocked: do not move PR #4 out of draft while the current race UX remains the launch candidate.
- Keep PR #4 draft until the human says it is ready.
- Summarize any preview findings and required fixes.
- Convert out of draft or merge only after explicit approval.
- Replace the current `/race` experience with the watchable race plan before considering launch approval.

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
