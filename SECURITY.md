# Security Policy

Drip Council is a mostly static site with one protected support checkout endpoint. It should not contain private keys, server credentials, hidden endpoints beyond documented Cloudflare Pages Functions, or agent-write capabilities.

## Supported Version

Security fixes target the current production release on `main`. Historical branches and preview deployments are not supported.

## Reporting

Do not open a public issue for a suspected vulnerability.

Use [GitHub private vulnerability reporting](https://github.com/ChristFollower873461/dripcouncil/security/advisories/new) with:

- the affected route, file, or commit;
- a concise reproduction;
- the practical impact;
- whether any credential, payment, or personal information may be involved; and
- a safe remediation suggestion, if you have one.

The maintainer will acknowledge a complete report, validate it, and coordinate remediation before public disclosure. Please avoid accessing data that is not yours, disrupting production, or testing real payment details.

## Security Boundaries

- Public pages, cases, manifests, schemas, Rust source, WebAssembly, and Python artifacts are intentionally inspectable.
- Browser demonstrations are local-only unless a page explicitly says otherwise.
- `/api/support/checkout` is the only approved server-side mutation surface.
- Production secrets belong in Cloudflare environment configuration, never Git history or browser code.
- Public evidence and concise rationales are supported; private chain-of-thought is not requested or stored.

## Launch Rules

- Do not commit private credentials.
- Do not expose public Stripe Payment Links in static HTML or JavaScript.
- Create support payments only through `/api/support/checkout` after server-side Turnstile validation and request throttling.
- Accept only integer `amountCents` values from 500 through 1,000,000 ($5 through $10,000 USD), regardless of browser-side validation.
- Create a fresh Stripe Checkout Session for each accepted request and return only an HTTPS `checkout.stripe.com` URL.
- Keep the checkout endpoint fail-closed when secrets or safety config are missing.
- Keep agent actions read-only or draft-only.
- Keep the support page human-only, consent-gated, and transparent about what is measured.
- Keep `agent.json` and `.well-known/agent.json` identical.
- Keep GitHub secret scanning and push protection enabled.
- Treat engine, schema, and checkout failures as fail-closed conditions.
