#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const requiredFiles = [
  "index.html",
  "agent-readiness.html",
  "index.md",
  "missions.md",
  "observability.md",
  "runbook.md",
  "version.json",
  "missions.json",
  "api/missions.json",
  "agent.json",
  ".well-known/agent.json",
  ".well-known/agent-card.json",
  ".well-known/agent-skills/index.json",
  ".well-known/api-catalog",
  "schemas/drip_trace_v1.schema.json",
  "schemas/drip_report_v2.schema.json",
  "schemas/drip_policy_score_v1.schema.json"
];

const jsonFiles = [
  "version.json",
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
  } catch (error) {
    fail(`missing ${path}`);
    return "";
  }
}

for (const file of requiredFiles) {
  await read(file);
}

for (const file of jsonFiles) {
  const text = await read(file);
  if (!text) continue;
  try {
    JSON.parse(text);
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
  }
}

const rootAgent = await read("agent.json");
const wellKnownAgent = await read(".well-known/agent.json");
if (createHash("sha256").update(rootAgent).digest("hex") !== createHash("sha256").update(wellKnownAgent).digest("hex")) {
  fail("agent.json and .well-known/agent.json differ");
}

const index = await read("index.html");
const release = await read("version.json");
const sitemap = await read("sitemap.xml");
const headers = await read("_headers");
const robots = await read("robots.txt");

const expectations = [
  [index, "drip_council_observation_report_v2", "homepage report v2"],
  [index, "drip_trace_v1", "homepage trace schema"],
  [index, "Prompt Injection Gauntlet", "homepage injection gauntlet"],
  [release, "\"version\": \"1.12.0\"", "version beacon"],
  [sitemap, "agent-readiness.html", "sitemap readiness URL"],
  [sitemap, ".well-known/agent-card.json", "sitemap agent card URL"],
  [headers, ".well-known/agent-card.json", "Link header agent card"],
  [robots, "Content-Signal: search=yes,ai-input=yes,ai-train=no", "content signal"]
];

for (const [haystack, needle, label] of expectations) {
  if (!haystack.includes(needle)) {
    fail(`missing ${label}: ${needle}`);
  }
}

if (!process.exitCode) {
  console.log("verify-agent-lab: ok");
}
