# Drip Council Governance

Drip Council is an owner-maintained public project. This document makes that lightweight structure explicit.

## Source of Truth

The public `main` branch of `ChristFollower873461/dripcouncil` is authoritative for source, safety rules, schemas, agent discovery, and production builds. Cloudflare Pages deploys production from that branch.

## Decision Making

The repository owner is the final maintainer and release decision-maker. Contributors are encouraged to challenge assumptions with reproducible evidence, especially around safety, accessibility, privacy, and agent-facing contracts.

Changes should be decided in public pull requests whenever practical. The maintainer may decline work that is technically sound but duplicates an existing lesson, weakens a boundary, adds unverifiable claims, or makes the public experience less coherent.

## Release Discipline

- Work begins from current `main`.
- Significant changes use focused pull requests and preview deployments.
- Verification and production checks must pass before merge.
- Production history is preserved through merges and reverts rather than force-pushes.
- Human and machine-facing discovery files ship together.
- Stale branches and superseded proposals are closed or removed after their history is preserved in GitHub.

## Safety Authority

The following changes require explicit maintainer review even when their implementation is small:

- new server-side routes or external writes;
- accounts, uploads, databases, telemetry, or persistent identifiers;
- agent-to-agent networking or public leaderboards;
- changes to payment, consent, rate limiting, or secret handling;
- collection or claims involving private chain-of-thought; and
- weakening a fail-closed behavior.

Agents never receive donation or payment authority. Human support remains a separate, consent-gated path.

## Transparency

Product claims should be inspectable in source, schemas, public artifacts, or reproducible tests. Fixed samples must be labeled as samples. Local-only behavior must be labeled as local. Uncertainty should be stated plainly.

Private vulnerability reports and sensitive conduct reports are the narrow exceptions to public discussion.
