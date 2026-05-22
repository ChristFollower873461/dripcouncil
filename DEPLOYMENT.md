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
- Do not add a backend unless the safety model is updated first.
- Do not connect donation buttons to anything except public Stripe-hosted Payment Links.
- Keep support timing local-only until there is explicit consent copy, server-side event capture, and payment-completed webhook handling.
- Keep generated screenshots and local artifacts out of the repo and deploy output.
