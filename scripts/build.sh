#!/usr/bin/env sh
set -eu

rm -rf dist
mkdir -p dist/.well-known/agent-skills dist/api dist/assets/hashed dist/cases dist/fixtures dist/keys dist/python dist/rust/boundary-validator/src dist/schemas dist/scripts dist/styles dist/wasm

cp index.html dist/
cp index.md dist/
cp curriculum.html dist/
cp CURRICULUM.md dist/
cp support.html dist/
cp observatory.html dist/
cp fifth-seat.html dist/
cp 404.html dist/
cp collab.html dist/
cp compare.html dist/
cp changelog.html dist/
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
cp site.webmanifest dist/
cp _headers dist/
cp _redirects dist/
cp .well-known/agent.json dist/.well-known/agent.json
cp .well-known/agent-card.json dist/.well-known/agent-card.json
cp .well-known/api-catalog dist/.well-known/api-catalog
cp .well-known/api-catalog.json dist/.well-known/api-catalog.json
cp .well-known/agent-skills/*.json dist/.well-known/agent-skills/
cp schemas/*.schema.json dist/schemas/
cp api/*.json dist/api/
cp assets/*.png dist/assets/
cp assets/hashed/* dist/assets/hashed/
cp cases/*.json dist/cases/
cp fixtures/*.html dist/fixtures/
cp keys/*.html dist/keys/
cp python/*.py dist/python/
cp python/*.json dist/python/
cp wasm/boundary_validator.wasm dist/wasm/
cp rust/boundary-validator/Cargo.toml dist/rust/boundary-validator/
cp rust/boundary-validator/Cargo.lock dist/rust/boundary-validator/
cp rust/boundary-validator/src/lib.rs dist/rust/boundary-validator/src/
cp rust-toolchain.toml dist/
cp scripts/*.mjs dist/scripts/
cp styles/*.css dist/styles/
