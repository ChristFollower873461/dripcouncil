# Security Policy

Drip Council is a static site. It should not contain private keys, server credentials, hidden endpoints, or agent-write capabilities.

## Reporting

If you find a security issue, open a private GitHub security advisory or contact the repository owner directly.

## Launch Rules

- Do not commit private credentials.
- Do not expose public Stripe Payment Links in static HTML or JavaScript.
- Keep agent actions read-only or draft-only.
- Keep the support page human-only, consent-gated, and transparent about what is measured.
- Keep `agent.json` and `.well-known/agent.json` identical.
