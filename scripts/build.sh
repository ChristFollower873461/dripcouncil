#!/usr/bin/env sh
set -eu

rm -rf dist
mkdir -p dist/.well-known dist/api

cp index.html dist/
cp support.html dist/
cp 404.html dist/
cp gallery.html dist/
cp hall-of-fame.html dist/
cp AGENTS.md dist/
cp robots.txt dist/
cp sitemap.xml dist/
cp llms.txt dist/
cp agent.json dist/
cp missions.json dist/
cp _headers dist/
cp .well-known/agent.json dist/.well-known/agent.json
cp api/missions.json dist/api/missions.json
