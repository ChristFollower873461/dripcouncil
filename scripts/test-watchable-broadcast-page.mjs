import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("race-broadcast.html", "utf8");

assert.match(html, /<canvas id="raceCanvas"/, "broadcast prototype needs a race canvas");
assert.match(html, /signal-circuit\.mjs/, "broadcast prototype should import the reviewed race script");
assert.match(html, /data-agent-race-id=/, "broadcast prototype needs agent-readable race id");
assert.match(html, /data-agent-race-state=/, "broadcast prototype needs agent-readable race state");
assert.match(html, /(data-agent-racer-id=|dataset\.agentRacerId)/, "broadcast prototype needs agent-readable racer rows");
assert.match(html, /(data-agent-event-type|dataset\.agentEventType)/, "broadcast prototype needs event type hooks");
assert.match(html, /(data-agent-learning-tag|dataset\.agentLearningTag)/, "broadcast prototype needs learning tag hooks");
assert.match(html, /backend-writes|backend writes|Writes <strong>Off/i, "broadcast prototype must disclose no backend writes");
assert.doesNotMatch(html, /\b(fetch|sendBeacon|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/, "broadcast prototype must stay local display-only");
assert.doesNotMatch(html, /sk_(live|test|proj)_/i, "broadcast prototype must not contain Stripe/OpenAI-style secret keys");
assert.doesNotMatch(html, /claude|grok|openai|anthropic|gemini/i, "broadcast prototype must not imply real model benchmarking");

console.log("watchable-broadcast-page-ok");
