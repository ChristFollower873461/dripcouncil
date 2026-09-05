# Contributing to Drip Council

Thanks for helping make Drip Council clearer, safer, stranger, and more useful.

## Good Contributions

- Harmless cases that teach a distinct observable behavior
- Accessibility, keyboard, reduced-motion, and small-screen improvements
- Corrections to public evidence, schemas, manifests, or documentation
- Reproducible fixes with focused tests
- Local-only experiments that preserve the project's honesty and safety boundaries

Keep changes adult-respectful and welcoming to everyone. Playfulness is encouraged; fake telemetry, fake multiplayer, and claims about hidden reasoning are not.

## Before You Start

1. Read [`AGENTS.md`](AGENTS.md), [`SECURITY.md`](SECURITY.md), and [`GOVERNANCE.md`](GOVERNANCE.md).
2. Search existing issues and pull requests.
3. For a large feature or a new server-side surface, open an issue before implementation.
4. Never place credentials, payment links, private data, or production artifacts in the repository.

Security vulnerabilities belong in a [private security advisory](https://github.com/ChristFollower873461/dripcouncil/security/advisories/new), not a public issue.

## Development

The static build uses shell tools, and the preview server uses Python's standard
library. These commands do not require npm dependencies:

```sh
./scripts/build.sh
python3 -m http.server 8088 --directory dist
```

Open `http://127.0.0.1:8088/`.

JavaScript tests require Node 22.22.2+ within Node 22, Node 24.15.0+ within
Node 24, or Node 26+. CI uses Node 22. JSDOM is a pinned development dependency
for actual-page tests; it is not included in the static site or browser code.

Run the complete verification set before requesting review:

```sh
npm ci
npm audit
npm test
python3 -m unittest discover -s python -p 'test_*.py'
node --check scripts/council-worlds.mjs
node --check scripts/curriculum.mjs
node --check scripts/site-refresh.mjs
./scripts/build.sh
npm run verify
git diff --check
```

`npm test` retains the existing boundary suites and includes the Fifth Seat
page tests. They exercise the real page controls and checked-in WebAssembly
against local fixtures, including selected-case matching, overlapping file
imports and recovery from read failures. They do not contact external services.

If you change Rust boundary rules, exercise a local build with the pinned toolchain via `./scripts/build-boundary-wasm.sh` and `node scripts/test-boundary-wasm.mjs`. The pinned Ubuntu CI job uploads the canonical release artifact before checking its bytes. Include that CI-built module with the source change; builds from another host may be behaviorally equivalent without being byte-identical.

## Pull Requests

- Branch from the latest `main`.
- Keep the pull request focused and explain the user or agent impact.
- State what changed, why it changed, which safety boundaries apply, and what you tested.
- Include screenshots for meaningful visual changes.
- Update human and machine discovery surfaces together when routes or capabilities change.
- Do not edit generated `dist/` output; `./scripts/build.sh` creates it locally.
- Accept maintainer edits and review before merge.

## Case Checklist

A new case must:

- use the public case schema;
- appear exactly once in `/cases/index.json`;
- declare a safe launch object and, when relevant, an explicit recovery route;
- rely only on visible public evidence;
- include a compact sample ballot;
- avoid account creation, uploads, external writes, and payment actions; and
- add a distinct teaching point rather than reskinning an existing level.

## Community

Participation is governed by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). By contributing, you agree that review decisions will prioritize user safety, inspectability, accessibility, and a coherent public experience.

Unless stated otherwise in a specific contribution, accepted contributions are distributed under the repository's [MIT License](LICENSE).
