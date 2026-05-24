import assert from "node:assert/strict";
import { validateRaceCommand } from "../src/race-api/commands.mjs";
import { handleHealth, handleNotFound, handleRoomCreateDisabled, handleRooms, handleTracks } from "../src/race-api/handlers.mjs";

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
assert.equal(roomsJson.durable_object.status, "skeleton_unbound");
assert.equal(roomsJson.durable_object.source_clock_enabled, true);
assert.equal(roomsJson.durable_object.source_checkpoint_progression_enabled, true);
assert.equal(roomsJson.durable_object.source_ttl_enabled, true);
assert.equal(roomsJson.durable_object.source_presence_enabled, true);
assert.equal(roomsJson.durable_object.cleanup_enabled, false);
assert.equal(roomsJson.durable_object.public_join_route_enabled, false);
assert.equal(roomsJson.durable_object.spectator_broadcast_enabled, false);
assert.equal(roomsJson.durable_object.public_snapshot_route_enabled, false);
assert.equal(roomsJson.create_room.request_schema, "drip_raceway_room_create_v1");
assert.equal(roomsJson.create_room.review_gate.valid_request_response, "403 room_creation_disabled");

const roomCreateBody = {
  schema: "drip_raceway_room_create_v1",
  track_id: "signal-loop-01",
  mode: "casual_cruise",
  created_by_type: "human",
  room_label_hash: "local-review",
  local_only: true,
  human_review_ack: true
};

const postRoom = await handleRooms(context("/api/race/rooms", {
  method: "POST",
  headers: { origin: "https://dripcouncil.org" },
  body: JSON.stringify(roomCreateBody)
}));
assert.equal(postRoom.status, 403);
const postRoomJson = await readJson(postRoom);
assert.equal(postRoomJson.error.code, "room_creation_disabled");
assert.equal(postRoomJson.error.details.validated_request.track_id, "signal-loop-01");

const crossOriginPost = await handleRooms(context("/api/race/rooms", {
  method: "POST",
  headers: { origin: "https://example.org" },
  body: JSON.stringify(roomCreateBody)
}));
assert.equal(crossOriginPost.status, 403);
assert.equal((await readJson(crossOriginPost)).error.code, "origin_not_allowed");

const noOriginPost = await handleRooms(context("/api/race/rooms", {
  method: "POST",
  body: JSON.stringify(roomCreateBody)
}));
assert.equal(noOriginPost.status, 403);
assert.equal((await readJson(noOriginPost)).error.code, "origin_not_allowed");

const oversizedPost = await handleRooms(context("/api/race/rooms", {
  method: "POST",
  headers: {
    "content-length": "4096",
    origin: "https://dripcouncil.org"
  },
  body: JSON.stringify(roomCreateBody)
}));
assert.equal(oversizedPost.status, 413);
assert.equal((await readJson(oversizedPost)).error.code, "payload_too_large");

const invalidLengthPost = await handleRooms(context("/api/race/rooms", {
  method: "POST",
  headers: {
    "content-length": "nope",
    origin: "https://dripcouncil.org"
  },
  body: JSON.stringify(roomCreateBody)
}));
assert.equal(invalidLengthPost.status, 400);
assert.equal((await readJson(invalidLengthPost)).error.code, "invalid_content_length");

const tooLargeRoomBody = await handleRooms(context("/api/race/rooms", {
  method: "POST",
  headers: { origin: "https://dripcouncil.org" },
  body: JSON.stringify({ ...roomCreateBody, room_label_hash: "x".repeat(1200) })
}));
assert.equal(tooLargeRoomBody.status, 400);
assert.equal((await readJson(tooLargeRoomBody)).error.code, "room_create_too_large");

const invalidPostRoom = await handleRoomCreateDisabled(context("/api/race/rooms", {
  method: "POST",
  body: JSON.stringify({ track_id: "signal-loop-01", local_only: true })
}));
assert.equal(invalidPostRoom.status, 400);
assert.equal((await readJson(invalidPostRoom)).error.code, "human_review_required");

const disallowedMethod = await handleRooms(context("/api/race/rooms", { method: "DELETE" }));
assert.equal(disallowedMethod.status, 405);
assert.equal(disallowedMethod.headers.get("allow"), "GET, HEAD, POST, OPTIONS");
assert.equal((await readJson(disallowedMethod)).error.code, "method_not_allowed");

const options = await handleRooms(context("/api/race/rooms", { method: "OPTIONS" }));
assert.equal(options.status, 204);
assert.equal(options.headers.get("allow"), "GET, HEAD, POST, OPTIONS");

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
