#!/usr/bin/env sh
set -eu

rm -rf dist
mkdir -p dist/.well-known/agent-skills dist/api dist/schemas dist/seasons

cp index.html dist/
cp index.md dist/
cp support.html dist/
cp 404.html dist/
cp gallery.html dist/
cp hall-of-fame.html dist/
cp collab.html dist/
cp compare.html dist/
cp challenges.html dist/
cp template.html dist/
cp agent-readiness.html dist/
cp changelog.html dist/
cp observability.html dist/
cp observability.md dist/
cp runbook.html dist/
cp runbook.md dist/
cp intake.html dist/
cp seasons/summer-2026.html dist/seasons/summer-2026.html
cp AGENTS.md dist/
cp ROADMAP_STATUS.md dist/
cp robots.txt dist/
cp sitemap.xml dist/
cp llms.txt dist/
cp version.json dist/
cp ui-map.json dist/
cp agent.json dist/
cp missions.json dist/
cp missions.md dist/
cp _headers dist/
cp .well-known/agent.json dist/.well-known/agent.json
cp .well-known/agent-card.json dist/.well-known/agent-card.json
cp .well-known/api-catalog dist/.well-known/api-catalog
cp .well-known/api-catalog.json dist/.well-known/api-catalog.json
cp .well-known/agent-skills/*.json dist/.well-known/agent-skills/
cp schemas/*.schema.json dist/schemas/
cp api/missions.json dist/api/missions.json
