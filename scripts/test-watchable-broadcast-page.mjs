import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const primary = readFileSync("race.html", "utf8");
const alias = readFileSync("race-broadcast.html", "utf8");
const lab = readFileSync("race-lab.html", "utf8");

for (const [label, html] of [
  ["race.html", primary],
  ["race-broadcast.html", alias]
]) {
  assert.match(html, /<canvas id="raceCanvas"/, `${label} needs a race canvas`);
  assert.match(html, /signal-circuit\.mjs/, `${label} should import the reviewed race script`);
  assert.match(html, /data-agent="race-broadcast-page"/, `${label} needs a page-level agent selector`);
  assert.match(html, /data-agent-race-id=/, `${label} needs agent-readable race id`);
  assert.match(html, /data-agent-race-state=/, `${label} needs agent-readable race state`);
  assert.match(html, /data-agent-active-segment-id=/, `${label} needs agent-readable active segment state`);
  assert.match(html, /(data-agent-racer-id=|dataset\.agentRacerId)/, `${label} needs agent-readable racer rows`);
  assert.match(html, /(data-agent-racer-color|dataset\.agentRacerColor)/, `${label} needs agent-readable racer colors`);
  assert.match(html, /(data-agent-event-id|dataset\.agentEventId)/, `${label} needs event ids`);
  assert.match(html, /(data-agent-event-type|dataset\.agentEventType)/, `${label} needs event type hooks`);
  assert.match(html, /(data-agent-learning-tag|dataset\.agentLearningTag)/, `${label} needs learning tag hooks`);
  assert.match(html, /drip_raceway_watchable_snapshot_v1/, `${label} needs a local JSON snapshot schema`);
  assert.match(html, /data-agent="race-broadcast-json-snapshot"/, `${label} needs an agent-readable JSON snapshot node`);
  assert.match(html, /data-agent="race-broadcast-self-report-prompts"/, `${label} needs self-report prompts`);
  assert.match(html, /drip_raceway_learning_report_v1/, `${label} needs a learning report schema`);
  assert.match(html, /data-agent="race-broadcast-learning-report"/, `${label} needs an agent-readable learning report`);
  assert.match(html, /data-agent="race-broadcast-learning-report-json"/, `${label} needs copyable learning report JSON`);
  assert.match(html, /event_log/, `${label} learning report needs a local event log`);
  assert.match(html, /backend-writes|backend writes|Writes <strong>Off/i, `${label} must disclose no backend writes`);
  assert.doesNotMatch(html, /\b(fetch|sendBeacon|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/, `${label} must stay local display-only`);
  assert.doesNotMatch(html, /sk_(live|test|proj)_/i, `${label} must not contain Stripe/OpenAI-style secret keys`);
  assert.doesNotMatch(html, /claude|grok|openai|anthropic|gemini/i, `${label} must not imply real model benchmarking`);
}

assert.match(primary, /https:\/\/dripcouncil\.org\/race\.html/, "primary race page needs race.html canonical URL");
assert.match(lab, /https:\/\/dripcouncil\.org\/race-lab\.html/, "manual lab needs race-lab canonical URL");
assert.match(lab, /data-agent="race-page"/, "manual lab should preserve old local controls surface");
assert.match(lab, /drip_raceway_local_report_v1/, "manual lab should preserve local report schema");

console.log("watchable-broadcast-page-ok");
