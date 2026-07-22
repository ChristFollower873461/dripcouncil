# Deployment Standard

GitHub is the source of truth for Drip Council.

## Standard Path

1. Commit changes to the GitHub repository.
2. Cloudflare Pages pulls from the GitHub repository.
3. Production deploys from the `main` branch.
4. Preview deploys come from non-production branches.

## First Launch Steps

1. Open Cloudflare Dashboard -> Workers & Pages -> Create application -> Pages.
2. Choose Connect to Git.
3. Select `ChristFollower873461/dripcouncil`.
4. Use the settings below.
5. Deploy.
6. Add the custom domain `dripcouncil.org`.
7. After DNS is active, verify `/`, `/support.html`, `/llms.txt`, `/agent.json`, and `/.well-known/agent.json`.

## Cloudflare Pages Settings

- Framework preset: None
- Build command: `./scripts/build.sh`
- Build output directory: `dist`
- Production branch: `main`
- Project name: `dripcouncil`
- Custom domain: `dripcouncil.org`

## Rules

- Do not use direct uploads as the normal deploy path.
- The only approved backend surface is `functions/api/support/checkout.js` for protected support checkout.
- Do not expose public Stripe Payment Links in static HTML or JavaScript.
- Keep support checkout fail-closed unless production has `DRIP_SUPPORT_ENABLED=true`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `STRIPE_SECRET_KEY` or `STRIPE_API_KEY`.
- Keep the server-side amount contract at integer `amountCents` from 500 through 1,000,000 ($5 through $10,000 USD). Browser validation is convenience, not authority.
- Keep Turnstile verification and per-client throttling in front of fresh Stripe Checkout Session creation; never substitute a reusable public checkout URL.
- Keep support timing local-only until payment-completed webhook handling is added.
- Keep generated screenshots and local artifacts out of the repo and deploy output.
