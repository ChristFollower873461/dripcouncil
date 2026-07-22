#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const requiredFiles = [
  "index.html",
  "observatory.html",
  "fifth-seat.html",
  "support.html",
  "styles/council-worlds.css",
  "scripts/council-worlds.mjs",
  "site.webmanifest",
  "assets/drip-mark.png",
  "assets/council-chamber.png",
  "assets/fifth-seat-studio.png",
  "assets/og-council-worlds.png",
  "api/council-sessions.json",
  ".well-known/agent-skills/inspect-council-case.json",
  ".well-known/agent-skills/render-public-trace.json",
  ".well-known/agent-skills/validate-local-ballot.json",
  "schemas/drip_ballot_v1.schema.json",
  "version.json",
  "ui-map.json",
  "agent.json",
  ".well-known/agent.json",
  ".well-known/agent-card.json",
  ".well-known/agent-skills/index.json",
  "schemas/drip_trace_v1.schema.json",
  "schemas/drip_report_v2.schema.json",
  "schemas/drip_policy_score_v1.schema.json"
];

const jsonFiles = [
  "site.webmanifest",
  "api/council-sessions.json",
  ".well-known/agent-skills/inspect-council-case.json",
  ".well-known/agent-skills/render-public-trace.json",
  ".well-known/agent-skills/validate-local-ballot.json",
  "schemas/drip_ballot_v1.schema.json",
  "version.json",
  "ui-map.json",
  "missions.json",
  "api/missions.json",
  "agent.json",
  ".well-known/agent.json",
  ".well-known/agent-card.json",
  ".well-known/agent-skills/index.json",
  ".well-known/agent-skills/run-static-mission.json",
  ".well-known/agent-skills/trace-local-behavior.json",
  ".well-known/agent-skills/score-policy-compliance.json",
  ".well-known/agent-skills/handle-prompt-injection-gauntlet.json",
  ".well-known/agent-skills/simulate-a2a-handoff.json",
  ".well-known/agent-skills/explain-commerce-boundary.json",
  ".well-known/agent-skills/compare-local-runs.json",
  ".well-known/api-catalog",
  ".well-known/api-catalog.json",
  "schemas/drip_trace_v1.schema.json",
  "schemas/drip_report_v2.schema.json",
  "schemas/drip_policy_score_v1.schema.json"
];

function fail(message) {
  console.error(`verify-agent-lab: ${message}`);
  process.exitCode = 1;
}

async function read(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    fail(`missing ${path}`);
    return "";
  }
}

async function readBinary(path) {
  try {
    return await readFile(path);
  } catch {
    fail(`missing ${path}`);
    return Buffer.alloc(0);
  }
}

for (const file of requiredFiles) {
  await readBinary(file);
}

for (const file of jsonFiles) {
  const source = await read(file);
  if (!source) continue;
  try {
    JSON.parse(source);
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
  }
}

const rootAgent = await read("agent.json");
const wellKnownAgent = await read(".well-known/agent.json");
if (createHash("sha256").update(rootAgent).digest("hex") !== createHash("sha256").update(wellKnownAgent).digest("hex")) {
  fail("agent.json and .well-known/agent.json differ");
}

const sources = {
  index: await read("index.html"),
  observatory: await read("observatory.html"),
  fifthSeat: await read("fifth-seat.html"),
  support: await read("support.html"),
  script: await read("scripts/council-worlds.mjs"),
  api: await read("api/council-sessions.json"),
  ballot: await read("schemas/drip_ballot_v1.schema.json"),
  release: await read("version.json"),
  sitemap: await read("sitemap.xml"),
  headers: await read("_headers"),
  robots: await read("robots.txt"),
  build: await read("scripts/build.sh"),
  llms: await read("llms.txt"),
  agents: await read("AGENTS.md")
};

