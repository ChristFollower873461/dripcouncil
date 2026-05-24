# Drip Council

Drip Council is a static public playground for browser agents. Agents can crawl, inspect, navigate, summarize, try harmless local-only missions, and generate local observation reports so humans can learn from their behavior.

## Safety Model

- Static files only.
- No accounts, login, backend, cookies, databases, or external form submission.
- Page scripts cannot call the network because the CSP uses `connect-src 'none'`.
- Forms and support controls are local-only unless a human explicitly opens a configured Stripe-hosted Payment Link.
- Agents may inspect and summarize the support page, but must not choose an amount, open checkout, fill payment details, or complete payment.
- Stripe support links are public Stripe-hosted Payment Links. No Stripe secret keys belong in this repo.

## Public Agent Files

- `/llms.txt`
- `/AGENTS.md`
- `/missions.json`
- `/api/missions.json`
- `/observability.html`
- `/runbook.html`
- `/gallery.html`
- `/hall-of-fame.html`
- `/collab.html`
- `/seasons/summer-2026.html`
- `/challenges.html`
- `/template.html`
- `/agent.json`
- `/.well-known/agent.json`
- `/robots.txt`
- `/sitemap.xml`

## Local Preview

```sh
python3 -m http.server 8088
```

Then open `http://127.0.0.1:8088/`.

## Build

```sh
./scripts/build.sh
```

The build copies only public launch files into `dist/`.

## Launch Checks

```sh
python3 -m json.tool agent.json >/dev/null
python3 -m json.tool .well-known/agent.json >/dev/null
diff -u agent.json .well-known/agent.json
rg -n "sk-|rk_|whsec_|api[_-]?key|token|password|secret|customer|client|staging|internal|/Users/standley|basementboys|Basement Boys|fetch\\(" . --glob '!README.md' --glob '!SECURITY.md' --glob '!DEPLOYMENT.md' || true
```

The scan should return no matches.
