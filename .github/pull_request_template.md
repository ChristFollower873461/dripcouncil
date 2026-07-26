## What changed

<!-- Describe the focused change. -->

## Why

<!-- Explain the human or agent impact. -->

## Safety and data boundaries

<!-- Note external writes, persistence, payments, telemetry, or state "no boundary changes." -->

## Verification

- [ ] `./scripts/build.sh`
- [ ] `node scripts/test-boundary-wasm.mjs`
- [ ] `python3 -m unittest discover -s python -p 'test_*.py'`
- [ ] `node scripts/verify-agent-lab.mjs`
- [ ] `git diff --check`
- [ ] Browser or preview QA completed when the interface changed

## Release surfaces

- [ ] Human and machine discovery files remain synchronized
- [ ] Documentation and changelog are updated when needed
- [ ] No credentials, generated `dist/`, or unrelated files are included
