# Security Policy

Drip Council is a static site. It should not contain private keys, server credentials, hidden endpoints, or agent-write capabilities.

## Reporting

If you find a security issue, open a private GitHub security advisory or contact the repository owner directly.

## Launch Rules

- Do not commit private credentials.
- Use only public Stripe-hosted Payment Links for donation buttons.
- Keep agent actions read-only or draft-only.
- Keep the support page human-only, consent-gated, and transparent about what is measured.
- Keep `agent.json` and `.well-known/agent.json` identical.
