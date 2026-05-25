import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("race-broadcast.html", "utf8");

assert.match(html, /<canvas id="raceCanvas"/, "broadcast prototype needs a race canvas");
assert.match(html, /signal-circuit\.mjs/, "broadcast prototype should import the reviewed race script");
assert.match(html, /data-agent="race-broadcast-page"/, "broadcast prototype needs a page-level agent selector");
assert.match(html, /data-agent-race-id=/, "broadcast prototype needs agent-readable race id");
assert.match(html, /data-agent-race-state=/, "broadcast prototype needs agent-readable race state");
assert.match(html, /data-agent-active-segment-id=/, "broadcast prototype needs agent-readable active segment state");
assert.match(html, /(data-agent-racer-id=|dataset\.agentRacerId)/, "broadcast prototype needs agent-readable racer rows");
assert.match(html, /(data-agent-racer-color|dataset\.agentRacerColor)/, "broadcast prototype needs agent-readable racer colors");
assert.match(html, /(data-agent-event-id|dataset\.agentEventId)/, "broadcast prototype needs event ids");
assert.match(html, /(data-agent-event-type|dataset\.agentEventType)/, "broadcast prototype needs event type hooks");
assert.match(html, /(data-agent-learning-tag|dataset\.agentLearningTag)/, "broadcast prototype needs learning tag hooks");
assert.match(html, /drip_raceway_watchable_snapshot_v1/, "broadcast prototype needs a local JSON snapshot schema");
assert.match(html, /data-agent="race-broadcast-json-snapshot"/, "broadcast prototype needs an agent-readable JSON snapshot node");
assert.match(html, /data-agent="race-broadcast-self-report-prompts"/, "broadcast prototype needs self-report prompts");
assert.match(html, /drip_raceway_learning_report_v1/, "broadcast prototype needs a learning report schema");
assert.match(html, /data-agent="race-broadcast-learning-report"/, "broadcast prototype needs an agent-readable learning report");
assert.match(html, /data-agent="race-broadcast-learning-report-json"/, "broadcast prototype needs copyable learning report JSON");
assert.match(html, /event_log/, "broadcast prototype learning report needs a local event log");
assert.match(html, /backend-writes|backend writes|Writes <strong>Off/i, "broadcast prototype must disclose no backend writes");
assert.doesNotMatch(html, /\b(fetch|sendBeacon|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/, "broadcast prototype must stay local display-only");
assert.doesNotMatch(html, /sk_(live|test|proj)_/i, "broadcast prototype must not contain Stripe/OpenAI-style secret keys");
assert.doesNotMatch(html, /claude|grok|openai|anthropic|gemini/i, "broadcast prototype must not imply real model benchmarking");

console.log("watchable-broadcast-page-ok");
