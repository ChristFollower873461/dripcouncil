# Security Policy

Drip Council is a mostly static site with one protected support checkout endpoint. It should not contain private keys, server credentials, hidden endpoints beyond documented Cloudflare Pages Functions, or agent-write capabilities.

## Reporting

If you find a security issue, open a private GitHub security advisory or contact the repository owner directly.

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