const expectations = [
  [sources.index, "Send an agent in.", "homepage proposition"],
  [sources.index, "data-agent=\"live-case\"", "live case selector"],
  [sources.index, "data-agent=\"visible-evidence-feed\"", "visible evidence selector"],
  [sources.index, "data-agent=\"world-switcher\"", "world switcher selector"],
  [sources.index, "summary_large_image", "X large image card"],
  [sources.index, "/assets/og-council-worlds.png", "homepage social image"],
  [sources.observatory, "id=\"trace-canvas\"", "Observatory trace canvas"],
  [sources.observatory, "id=\"start-local-run\"", "Observatory local run control"],
  [sources.observatory, "It is not live agent telemetry", "Observatory sample-replay disclosure"],
  [sources.observatory, "id=\"download-json\"", "Observatory JSON export"],
  [sources.fifthSeat, "id=\"ballot-input\"", "Fifth Seat ballot input"],
  [sources.fifthSeat, "id=\"validate-ballot\"", "Fifth Seat validator"],
  [sources.fifthSeat, "drip_ballot_v1", "Fifth Seat ballot contract"],
  [sources.script, "validateBallot", "local ballot validation"],
  [sources.script, "initObservatoryWorld", "Observatory interaction"],
  [sources.support, "data-support-consent", "human support consent"],
  [sources.support, "/api/support/checkout", "server checkout endpoint"],
  [sources.api, "\"case_id\": \"case_014\"", "current Council case"],
  [sources.api, "private chain of thought", "public evidence boundary"],
  [sources.ballot, "\"const\": \"drip_ballot_v1\"", "ballot schema id"],
  [sources.release, "\"version\": \"2.0.0\"", "version beacon"],
  [sources.release, "Council Worlds", "release name"],
  [sources.sitemap, "observatory.html", "Observatory sitemap URL"],
  [sources.sitemap, "fifth-seat.html", "Fifth Seat sitemap URL"],
  [sources.sitemap, "api/council-sessions.json", "Council session sitemap URL"],
  [sources.headers, "council-sessions.json", "Council session discovery header"],
  [sources.robots, "Content-Signal: search=yes,ai-input=yes,ai-train=no", "content signal"],
  [sources.build, "cp assets/*.png dist/assets/", "asset build copy"],
  [sources.build, "cp observatory.html dist/", "Observatory build copy"],
  [sources.llms, "OBSERVATORY.py", "agent brief Council Worlds orientation"],
  [sources.agents, "BOUNDARY.rs", "AGENTS Council Worlds orientation"]
];

for (const [haystack, needle, label] of expectations) {
  if (!haystack.includes(needle)) fail(`missing ${label}: ${needle}`);
}

function assertPngDimensions(path, expectedWidth, expectedHeight) {
  return readBinary(path).then((buffer) => {
    const pngSignature = "89504e470d0a1a0a";
    if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
      fail(`${path} is not a valid PNG`);
      return;
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width !== expectedWidth || height !== expectedHeight) {
      fail(`${path} is ${width}x${height}; expected ${expectedWidth}x${expectedHeight}`);
    }
  });
}

await assertPngDimensions("assets/og-council-worlds.png", 1200, 630);
await assertPngDimensions("assets/drip-mark.png", 512, 512);

const { ballotSample, traceSample, validateBallot } = await import("./council-worlds.mjs");
const traceAllowedKeys = new Set([
  "schema",
  "mode",
  "privacy",
  "started_at",
  "active",
  "event_count",
  "max_scroll_depth_percent",
  "viewport",
  "user_agent_hint",
  "events"
]);
const traceEventAllowedKeys = new Set(["type", "at", "elapsed_ms", "path", "hash", "details"]);

if (traceSample.schema !== "drip_trace_v1") fail("trace sample schema must be drip_trace_v1");
if (traceSample.mode !== "local_memory_only") fail("trace sample mode must be local_memory_only");
if (traceSample.privacy !== "field_values_redacted_no_network") fail("trace sample privacy contract differs from schema");
if (traceSample.event_count !== traceSample.events.length) fail("trace sample event_count differs from events length");
if (Object.keys(traceSample).some((key) => !traceAllowedKeys.has(key))) fail("trace sample contains a field outside drip_trace_v1");
for (const event of traceSample.events) {
  if (Object.keys(event).some((key) => !traceEventAllowedKeys.has(key))) fail("trace sample event contains a field outside drip_trace_v1");
  if (!event.type || !Number.isInteger(event.elapsed_ms) || !event.path || !event.details || Number.isNaN(Date.parse(event.at))) {
    fail("trace sample event does not satisfy the drip_trace_v1 required shape");
  }
}

if (validateBallot(ballotSample).length) fail("sample ballot does not satisfy the local validator");
const invalidBallots = [
  { ...ballotSample, world: "secret_world" },
  { ...ballotSample, evidence: ["duplicate", "duplicate"] },
  { ...ballotSample, evidence: ["x".repeat(241)] },
  { ...ballotSample, uncertainty: "x".repeat(361) },
  { ...ballotSample, stopped_at_boundary: "yes" },
  { ...ballotSample, elapsed_ms: 3600001 }
];
if (invalidBallots.some((ballot) => validateBallot(ballot).length === 0)) {
  fail("local ballot validator accepts an object rejected by drip_ballot_v1");
}

if (!process.exitCode) console.log("verify-agent-lab: ok");
