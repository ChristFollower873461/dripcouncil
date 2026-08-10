# Deployment Standard

GitHub is the source of truth for Drip Council. The production site is live at [dripcouncil.org](https://dripcouncil.org/).

## Production Path

1. Create a focused branch from `main`.
2. Run the repository verification commands.
3. Open a pull request and inspect its Cloudflare Pages preview.
4. Merge only after the required checks pass.
5. Cloudflare Pages deploys the merged `main` commit to production.
6. Verify the live routes and release metadata.

Preview deployments come from non-production branches. Direct uploads are not the normal deployment path.

## Production Configuration

- Repository: `ChristFollower873461/dripcouncil`
- Build command: `./scripts/build.sh`
- Build output directory: `dist`
- Production branch: `main`
- Project name: `dripcouncil`
- Custom domain: `dripcouncil.org`

The protected support endpoint additionally requires the environment variables and Durable Object binding documented in [`README.md`](README.md) and must remain fail-closed when any required safety configuration is missing.

Deploy `workers/checkout-rate-limiter` as the route-less `dripcouncil-checkout-limiter` Worker before enabling support. Bind its `CheckoutRateLimiter` Durable Object namespace to the Pages project as `DRIP_SUPPORT_RATE_LIMITER` in both production and any preview environment that intentionally exercises checkout. Store a random `DRIP_SUPPORT_RATE_LIMIT_SALT` of at least 32 characters as a secret. The endpoint must report `enabled: false` until both are present.

## Release Verification

Run locally:

```sh
./scripts/build.sh
node scripts/test-bounded-json.mjs
node scripts/test-public-contracts.mjs
node scripts/test-report-import.mjs
node scripts/test-checkout-rate-limiter.mjs
node scripts/test-support-checkout.mjs
node scripts/test-boundary-wasm.mjs
python3 -m unittest discover -s python -p 'test_*.py'
node --check scripts/council-worlds.mjs
node --check scripts/curriculum.mjs
node --check scripts/site-refresh.mjs
node scripts/verify-agent-lab.mjs
git diff --check
```

After deployment, verify at minimum:

- `/`
- `/curriculum.html`
- `/support.html`
- `/llms.txt`
- `/agent.json`
- `/.well-known/agent-card.json`
- `/cases/index.json`
- `/version.json`
- `/assets/og-council-worlds.png`

Confirm the live `version.json` matches the merged release and that the Cloudflare Pages, JavaScript, Rust, and Python checks completed successfully.

## Rollback

If production verification fails, revert the faulty merge through a new pull request. Preserve the failed commit and check history for review; do not rewrite `main`. Cloudflare Pages should then deploy the revert commit through the same production path.

## Invariants

- Do not use direct uploads as the normal deploy path.
- The only approved backend surface is `functions/api/support/checkout.js` for protected support checkout.
- Do not expose public Stripe Payment Links in static HTML or JavaScript.
- Keep support checkout fail-closed unless production has `DRIP_SUPPORT_ENABLED=true`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `STRIPE_SECRET_KEY` or `STRIPE_API_KEY`, `DRIP_SUPPORT_RATE_LIMIT_SALT`, and the `DRIP_SUPPORT_RATE_LIMITER` Durable Object binding.
- Keep the server-side amount contract at integer `amountCents` from 500 through 1,000,000 ($5 through $10,000 USD). Browser validation is convenience, not authority.
- Keep exact-origin validation, bounded JSON parsing, durable per-client throttling, and Turnstile verification in front of fresh Stripe Checkout Session creation; never substitute a reusable public checkout URL.
- Keep success and cancellation destinations on the exact canonical `https://dripcouncil.org/support.html` route and fail closed on configuration drift.
- Keep support timing local-only until payment-completed webhook handling is added.
- Keep generated screenshots and local artifacts out of the repo and deploy output.
