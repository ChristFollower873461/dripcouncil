import assert from "node:assert/strict";
import { validateRaceCommand } from "../src/race-api/commands.mjs";
import { handleHealth, handleNotFound, handleRooms, handleTracks } from "../src/race-api/handlers.mjs";

async function readJson(response) {
  return JSON.parse(await response.text());
}

function context(path, init = {}) {
  return {
    request: new Request(`https://dripcouncil.org${path}`, init)
  };
}

const health = await handleHealth(context("/api/race/health"));
assert.equal(health.status, 200);
assert.equal((await readJson(health)).backend_status.rooms, "not_enabled_until_durable_object_phase");

const tracks = await handleTracks(context("/api/race/tracks"));
assert.equal(tracks.status, 200);
const trackJson = await readJson(tracks);
assert.equal(trackJson.tracks[0].id, "signal-loop-01");
assert.equal(trackJson.safety.persistence_enabled, false);

const oneTrack = await handleTracks(context("/api/race/tracks?track_id=signal-loop-01"));
assert.equal(oneTrack.status, 200);
assert.equal((await readJson(oneTrack)).tracks.length, 1);

const unknownTrack = await handleTracks(context("/api/race/tracks?track_id=missing"));
assert.equal(unknownTrack.status, 404);

const unknownQuery = await handleTracks(context("/api/race/tracks?next=http://example.com"));
assert.equal(unknownQuery.status, 400);

const rooms = await handleRooms(context("/api/race/rooms"));
assert.equal(rooms.status, 200);
const roomsJson = await readJson(rooms);
assert.equal(roomsJson.create_room.enabled, false);
assert.equal(roomsJson.safety.accepts_agent_writes, false);

const postRoom = await handleRooms(context("/api/race/rooms", { method: "POST", body: "{}" }));
assert.equal(postRoom.status, 405);

const options = await handleRooms(context("/api/race/rooms", { method: "OPTIONS" }));
assert.equal(options.status, 204);

const missingRoute = await handleNotFound(context("/api/race/nope"));
assert.equal(missingRoute.status, 404);
assert.equal((await readJson(missingRoute)).error.code, "race_api_route_not_found");

const validCommand = validateRaceCommand({
  schema: "drip_raceway_command_v1",
  command: "read_sign",
  control_source: "button",
  segment_id: "reading_order_chicane",
  local_event_id: "evt-local-1",
  payload: { sign_id: "green-path", local_only: true }
});
assert.equal(validCommand.ok, true);
assert.equal(validCommand.command.command, "read_sign");

assert.equal(validateRaceCommand({ command: "open_checkout" }).error.code, "unknown_command");
assert.equal(validateRaceCommand({ command: "accelerate", control_source: "external_tool" }).error.code, "unknown_control_source");
assert.equal(validateRaceCommand({ command: "accelerate", segment_id: "hidden_lane" }).error.code, "unknown_segment");
assert.equal(validateRaceCommand({ command: "accelerate", external_url: "https://example.com" }).error.code, "unknown_command_field");
assert.equal(validateRaceCommand({ command: "request_hint", payload: { reason: "see https://example.com" } }).error.code, "external_url_rejected");
assert.equal(validateRaceCommand({ command: "recover", payload: { private_prompt: "nope" } }).error.code, "unknown_payload_field");
assert.equal(validateRaceCommand({ command: "yield", payload: { reason: "x".repeat(600) } }).error.code, "payload_too_large");
assert.equal(validateRaceCommand({ command: "yield", payload: { reason: { nested: "nope" } } }).error.code, "invalid_payload_value");

console.log("race-api-ok");
