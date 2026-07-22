#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const requiredFiles = [
  "index.html",
  "observatory.html",
  "fifth-seat.html",
  "support.html",
  "functions/api/support/checkout.js",
  "styles/council-worlds.css",
  "scripts/council-worlds.mjs",
  "scripts/build-boundary-wasm.sh",
  "scripts/test-boundary-wasm.mjs",
  "site.webmanifest",
  "assets/drip-mark.png",
  "assets/council-chamber.png",
  "assets/fifth-seat-studio.png",
  "assets/og-council-worlds.png",
  "api/council-sessions.json",
  "api/observatory-lens.json",
  "python/observatory_lens.py",
  "rust/boundary-validator/Cargo.toml",
  "rust/boundary-validator/src/lib.rs",
  "wasm/boundary_validator.wasm",
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
  "api/observatory-lens.json",
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

const releaseVersion = JSON.parse(await read("version.json")).version;
const versionedDiscoveryFiles = [
  "ui-map.json",
  "missions.json",
  "api/missions.json",
  "agent.json",
  ".well-known/agent.json",
  ".well-known/agent-card.json",
  ".well-known/api-catalog",
  ".well-known/agent-skills/index.json",
  ".well-known/agent-skills/inspect-council-case.json",
  ".well-known/agent-skills/render-public-trace.json",
  ".well-known/agent-skills/run-static-mission.json",
  ".well-known/agent-skills/trace-local-behavior.json",
  ".well-known/agent-skills/validate-local-ballot.json"
];
for (const file of versionedDiscoveryFiles) {
  const advertisedVersion = JSON.parse(await read(file)).version;
  if (advertisedVersion !== releaseVersion) {
    fail(`${file} advertises ${advertisedVersion || "no version"}; expected release ${releaseVersion}`);
  }
}

const sources = {
  index: await read("index.html"),
  observatory: await read("observatory.html"),
  fifthSeat: await read("fifth-seat.html"),
  support: await read("support.html"),
  script: await read("scripts/council-worlds.mjs"),
  api: await read("api/council-sessions.json"),
  observatoryLens: await read("api/observatory-lens.json"),
  ballot: await read("schemas/drip_ballot_v1.schema.json"),
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
  supportCheckout: await read("functions/api/support/checkout.js")
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
  [sources.observatory, "data-agent=\"python-lens-source\"", "Observatory Python source discovery"],
  [sources.observatory, "/python/observatory_lens.py", "Observatory Python source link"],
  [sources.fifthSeat, "id=\"ballot-input\"", "Fifth Seat ballot input"],
  [sources.fifthSeat, "id=\"validate-ballot\"", "Fifth Seat validator"],
  [sources.fifthSeat, "drip_ballot_v1", "Fifth Seat ballot contract"],
  [sources.fifthSeat, "data-agent=\"validator-engine\"", "compiled validator engine selector"],
  [sources.fifthSeat, "/rust/boundary-validator/src/lib.rs", "public Rust source link"],
  [sources.fifthSeat, "/wasm/boundary_validator.wasm", "public WebAssembly module link"],
  [sources.fifthSeat, "Rust <span aria-hidden=\"true\">→</span> WebAssembly", "visible Rust to WebAssembly engine label"],
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
  [sources.supportCheckout, "const MINIMUM_CENTS = 500", "server support minimum"],
  [sources.supportCheckout, "const MAXIMUM_CENTS = 1_000_000", "server support maximum"],
  [sources.supportCheckout, "Number.isInteger(amountCents)", "server integer-cent validation"],
  [sources.supportCheckout, "validateTurnstile(context, token)", "server Turnstile validation"],
  [sources.supportCheckout, "result.action !== \"drip_support_checkout\"", "strict Turnstile action binding"],
  [sources.supportCheckout, "!allowedHostname(result.hostname)", "strict Turnstile hostname binding"],
  [sources.supportCheckout, "throttle(context)", "server support throttling"],
  [sources.supportCheckout, "checkout.stripe.com", "fresh Stripe Checkout URL allowlist"],
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
  [sources.traceSchema, '"additionalProperties": false', "trace detail allowlist"],
  [sources.ballot, "\"const\": \"drip_ballot_v1\"", "ballot schema id"],
  [sources.rustManifest, "\"cdylib\"", "Rust WebAssembly crate type"],
  [sources.rustSource, "serde_json", "Rust JSON parser"],
  [sources.rustSource, "validate_ballot", "Rust validator export"],
  [sources.rustSource, "pub extern \"C\" fn alloc", "Rust allocation export"],
  [sources.rustSource, "pub unsafe extern \"C\" fn dealloc", "Rust deallocation export"],
  [sources.boundaryBuild, "wasm32-unknown-unknown", "Rust WebAssembly build target"],
  [sources.boundaryBuild, "boundary_validator.wasm", "Rust WebAssembly build artifact"],
  [sources.boundaryNodeTest, "WebAssembly.instantiate", "Node WebAssembly behavior test"],
  [sources.boundaryNodeTest, "validate_ballot", "Node validator ABI test"],
  [sources.release, "\"version\": \"2.1.0\"", "version beacon"],
  [sources.release, "Council Worlds", "release name"],
  [sources.indexMarkdown, "v2.1.0", "markdown release beacon"],
  [sources.sitemap, "observatory.html", "Observatory sitemap URL"],
  [sources.sitemap, "fifth-seat.html", "Fifth Seat sitemap URL"],
  [sources.sitemap, "api/council-sessions.json", "Council session sitemap URL"],
  [sources.headers, "council-sessions.json", "Council session discovery header"],
  [sources.robots, "Content-Signal: search=yes,ai-input=yes,ai-train=no", "content signal"],
  [sources.build, "cp assets/*.png dist/assets/", "asset build copy"],
  [sources.build, "cp observatory.html dist/", "Observatory build copy"],
  [sources.build, "cp python/*.py dist/python/", "public Python source build copy"],
  [sources.build, "cp wasm/boundary_validator.wasm dist/wasm/", "WebAssembly build copy"],
  [sources.build, "cp rust/boundary-validator/Cargo.toml dist/rust/boundary-validator/", "Rust manifest build copy"],
  [sources.build, "cp rust/boundary-validator/src/lib.rs dist/rust/boundary-validator/src/", "Rust source build copy"],
  [sources.llms, "OBSERVATORY.py", "agent brief Council Worlds orientation"],
  [sources.agents, "BOUNDARY.rs", "AGENTS Council Worlds orientation"]
];

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

if (!process.exitCode) console.log("verify-agent-lab: ok");
