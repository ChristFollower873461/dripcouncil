# Drip Raceway Preview Repair Plan

This plan fixes the missing Cloudflare Pages preview the right way: restore the GitHub-connected Pages preview workflow, then verify the preview before any merge.

## Objective

Get a Cloudflare Pages preview URL for PR #4 without direct upload, production retry, secret changes, backend bindings, or merge.

## Guardrails

- Do not merge PR #4 without explicit approval.
- Do not use `wrangler pages deploy` or direct upload as the normal path.
- Do not retry old production deployments.
- Do not add secrets, D1, Durable Object bindings, Analytics Engine bindings, or write-capable routes.
- Do not touch `/Users/standley/projects/basementboys-landing`.
- Keep `main` and the live `dripcouncil.org` site stable until the human approves launch.

## Known State

- Cloudflare Pages project: `dripcouncil`.
- GitHub repo: `ChristFollower873461/dripcouncil`.
- PR: https://github.com/ChristFollower873461/dripcouncil/pull/4.
- Branch: `codex/drip-raceway-v2`.
- Cloudflare project config reports:
  - GitHub source connected.
  - Production branch `main`.
  - Preview deployments enabled for all non-production branches.
  - Build command `./scripts/build.sh`.
  - Output directory `dist`.
- Cloudflare deployment list currently shows only old `main` production deployments triggered as `ad_hoc`.
- No Cloudflare deployment currently exists for PR #4's latest commit.
- Live `/race.html` is 404, so V2 is not accidentally live.

## Repair Log

- 2026-05-24 19:45 EDT: Re-saved the Cloudflare Pages project through the project API with the existing GitHub repo, production branch, preview deployment setting, build command, and output directory. Cloudflare accepted the settings and preserved the expected values. No direct deploy, production retry, secret, backend binding, or live-site change was made.
- 2026-05-24 19:45 EDT: Re-check after the settings save still showed no PR comment, no status check, and no Cloudflare deployment for the PR branch. Next step is the planned harmless branch-only documentation commit to trigger the GitHub-connected preview workflow.
- 2026-05-24 19:59 EDT: With human approval, marked PR #4 ready for review without merging. Immediate re-check still showed no PR comment, no status check, and no Cloudflare deployment for the PR branch. Next step is a harmless documentation-only push while the PR is ready, to trigger a fresh branch sync event.

## Phase 1: Baseline Audit

Run these checks before changing anything:

```sh
git status --short --branch
gh pr view 4 --json url,isDraft,state,headRefName,baseRefName,headRefOid,mergeStateStatus,statusCheckRollup,comments
wrangler pages project list
curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" "https://api.cloudflare.com/client/v4/accounts/10c5a04d39502818093715beede0cb07/pages/projects/dripcouncil" | python3 -m json.tool
curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" "https://api.cloudflare.com/client/v4/accounts/10c5a04d39502818093715beede0cb07/pages/projects/dripcouncil/deployments" | python3 -m json.tool
```

Stop and notify if:

- PR #4 is closed or merged.
- A preview deployment already exists.
- The Cloudflare project points at a different repo.
- The build command/output directory differ from `DEPLOYMENT.md`.

## Phase 2: Dashboard Integration Repair

Do this in the Cloudflare dashboard, not by direct deploy:

1. Open Cloudflare Dashboard.
2. Go to Workers & Pages.
3. Open Pages project `dripcouncil`.
4. Go to Settings -> Builds & deployments.
5. Confirm repository is `ChristFollower873461/dripcouncil`.
6. Confirm production branch is `main`.
7. Confirm preview deployments are enabled for all non-production branches or include `codex/drip-raceway-v2`.
8. Re-save the build/deploy settings.
9. If prompted, refresh or reconnect the GitHub app/repository permission.

Expected outcome:

- A new Cloudflare preview deployment is created for `codex/drip-raceway-v2`, or GitHub gets a Cloudflare Pages status check/comment.

Stop and notify if:

- The dashboard asks to change production settings that could deploy `main`.
- The GitHub app is not installed or lacks repo permission.
- The project is no longer GitHub-connected.
- A reconnect would affect other Pages projects.

## Phase 3: Non-Production Trigger

Only after Phase 2 is complete:

1. Re-check PR #4 status.
2. If no preview starts, push a harmless branch-only documentation commit to `codex/drip-raceway-v2`.
3. Do not merge.
4. Do not direct deploy.

Acceptable harmless trigger examples:

- Update this repair plan with the latest audit timestamp.
- Add a PR note to the next-phases plan.

If still no preview appears, ask the human whether to convert PR #4 out of draft to test whether this project only builds ready PRs.

## Phase 4: Preview Verification

When a preview URL appears, verify:

```sh
curl -I https://PREVIEW_URL/race.html
curl -I https://PREVIEW_URL/race-manifest.json
curl -I https://PREVIEW_URL/agent.json
curl -I https://PREVIEW_URL/.well-known/agent.json
curl -I https://PREVIEW_URL/api/race/health
curl -I https://PREVIEW_URL/api/race/tracks
curl -I https://PREVIEW_URL/api/race/rooms
```

Also verify in browser:

- `/race.html` renders.
- Canvas is nonblank.
- Mobile layout has no horizontal overflow.
- Support/payment page still requires human consent and Stripe-hosted links only.
- Race API preview routes are read-only or disabled-write as designed.
- Security headers are present.
- Preview response includes `x-robots-tag: noindex` if Cloudflare adds the default preview header.

Stop and notify if:

- Any preview route returns unexpected 5xx.
- The preview publishes payment or backend behavior outside the plan.
- Race API write/binding behavior is unexpectedly enabled.
- Security headers are missing.

## Phase 5: Review Decision

After preview verification:

- Summarize findings on PR #4.
- Keep the PR draft until the human explicitly says it is ready.
- Convert out of draft only with explicit approval.
- Merge only with explicit approval.
