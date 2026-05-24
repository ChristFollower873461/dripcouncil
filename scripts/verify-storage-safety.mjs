import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUNTIME_DIRS = ["functions", "src"];
const FORBIDDEN_CONFIG_FILES = ["wrangler.toml", "wrangler.json", "wrangler.jsonc"];
const FORBIDDEN_RUNTIME_PATTERNS = [
  /\benv\.[A-Z0-9_]*(?:DB|D1|DATABASE|RACE_ROOM|ROOM_OBJECT|ANALYTICS)[A-Z0-9_]*/i,
  /\bD1Database\b/,
  /\bd1_databases\b/,
  new RegExp(`\\b${["durable", "objects"].join("_")}\\b`),
  new RegExp(`\\b${["new", "sqlite", "classes"].join("_")}\\b`),
  /\bWebSocketPair\b/,
  /\bacceptWebSocket\b/,
  /\.getByName\s*\(/,
  /\.idFromName\s*\(/
];

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function listRuntimeFiles(directory, files = []) {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      listRuntimeFiles(fullPath, files);
    } else if (/\.(mjs|js|json)$/.test(entry)) {
      files.push(path.relative(ROOT, fullPath));
    }
  }
  return files.sort();
}

for (const file of FORBIDDEN_CONFIG_FILES) {
  assert.equal(existsSync(path.join(ROOT, file)), false, `${file} would enable deployment bindings outside the GitHub Pages standard`);
}

assert.equal(existsSync(path.join(ROOT, ["mig", "rations"].join(""))), false, "D1 schema-change files are not enabled in this reviewed static phase");

const routes = JSON.parse(read("_routes.json"));
assert.deepEqual(routes.include, ["/api/race/*"], "Pages Functions must stay scoped to race API previews");
assert.deepEqual(routes.exclude, [], "Pages Functions route exclusions should stay explicit");

const runtimeFiles = RUNTIME_DIRS.flatMap((dir) => listRuntimeFiles(path.join(ROOT, dir)));
assert.ok(runtimeFiles.length > 0, "runtime files should be present for storage-safety checks");

for (const relativePath of runtimeFiles) {
  const text = read(relativePath);
  for (const pattern of FORBIDDEN_RUNTIME_PATTERNS) {
    assert.ok(!pattern.test(text), `${relativePath} must not wire D1, Durable Object bindings, analytics, or WebSockets yet`);
  }
}

const handlers = read("src/race-api/handlers.mjs");
assert.ok(handlers.includes('errorResponse(request, 403, "room_creation_disabled"'), "room creation must keep returning disabled 403");
assert.ok(handlers.includes("public_binding_enabled: false"), "room API must disclose no public Durable Object binding");
assert.ok(handlers.includes("websocket_enabled: false"), "room API must disclose WebSockets are disabled");
assert.ok(handlers.includes("writes_enabled: false"), "room API must disclose room writes are disabled");
assert.ok(handlers.includes("stores_runs: false"), "room API must disclose D1 run storage is disabled");

const roomCreate = read("src/race-api/room-create.mjs");
assert.ok(roomCreate.includes("MAX_ROOM_CREATE_BYTES = 1024"), "room creation body cap must remain small");
assert.ok(roomCreate.includes("input.local_only !== true"), "room creation must require local-only acknowledgement");
assert.ok(roomCreate.includes("input.human_review_ack !== true"), "room creation must require human review acknowledgement");

const commands = read("src/race-api/commands.mjs");
assert.ok(commands.includes("MAX_COMMAND_BYTES = 2048"), "command envelope cap must remain bounded");
assert.ok(commands.includes("MAX_COMMAND_PAYLOAD_BYTES = 512"), "command payload cap must remain bounded");
assert.ok(commands.includes("external_url_rejected"), "commands must keep rejecting external URLs");

const data = read("src/race-api/data.mjs");
assert.ok(data.includes("max_players_per_room: 1"), "planned player cap must stay one per room");
assert.ok(data.includes("max_spectators_per_room: 12"), "planned spectator cap must stay bounded");
assert.ok(data.includes("max_message_bytes: 2048"), "planned message cap must stay bounded");

const roomState = read("src/race-api/room-state.mjs");
assert.ok(roomState.includes("MAX_EVENT_BUFFER = 60"), "room event buffer must remain bounded");
assert.ok(roomState.includes(".slice(-MAX_EVENT_BUFFER)"), "room events must be trimmed to the buffer cap");
assert.ok(roomState.includes("connectedCount >= maxAllowed"), "room roster must enforce planned caps");
assert.ok(roomState.includes("cleanup_enabled: false"), "room cleanup must stay disabled until live review");
assert.ok(roomState.includes("stores_private_prompts: false"), "room snapshots must disclose no private prompt storage");

const raceRoom = read("src/race-api/race-room.mjs");
assert.ok(raceRoom.includes("writes_enabled: false"), "RaceRoom status must keep writes disabled");
assert.ok(raceRoom.includes("websocket_enabled: false"), "RaceRoom status must keep WebSockets disabled");
assert.ok(raceRoom.includes("room_writes_disabled"), "RaceRoom must reject accepted commands as writes-disabled");
assert.ok(raceRoom.includes("cleanup_enabled: false"), "RaceRoom alarm must not enable cleanup yet");
assert.ok(raceRoom.includes("prepareStorage()"), "RaceRoom storage setup must remain explicit and reviewable");

console.log("storage-safety-ok");
