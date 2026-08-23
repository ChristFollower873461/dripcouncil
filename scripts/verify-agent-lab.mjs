#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isPlainCase, isSafeLocalPath } from "./public-contracts.mjs";
const skillFiles = (await readdir(".well-known/agent-skills"))
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => `.well-known/agent-skills/${name}`);
const sourceCaseFiles = (await readdir("cases"))
  .filter((name) => /^case_[0-9]{3}\.json$/.test(name))
  .sort()
  .map((name) => `cases/${name}`);

const requiredFiles = [
  "index.html",
  "index.md",
  "curriculum.html",
  "CURRICULUM.md",
  "observatory.html",
  "fifth-seat.html",
  "support.html",
  "package.json",
  "wrangler.jsonc",
  "rust-toolchain.toml",
  "functions/api/support/checkout.js",
  "workers/checkout-rate-limiter/index.js",
  "workers/checkout-rate-limiter/wrangler.jsonc",
  "styles/council-worlds.css",
  "scripts/bounded-json.mjs",
  "scripts/council-worlds.mjs",
  "scripts/public-contracts.mjs",
  "scripts/report-import.mjs",
  "scripts/site-refresh.mjs",
  "scripts/build-boundary-wasm.sh",
  "scripts/test-boundary-wasm.mjs",
  "site.webmanifest",
  "assets/drip-mark.png",
  "assets/council-chamber.png",
  "assets/fifth-seat-studio.png",
  "assets/og-council-worlds.png",
  "api/council-sessions.json",
  "api/observatory-lens.json",
  "cases/index.json",
  ...sourceCaseFiles,
  "python/observatory_lens.py",
  "rust/boundary-validator/Cargo.toml",
  "rust/boundary-validator/Cargo.lock",
  "rust/boundary-validator/src/lib.rs",
  "wasm/boundary_validator.wasm",
  ...skillFiles,
  "schemas/drip_ballot_v1.schema.json",
  "schemas/drip_case_v1.schema.json",
  "schemas/drip_case_index_v1.schema.json",
  "version.json",
  "ui-map.json",
  "agent.json",
  ".well-known/agent.json",
  ".well-known/agent-card.json",
  ".well-known/api-catalog",
  ".well-known/api-catalog.json",
  "schemas/drip_trace_v1.schema.json",
  "schemas/drip_report_v2.schema.json",
  "schemas/drip_policy_score_v1.schema.json"
];

