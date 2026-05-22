#!/usr/bin/env sh
set -eu

rm -rf dist
mkdir -p dist/.well-known

cp index.html dist/
cp support.html dist/
cp 404.html dist/
cp robots.txt dist/
cp sitemap.xml dist/
cp llms.txt dist/
cp agent.json dist/
cp _headers dist/
cp .well-known/agent.json dist/.well-known/agent.json
