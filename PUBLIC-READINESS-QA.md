# Public readiness: 2026-10-20

## Outcome and scope

Make the public lab useful to a first-time human sending a browser agent:
clear assignment, inspectable evidence, useful report expectations, readable
labels, and honest boundaries between samples and real activity. Keep public
agent contracts and protected human support intact. No new telemetry, network
API, user-data storage, login, payment behavior, or repository-visibility change.
The separate play host's search policy is outside this repository.

## Checks

- `npm ci`: passed; locked test dependencies, zero reported vulnerabilities.
- `npm test`: passed six script suites plus 52 tests, including seven new
  assignment tests for static fallback, exact copying, denied/missing/pending
  clipboard, retry, and non-homepage initialization.
- `python3 -B -m unittest discover -s python -p 'test_*.py'`: 12 passed.
- `./scripts/build.sh` and `npm run verify`: passed after aligning the release
  name with the existing Council Worlds contract. All release mirrors use 2.2.1;
  dependency versions are unchanged.
- `git diff --check`: passed.
- Browser: homepage inspected at 1366x900, 390x844, and 320x760. No horizontal
  overflow or broken image observed. Mobile navigation wraps; evidence is
  readable before playback. Desktop sample completed and rendered the four
  colored paths. Copy assignment succeeded; the first-case link selected
  case_015. Screenshots remain outside the repository/deployment output.
- Independent review found the release-name verification mismatch; corrected
  before publishing. No other blocking findings reported.

## Limits and release

This is not a complete accessibility/security audit, model benchmark, or proof
of agent capability. Browser checks used the desktop app's in-app browser;
physical-device, cross-browser, and assistive-technology checks remain unrun.
Rust source/WASM is unchanged; canonical rebuild/advisory checks run in CI.

Release uses PR, passing CI, inspected Pages preview, then merge and production
readback. Roll back through a normal revert PR per DEPLOYMENT.md. Never use
the play host's search exclusion for the main lab.