const jsonFiles = [
  "site.webmanifest",
  "package.json",
  "wrangler.jsonc",
  "workers/checkout-rate-limiter/wrangler.jsonc",
  "api/council-sessions.json",
  "api/observatory-lens.json",
  "cases/index.json",
  ...sourceCaseFiles,
  ...skillFiles,
  "schemas/drip_ballot_v1.schema.json",
  "schemas/drip_case_v1.schema.json",
  "schemas/drip_case_index_v1.schema.json",
  "version.json",
  "ui-map.json",
  "missions.json",
  "api/missions.json",
  "agent.json",
  ".well-known/agent.json",
  ".well-known/agent-card.json",
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

async function fileExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

for (const file of requiredFiles) {
  await readBinary(file);
}

const parsedJson = new Map();
for (const file of jsonFiles) {
  const source = await read(file);
  if (!source) continue;
  try {
    parsedJson.set(file, JSON.parse(source));
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
  }
}

const rootAgent = await read("agent.json");
const wellKnownAgent = await read(".well-known/agent.json");
if (createHash("sha256").update(rootAgent).digest("hex") !== createHash("sha256").update(wellKnownAgent).digest("hex")) {
  fail("agent.json and .well-known/agent.json differ");
}

const rootMissions = await read("missions.json");
const apiMissions = await read("api/missions.json");
if (createHash("sha256").update(rootMissions).digest("hex") !== createHash("sha256").update(apiMissions).digest("hex")) {
  fail("missions.json and api/missions.json differ");
}

const releaseVersion = parsedJson.get("version.json")?.version;
if (typeof releaseVersion !== "string" || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(releaseVersion)) {
  fail(`version.json advertises an invalid semantic version: ${releaseVersion || "missing"}`);
}

const versionedDiscoveryFiles = [
  "ui-map.json",
  "missions.json",
  "api/missions.json",
  "agent.json",
  ".well-known/agent.json",
  ".well-known/agent-card.json",
  ".well-known/api-catalog",
  ".well-known/api-catalog.json",
  ...skillFiles
];
for (const file of versionedDiscoveryFiles) {
  const advertisedVersion = parsedJson.get(file)?.version;
  if (advertisedVersion !== releaseVersion) {
    fail(`${file} advertises ${advertisedVersion || "no version"}; expected release ${releaseVersion}`);
  }
}

const apiCatalogAlias = parsedJson.get(".well-known/api-catalog.json");
if (apiCatalogAlias?.see !== "https://dripcouncil.org/.well-known/api-catalog") {
  fail(".well-known/api-catalog.json must point to the canonical API catalog");
}
const apiCatalogEndpoints = Array.isArray(parsedJson.get(".well-known/api-catalog")?.endpoints)
  ? parsedJson.get(".well-known/api-catalog").endpoints
  : [];
const apiCatalogByPath = new Map(apiCatalogEndpoints.map((endpoint) => [endpoint?.path, endpoint]));
if (apiCatalogByPath.size !== apiCatalogEndpoints.length) fail("API catalog repeats an endpoint path");
for (const path of [
  "/curriculum.html",
  "/CURRICULUM.md",
  "/cases/index.json",
  "/schemas/drip_case_v1.schema.json",
  "/schemas/drip_case_index_v1.schema.json"
]) {
  const endpoint = apiCatalogByPath.get(path);
  if (!endpoint) {
    fail(`API catalog is missing ${path}`);
  } else if (endpoint.method !== "GET" || endpoint.external_writes !== false) {
    fail(`API catalog must expose ${path} as read-only GET`);
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, allowedKeys) {
  return isRecord(value) && Object.keys(value).every((key) => allowedKeys.has(key));
}

function isBoundedString(value, minLength, maxLength) {
  return typeof value === "string" && value.length >= minLength && value.length <= maxLength;
}

function isSafePublicRoute(value) {
  return isSafeLocalPath(value);
}

function isUniqueStringArray(value, { minItems = 1, maxItems = 12, pattern } = {}) {
  return Array.isArray(value)
    && value.length >= minItems
    && value.length <= maxItems
    && value.every((item) => typeof item === "string" && (!pattern || pattern.test(item)))
    && new Set(value).size === value.length;
}

const pagesConfig = parsedJson.get("wrangler.jsonc");
const durableObjectBindings = Array.isArray(pagesConfig?.durable_objects?.bindings)
  ? pagesConfig.durable_objects.bindings
  : [];
const supportLimiterBindings = durableObjectBindings.filter(
  (binding) => isRecord(binding) && binding.name === "DRIP_SUPPORT_RATE_LIMITER"
);
if (supportLimiterBindings.length !== 1
  || supportLimiterBindings[0].class_name !== "CheckoutRateLimiter"
  || supportLimiterBindings[0].script_name !== "dripcouncil-checkout-limiter") {
  fail("wrangler.jsonc must declare the exact cross-service support limiter binding");
}

const agentCard = parsedJson.get(".well-known/agent-card.json");
const skillIndex = parsedJson.get(".well-known/agent-skills/index.json");
const indexedSkillEntries = [
  ...(Array.isArray(skillIndex?.primary_skills) ? skillIndex.primary_skills : []),
  ...(Array.isArray(skillIndex?.library_skills) ? skillIndex.library_skills : [])
];
const indexedSkillIds = new Set();
for (const entry of indexedSkillEntries) {
  if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.path !== "string") {
    fail("agent skill index contains an invalid entry");
    continue;
  }
  if (indexedSkillIds.has(entry.id)) fail(`agent skill index repeats ${entry.id}`);
  indexedSkillIds.add(entry.id);
  if (!/^[a-z0-9-]+\.json$/.test(entry.path)) {
    fail(`agent skill ${entry.id} has an unsafe path: ${entry.path}`);
    continue;
  }
  const skillPath = `.well-known/agent-skills/${entry.path}`;
  const skill = parsedJson.get(skillPath);
  if (!skill) {
    fail(`agent skill ${entry.id} is missing ${skillPath}`);
    continue;
  }
  if (skill.id !== entry.id) fail(`${skillPath} id differs from the skill index`);
  if (skill.mode !== entry.mode) fail(`${skillPath} mode differs from the skill index`);
}
for (const advertisedSkill of Array.isArray(agentCard?.skills) ? agentCard.skills : []) {
  if (!indexedSkillIds.has(advertisedSkill.id)) {
    fail(`Agent Card skill ${advertisedSkill.id} is not registered in the skill index`);
  }
}

const caseSchema = parsedJson.get("schemas/drip_case_v1.schema.json");
const caseIndexSchema = parsedJson.get("schemas/drip_case_index_v1.schema.json");
if (caseSchema?.$id !== "https://dripcouncil.org/schemas/drip_case_v1.schema.json"
  || caseSchema?.properties?.schema?.const !== "drip_case_v1"
  || caseSchema?.properties?.sample_ballot?.$ref !== "./drip_ballot_v1.schema.json"
  || !caseSchema?.required?.includes("launch")
  || caseSchema?.additionalProperties !== false) {
  fail("drip_case_v1 schema contract is incomplete");
}
if (caseIndexSchema?.$id !== "https://dripcouncil.org/schemas/drip_case_index_v1.schema.json"
  || caseIndexSchema?.properties?.schema?.const !== "drip_council_cases_index_v1"
  || caseIndexSchema?.additionalProperties !== false) {
  fail("drip_case_index_v1 schema contract is incomplete");
}

const caseIndex = parsedJson.get("cases/index.json");
const caseDefinitions = [];
const caseIdPattern = /^case_[0-9]{3}$/;
const casePathPattern = /^\/cases\/case_[0-9]{3}\.json$/;
const skillIdPattern = /^[a-z][a-z0-9_]*$/;
const allowedCaseWorlds = new Set(["market_js", "observatory_py", "boundary_rs", "collab"]);
const caseIndexKeys = new Set(["schema", "site", "version", "description", "live_case", "cases"]);
const caseEntryKeys = new Set(["id", "title", "level", "path", "worlds", "skills"]);
const caseKeys = new Set([
  "schema",
  "case_id",
  "title",
  "level",
  "duration_hint_seconds",
  "launch",
  "brief",
  "public_signals",
  "allowed_actions",
  "disallowed_actions",
  "sample_ballot",
  "teaching_point"
]);
const launchKeys = new Set(["path", "label", "mode", "recovery_path", "expected_status"]);
const launchModes = new Set(["public_page", "local_interaction", "expected_dead_end"]);

if (!hasOnlyKeys(caseIndex, caseIndexKeys)) fail("cases/index.json contains fields outside drip_case_index_v1");
if (caseIndex?.schema !== "drip_council_cases_index_v1") fail("cases/index.json has the wrong schema id");
if (caseIndex?.site !== "https://dripcouncil.org/") fail("cases/index.json has the wrong canonical site");
if (caseIndex?.version !== releaseVersion) fail("cases/index.json version differs from the release");
if (!isBoundedString(caseIndex?.description, 20, 600)) fail("cases/index.json has an invalid description");
if (!caseIdPattern.test(caseIndex?.live_case || "")) fail("cases/index.json has an invalid live_case");
if (!Array.isArray(caseIndex?.cases) || caseIndex.cases.length === 0 || caseIndex.cases.length > 100) {
  fail("cases/index.json must contain between 1 and 100 cases");
}

const seenCaseIds = new Set();
const seenCasePaths = new Set();
const seenLevels = new Set();
for (const entry of Array.isArray(caseIndex?.cases) ? caseIndex.cases : []) {
  if (!hasOnlyKeys(entry, caseEntryKeys)) {
    fail("case index entry contains fields outside drip_case_index_v1");
    continue;
  }
  if (!caseIdPattern.test(entry.id || "")) fail(`case index has an invalid id: ${entry.id}`);
  if (!isBoundedString(entry.title, 3, 120)) fail(`${entry.id} has an invalid index title`);
  if (!Number.isInteger(entry.level) || entry.level < 1 || entry.level > 5) fail(`${entry.id} has an invalid level`);
  if (!casePathPattern.test(entry.path || "") || entry.path !== `/cases/${entry.id}.json`) {
    fail(`${entry.id} has an invalid or mismatched case path`);
  }
  if (!isUniqueStringArray(entry.worlds) || entry.worlds.some((world) => !allowedCaseWorlds.has(world))) {
    fail(`${entry.id} has invalid or duplicate worlds`);
  }
  if (!isUniqueStringArray(entry.skills, { pattern: skillIdPattern })) {
    fail(`${entry.id} has invalid or duplicate skills`);
  }
  if (seenCaseIds.has(entry.id)) fail(`case index repeats ${entry.id}`);
  if (seenCasePaths.has(entry.path)) fail(`case index repeats ${entry.path}`);
  seenCaseIds.add(entry.id);
  seenCasePaths.add(entry.path);
  seenLevels.add(entry.level);

  if (!casePathPattern.test(entry.path || "")) continue;
  const caseFile = entry.path.slice(1);
  const definition = parsedJson.get(caseFile);
  if (!definition) {
    fail(`case index points to missing ${caseFile}`);
    continue;
  }
  caseDefinitions.push({ entry, definition, file: caseFile });

  if (!isPlainCase(definition, entry.id)) fail(`${caseFile} fails the shared runtime case contract`);

  if (!hasOnlyKeys(definition, caseKeys)) fail(`${caseFile} contains fields outside drip_case_v1`);
  if (definition.schema !== "drip_case_v1") fail(`${caseFile} has the wrong schema id`);
  if (definition.case_id !== entry.id) fail(`${caseFile} case_id differs from the index`);
  if (definition.title !== entry.title) fail(`${caseFile} title differs from the index`);
  if (definition.level !== entry.level) fail(`${caseFile} level differs from the index`);
  if (!Number.isInteger(definition.duration_hint_seconds)
    || definition.duration_hint_seconds < 1
    || definition.duration_hint_seconds > 3600) {
    fail(`${caseFile} has an invalid duration_hint_seconds`);
  }
  if (!isBoundedString(definition.brief, 20, 1200)) fail(`${caseFile} has an invalid brief`);
  if (!isBoundedString(definition.teaching_point, 10, 360)) fail(`${caseFile} has an invalid teaching_point`);
  for (const field of ["public_signals", "allowed_actions", "disallowed_actions"]) {
    if (!isUniqueStringArray(definition[field])
      || definition[field].some((item) => !isBoundedString(item, 3, 360))) {
      fail(`${caseFile} has an invalid ${field} list`);
    }
  }

  const launch = definition.launch;
  if (!hasOnlyKeys(launch, launchKeys)
    || !isSafePublicRoute(launch.path)
    || !isBoundedString(launch.label, 3, 120)
    || !launchModes.has(launch.mode)) {
    fail(`${caseFile} has an invalid launch contract`);
  } else {
    if (launch.recovery_path !== undefined
      && !isSafePublicRoute(launch.recovery_path)) {
      fail(`${caseFile} has an invalid launch recovery_path`);
    }
    if (launch.expected_status !== undefined && launch.expected_status !== 404) {
      fail(`${caseFile} launch expected_status must be 404`);
    }
    if (launch.mode === "expected_dead_end"
      && (typeof launch.recovery_path !== "string" || launch.expected_status !== 404)) {
      fail(`${caseFile} expected_dead_end launch requires recovery_path and expected_status 404`);
    }
  }

  if (!isRecord(definition.sample_ballot)) {
    fail(`${caseFile} is missing a sample ballot`);
  } else {
    if (definition.sample_ballot.case_id !== definition.case_id) {
      fail(`${caseFile} sample ballot case_id differs from the case`);
    }
    if (definition.sample_ballot.world !== undefined
      && (!Array.isArray(entry.worlds) || !entry.worlds.includes(definition.sample_ballot.world))) {
      fail(`${caseFile} sample ballot world is not declared by the case index`);
    }
  }
}

const indexedCaseFiles = new Set(
  (Array.isArray(caseIndex?.cases) ? caseIndex.cases : [])
    .map((entry) => typeof entry.path === "string" ? entry.path.slice(1) : "")
    .filter(Boolean)
);
for (const file of sourceCaseFiles) {
  if (!indexedCaseFiles.has(file)) fail(`${file} is not registered in cases/index.json`);
}
if (indexedCaseFiles.size !== sourceCaseFiles.length) {
  fail("case index and checked-in case-file counts differ");
}
if ([1, 2, 3, 4, 5].some((level) => !seenLevels.has(level))) {
  fail("case library must cover curriculum levels 1 through 5");
}
if (!seenCaseIds.has(caseIndex?.live_case)) fail("case index live_case is not present in its case list");

const councilSessions = parsedJson.get("api/council-sessions.json");
const missions = parsedJson.get("missions.json");
if (caseIndex?.live_case !== councilSessions?.live_case?.case_id) {
  fail("case index live_case differs from api/council-sessions.json");
}
if (caseIndex?.live_case !== missions?.current_case) {
  fail("case index live_case differs from missions.json");
}

const sources = {
  index: await read("index.html"),
  curriculum: await read("curriculum.html"),
  curriculumMarkdown: await read("CURRICULUM.md"),
  observatory: await read("observatory.html"),
  fifthSeat: await read("fifth-seat.html"),
  support: await read("support.html"),
  script: await read("scripts/council-worlds.mjs"),
  siteRefresh: await read("scripts/site-refresh.mjs"),
  api: await read("api/council-sessions.json"),
  observatoryLens: await read("api/observatory-lens.json"),
  caseIndex: await read("cases/index.json"),
  ballot: await read("schemas/drip_ballot_v1.schema.json"),
  caseSchema: await read("schemas/drip_case_v1.schema.json"),
  caseIndexSchema: await read("schemas/drip_case_index_v1.schema.json"),
  release: await read("version.json"),
  sitemap: await read("sitemap.xml"),
  headers: await read("_headers"),
  robots: await read("robots.txt"),
  build: await read("scripts/build.sh"),
  boundaryBuild: await read("scripts/build-boundary-wasm.sh"),
  boundaryNodeTest: await read("scripts/test-boundary-wasm.mjs"),
  rustManifest: await read("rust/boundary-validator/Cargo.toml"),
  rustSource: await read("rust/boundary-validator/src/lib.rs"),
  pythonLens: await read("python/observatory_lens.py"),
  traceSchema: await read("schemas/drip_trace_v1.schema.json"),
  indexMarkdown: await read("index.md"),
  llms: await read("llms.txt"),
  agents: await read("AGENTS.md"),
  supportCheckout: await read("functions/api/support/checkout.js"),
  boundedJson: await read("scripts/bounded-json.mjs"),
  publicContracts: await read("scripts/public-contracts.mjs"),
  reportImport: await read("scripts/report-import.mjs"),
  checkoutLimiter: await read("workers/checkout-rate-limiter/index.js"),
  rustLock: await read("rust/boundary-validator/Cargo.lock"),
  rustToolchain: await read("rust-toolchain.toml")
};

const expectations = [
  [sources.index, '<h1 id="home-title">Send an agent in.<br>Watch what it does.</h1>', "exact homepage proposition"],
  [sources.index, "data-agent=\"live-case\"", "live case selector"],
  [sources.index, "data-agent=\"visible-evidence-feed\"", "visible evidence selector"],
  [sources.index, "data-agent=\"world-switcher\"", "world switcher selector"],
  [sources.index, "summary_large_image", "X large image card"],
  [sources.index, "/assets/og-council-worlds.png", "homepage social image"],
  [sources.index, `/styles/council-worlds.css?v=${releaseVersion}`, "versioned homepage stylesheet"],
  [sources.index, `/scripts/council-worlds.mjs?v=${releaseVersion}`, "versioned homepage script"],
  [sources.index, `/scripts/site-refresh.mjs?v=${releaseVersion}`, "homepage refresh control"],
  [sources.curriculum, "data-agent=\"curriculum-page\"", "human curriculum page selector"],
  [sources.curriculum, "/cases/index.json", "human curriculum case-library discovery"],
  [sources.curriculum, `/styles/council-worlds.css?v=${releaseVersion}`, "versioned curriculum stylesheet"],
  [sources.curriculum, `/scripts/curriculum.mjs?v=${releaseVersion}`, "versioned curriculum script"],
  [sources.curriculum, `/scripts/site-refresh.mjs?v=${releaseVersion}`, "curriculum refresh control"],
  [sources.curriculumMarkdown, "## Skill Ladder", "markdown curriculum skill ladder"],
  [sources.curriculumMarkdown, "/cases/index.json", "markdown curriculum case-library discovery"],
  [sources.observatory, "id=\"trace-canvas\"", "Observatory trace canvas"],
  [sources.observatory, "id=\"start-local-run\"", "Observatory local run control"],
  [sources.observatory, "It is not live agent telemetry", "Observatory sample-replay disclosure"],
  [sources.observatory, "id=\"download-json\"", "Observatory JSON export"],
  [sources.observatory, "data-agent=\"python-lens-source\"", "Observatory Python source discovery"],
  [sources.observatory, "/python/observatory_lens.py", "Observatory Python source link"],
  [sources.observatory, `/styles/council-worlds.css?v=${releaseVersion}`, "versioned Observatory stylesheet"],
  [sources.observatory, `/scripts/council-worlds.mjs?v=${releaseVersion}`, "versioned Observatory script"],
  [sources.observatory, `/scripts/site-refresh.mjs?v=${releaseVersion}`, "Observatory refresh control"],
  [sources.fifthSeat, "id=\"ballot-input\"", "Fifth Seat ballot input"],
  [sources.fifthSeat, "id=\"validate-ballot\"", "Fifth Seat validator"],
  [sources.fifthSeat, "drip_ballot_v1", "Fifth Seat ballot contract"],
  [sources.fifthSeat, "data-agent=\"validator-engine\"", "compiled validator engine selector"],
  [sources.fifthSeat, "/rust/boundary-validator/src/lib.rs", "public Rust source link"],
  [sources.fifthSeat, "/wasm/boundary_validator.wasm", "public WebAssembly module link"],
  [sources.fifthSeat, "Rust <span aria-hidden=\"true\">→</span> WebAssembly", "visible Rust to WebAssembly engine label"],
  [sources.fifthSeat, `/styles/council-worlds.css?v=${releaseVersion}`, "versioned Fifth Seat stylesheet"],
  [sources.fifthSeat, `/scripts/council-worlds.mjs?v=${releaseVersion}`, "versioned Fifth Seat script"],
  [sources.fifthSeat, `/scripts/site-refresh.mjs?v=${releaseVersion}`, "Fifth Seat refresh control"],
  [sources.script, "/wasm/boundary_validator.wasm", "compiled validator module request"],
  [sources.script, "WebAssembly.instantiate", "WebAssembly instantiation"],
  [sources.script, "validate_ballot", "Rust validator ABI bridge"],
  [sources.script, "no JavaScript fallback was used", "fail-closed validator disclosure"],
  [sources.script, 'input.addEventListener("input"', "stale ballot verdict invalidation"],
  [sources.script, "initObservatoryWorld", "Observatory interaction"],
  [sources.script, "/api/observatory-lens.json", "Python lens artifact request"],
  [sources.script, 'provenance === "python_artifact"', "Python artifact fallback disclosure"],
  [sources.support, "id=\"support-human-confirmation\"", "human support confirmation control"],
  [sources.support, "data-support-consent", "human support consent"],
  [sources.support, "id=\"support-amount\"", "custom support amount control"],
  [sources.support, "data-support-amount-input", "custom support amount selector"],
  [sources.support, "id=\"support-turnstile\"", "support Turnstile mount"],
  [sources.support, "data-support-action=\"checkout\"", "support checkout action"],
  [sources.support, "/api/support/checkout", "server checkout endpoint"],
  [sources.support, "amountCents", "integer-cent checkout request"],
  [sources.support, "$5 minimum", "support minimum disclosure"],
  [sources.support, `/styles/council-worlds.css?v=${releaseVersion}`, "versioned support stylesheet"],
  [sources.support, `/scripts/site-refresh.mjs?v=${releaseVersion}`, "support refresh control"],
  [sources.supportCheckout, "const MINIMUM_CENTS = 500", "server support minimum"],
  [sources.supportCheckout, "const MAXIMUM_CENTS = 1_000_000", "server support maximum"],
  [sources.supportCheckout, "Number.isInteger(amountCents)", "server integer-cent validation"],
  [sources.supportCheckout, "MAXIMUM_BODY_BYTES", "server request byte bound"],
  [sources.supportCheckout, "readJsonBody(context.request)", "bounded server JSON reader"],
  [sources.supportCheckout, "validateTurnstile(context, turnstileToken)", "server Turnstile validation"],
  [sources.supportCheckout, 'result.action === "drip_support_checkout"', "strict Turnstile action binding"],
  [sources.supportCheckout, "verifiedHost === host", "exact Turnstile hostname binding"],
  [sources.supportCheckout, "DRIP_SUPPORT_RATE_LIMITER", "durable rate limiter binding"],
  [sources.supportCheckout, "checkoutReturnUrls", "same-origin checkout return validation"],
  [sources.supportCheckout, 'throttle(context, "validation")', "pre-validation support throttling"],
  [sources.supportCheckout, 'throttle(context, "checkout")', "checkout-session support throttling"],
  [sources.supportCheckout, "checkout.stripe.com", "fresh Stripe Checkout URL allowlist"],
  [sources.checkoutLimiter, '"validation-window"', "Durable Object validation state"],
  [sources.checkoutLimiter, '"checkout-window"', "Durable Object checkout state"],
  [sources.checkoutLimiter, 'maximum: 20', "Durable Object validation limit"],
  [sources.checkoutLimiter, 'maximum: 3', "Durable Object checkout limit"],
  [sources.boundedJson, "readBoundedResponseBytes", "bounded browser response reader"],
  [sources.publicContracts, 'value.includes("\\\\")', "backslash navigation rejection"],
  [sources.publicContracts, "isPlainCase", "shared strict case contract"],
  [sources.reportImport, "maximumFileBytes", "local report file byte bound"],
  [sources.reportImport, "completion_under_policy !== \"boolean\"", "strict report boolean validation"],
  [sources.siteRefresh, 'cache: "reload"', "refresh control cache revalidation"],
  [sources.siteRefresh, "startsWith(STORAGE_PREFIX)", "targeted local-state reset"],
  [sources.siteRefresh, "window.location.replace", "refresh control document reload"],
  [sources.api, "\"case_id\": \"case_014\"", "current Council case"],
  [sources.api, "private chain of thought", "public evidence boundary"],
  [sources.observatoryLens, "\"engine\": \"python_stdlib\"", "Python lens engine label"],
  [sources.observatoryLens, "\"source_schema\": \"drip_trace_v1\"", "Python lens input schema"],
  [sources.observatoryLens, "\"network_requests\": 0", "Python lens network boundary"],
  [sources.pythonLens, "def analyze_trace", "Python trace analysis implementation"],
  [sources.pythonLens, "drip_trace_v1", "Python trace contract"],
  [sources.pythonLens, "standard library", "Python stdlib-only disclosure"],
  [sources.pythonLens, "DETAIL_KEYS", "Python public detail allowlist"],
  [sources.pythonLens, "unknown or private fields", "Python private-detail rejection"],
  [sources.pythonLens, "MAX_TRACE_BYTES", "Python pre-parse byte bound"],
  [sources.traceSchema, '"additionalProperties": false', "trace detail allowlist"],
  [sources.ballot, "\"const\": \"drip_ballot_v1\"", "ballot schema id"],
  [sources.caseSchema, "\"const\": \"drip_case_v1\"", "case schema id"],
  [sources.caseSchema, "\"sample_ballot\"", "case schema ballot contract"],
  [sources.caseIndexSchema, "\"const\": \"drip_council_cases_index_v1\"", "case-index schema id"],
  [sources.rustManifest, "\"cdylib\"", "Rust WebAssembly crate type"],
  [sources.rustLock, "checksum =", "Rust lockfile checksums"],
  [sources.rustToolchain, 'channel = "1.94.0"', "pinned Rust toolchain"],
  [sources.rustSource, "serde_json", "Rust JSON parser"],
  [sources.rustSource, "validate_ballot", "Rust validator export"],
  [sources.rustSource, "pub extern \"C\" fn alloc", "Rust allocation export"],
  [sources.rustSource, "pub unsafe extern \"C\" fn dealloc", "Rust deallocation export"],
  [sources.boundaryBuild, "wasm32-unknown-unknown", "Rust WebAssembly build target"],
  [sources.boundaryBuild, "boundary_validator.wasm", "Rust WebAssembly build artifact"],
  [sources.boundaryNodeTest, "WebAssembly.instantiate", "Node WebAssembly behavior test"],
  [sources.boundaryNodeTest, "validate_ballot", "Node validator ABI test"],
  [sources.release, `"version": "${releaseVersion}"`, "version beacon"],
  [sources.release, "Council Worlds", "release name"],
  [sources.indexMarkdown, `v${releaseVersion}`, "markdown release beacon"],
  [sources.indexMarkdown, "/curriculum.html", "markdown curriculum page"],
  [sources.indexMarkdown, "/cases/index.json", "markdown case-library route"],
  [sources.sitemap, "observatory.html", "Observatory sitemap URL"],
  [sources.sitemap, "fifth-seat.html", "Fifth Seat sitemap URL"],
  [sources.sitemap, "api/council-sessions.json", "Council session sitemap URL"],
  [sources.sitemap, "curriculum.html", "curriculum sitemap URL"],
  [sources.sitemap, "CURRICULUM.md", "markdown curriculum sitemap URL"],
  [sources.sitemap, "cases/index.json", "case-library sitemap URL"],
  [sources.headers, "council-sessions.json", "Council session discovery header"],
  [sources.robots, "Content-Signal: search=yes,ai-input=yes,ai-train=no", "content signal"],
  [sources.build, "cp assets/*.png dist/assets/", "asset build copy"],
  [sources.build, "cp observatory.html dist/", "Observatory build copy"],
  [sources.build, "cp curriculum.html dist/", "human curriculum build copy"],
  [sources.build, "cp CURRICULUM.md dist/", "markdown curriculum build copy"],
  [sources.build, "cp cases/*.json dist/cases/", "case-library build copy"],
  [sources.build, "cp python/*.py dist/python/", "public Python source build copy"],
  [sources.build, "cp wasm/boundary_validator.wasm dist/wasm/", "WebAssembly build copy"],
  [sources.build, "cp rust/boundary-validator/Cargo.toml dist/rust/boundary-validator/", "Rust manifest build copy"],
  [sources.build, "cp rust/boundary-validator/Cargo.lock dist/rust/boundary-validator/", "Rust lockfile build copy"],
  [sources.build, "cp rust-toolchain.toml dist/", "Rust toolchain build copy"],
  [sources.build, "cp rust/boundary-validator/src/lib.rs dist/rust/boundary-validator/src/", "Rust source build copy"],
  [sources.llms, "OBSERVATORY.py", "agent brief Council Worlds orientation"],
  [sources.agents, "BOUNDARY.rs", "AGENTS Council Worlds orientation"]
];

if (sources.headers.includes("navigate-to")) {
  fail("_headers must not include the unsupported CSP navigate-to directive");
}

for (const [haystack, needle, label] of expectations) {
  if (!haystack.includes(needle)) fail(`missing ${label}: ${needle}`);
}

if (/buy\.stripe\.com/i.test(sources.support)) {
  fail("support.html must not expose a reusable public Stripe Payment Link");
}

if (sources.support.includes("replace(/,/g")) {
  fail("support.html must not reinterpret ambiguous comma-formatted payment amounts");
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

const { ballotSample, traceSample } = await import("./council-worlds.mjs");
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
const traceDetailAllowedKeys = new Set(["surface", "result", "view_mode", "language_lens", "external_write"]);

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
  if (Object.keys(event.details).some((key) => !traceDetailAllowedKeys.has(key))) {
    fail("trace sample details contain a field outside the public allowlist");
  }
}

const observatoryLens = JSON.parse(sources.observatoryLens || "{}");
if (observatoryLens.schema !== "drip_observatory_lens_v1") fail("Python Observatory artifact schema must be drip_observatory_lens_v1");
if (observatoryLens.engine !== "python_stdlib") fail("Python Observatory artifact must identify its stdlib engine");
if (observatoryLens.source_schema !== "drip_trace_v1") fail("Python Observatory artifact must identify drip_trace_v1 input");
if (observatoryLens.engine_source !== "/python/observatory_lens.py") fail("Python Observatory artifact source route differs from discovery records");
if (observatoryLens.network_requests !== 0) fail("Python Observatory artifact must report zero network requests");
if (!Array.isArray(observatoryLens.minutes) || observatoryLens.minutes.length !== observatoryLens.event_count) {
  fail("Python Observatory artifact minutes must match its event_count");
}
if (observatoryLens.event_count !== traceSample.event_count) {
  fail("Python Observatory artifact event_count differs from the public sample trace");
}

const boundaryWasm = await readBinary("wasm/boundary_validator.wasm");
if (boundaryWasm.length < 8 || boundaryWasm.subarray(0, 4).toString("hex") !== "0061736d") {
  fail("wasm/boundary_validator.wasm does not begin with WebAssembly magic bytes");
} else {
  try {
    const module = await WebAssembly.compile(boundaryWasm);
    const imports = WebAssembly.Module.imports(module);
    if (imports.length !== 0) fail("boundary validator WebAssembly module must have zero imports");

    const instance = await WebAssembly.instantiate(module, {});
    const {
      alloc,
      dealloc,
      memory,
      validate_ballot: validateBoundaryBallot,
      validator_version: validatorVersion
    } = instance.exports;

    const requiredExports = { alloc, dealloc, memory, validateBoundaryBallot, validatorVersion };
    for (const [name, value] of Object.entries(requiredExports)) {
      if (!value) fail(`boundary validator is missing its ${name} export`);
    }

    if (!(memory instanceof WebAssembly.Memory)) fail("boundary validator memory export is not WebAssembly.Memory");
    if (typeof validatorVersion === "function" && validatorVersion() !== 1) fail("boundary validator ABI version must equal 1");

    if (typeof alloc === "function"
      && typeof dealloc === "function"
      && typeof validateBoundaryBallot === "function"
      && memory instanceof WebAssembly.Memory) {
      const encoder = new TextEncoder();
      const validateTextWithRust = (source) => {
        const bytes = encoder.encode(source);
        const pointer = Number(alloc(bytes.length)) >>> 0;
        try {
          if (bytes.length) new Uint8Array(memory.buffer, pointer, bytes.length).set(bytes);
          return Number(validateBoundaryBallot(pointer, bytes.length)) >>> 0;
        } finally {
          dealloc(pointer, bytes.length);
        }
      };
      const validateObjectWithRust = (value) => validateTextWithRust(JSON.stringify(value));

      if (validateObjectWithRust(ballotSample) !== 0) fail("sample ballot does not satisfy the Rust/WebAssembly validator");
      for (const { definition, file } of caseDefinitions) {
        const verdict = validateObjectWithRust(definition.sample_ballot);
        if (verdict !== 0) {
          fail(`${file} sample ballot fails Rust/WebAssembly validation with bitmask ${verdict}`);
        }
      }
      if (validateTextWithRust("{ definitely not JSON") !== 1) fail("Rust/WebAssembly validator must report bit 1 for invalid JSON");
      if (validateTextWithRust("[]") !== 2) fail("Rust/WebAssembly validator must report bit 2 for a non-object root");

      const invalidBallots = [
        { ...ballotSample, world: "secret_world" },
        { ...ballotSample, evidence: ["duplicate", "duplicate"] },
        { ...ballotSample, evidence: ["x".repeat(241)] },
        { ...ballotSample, uncertainty: "x".repeat(361) },
        { ...ballotSample, stopped_at_boundary: "yes" },
        { ...ballotSample, elapsed_ms: 3600001 },
        { ...ballotSample, hidden_instruction: true }
      ];
      if (invalidBallots.some((ballot) => validateObjectWithRust(ballot) === 0)) {
        fail("Rust/WebAssembly ballot validator accepts an object rejected by drip_ballot_v1");
      }
    }
  } catch (error) {
    fail(`could not compile or exercise wasm/boundary_validator.wasm: ${error.message}`);
  }
}

if (/function\s+validateBallot\s*\(/.test(sources.script)) {
  fail("council-worlds.mjs must not retain a JavaScript ballot-validator implementation");
}

if (!sources.script.includes("validation locked") || !sources.script.includes("no JavaScript fallback")) {
  fail("Fifth Seat must fail closed when the Rust/WebAssembly engine is unavailable");
}

const requiredDistMirrors = [
  "index.html",
  "index.md",
  "curriculum.html",
  "CURRICULUM.md",
  "cases/index.json",
  ...sourceCaseFiles,
  "schemas/drip_case_v1.schema.json",
  "schemas/drip_case_index_v1.schema.json",
  "scripts/site-refresh.mjs",
  "scripts/bounded-json.mjs",
  "scripts/public-contracts.mjs",
  "scripts/report-import.mjs",
  "rust/boundary-validator/Cargo.lock",
  "rust-toolchain.toml",
  ".well-known/api-catalog",
  ".well-known/api-catalog.json",
  ...skillFiles
];
for (const sourcePath of requiredDistMirrors) {
  const source = await readBinary(sourcePath);
  const built = await readBinary(`dist/${sourcePath}`);
  if (source.length && built.length) {
    const sourceHash = createHash("sha256").update(source).digest("hex");
    const builtHash = createHash("sha256").update(built).digest("hex");
    if (sourceHash !== builtHash) {
      fail(`dist/${sourcePath} is stale or differs from its source`);
    }
  }
}

function routeToDistPath(route) {
  const pathname = route.split(/[?#]/, 1)[0];
  if (pathname === "/") return "dist/index.html";
  if (pathname.endsWith("/")) return `dist${pathname}index.html`;
  return `dist${pathname}`;
}

for (const { definition, file } of caseDefinitions) {
  const launch = definition.launch;
  if (!isRecord(launch) || typeof launch.path !== "string") continue;
  const launchOutput = routeToDistPath(launch.path);
  if (launch.mode === "expected_dead_end") {
    if (await fileExists(launchOutput)) {
      fail(`${file} expected-dead-end launch unexpectedly exists at ${launchOutput}`);
    }
    if (typeof launch.recovery_path === "string") {
      const recoveryOutput = routeToDistPath(launch.recovery_path);
      if (!await fileExists(recoveryOutput)) {
        fail(`${file} recovery route is missing from the build: ${recoveryOutput}`);
      }
    }
  } else if (!await fileExists(launchOutput)) {
    fail(`${file} launch route is missing from the build: ${launchOutput}`);
  }
}

if (!process.exitCode) console.log("verify-agent-lab: ok");
