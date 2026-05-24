import assert from "node:assert/strict";
import { handleNotFound, handleRooms } from "../src/race-api/handlers.mjs";

async function readJson(response) {
  return JSON.parse(await response.text());
}

function context(path, init = {}) {
  return {
    request: new Request(`https://dripcouncil.org${path}`, init)
  };
}

const roomCreateBody = {
  schema: "drip_raceway_room_create_v1",
  track_id: "signal-loop-01",
  mode: "casual_cruise",
  created_by_type: "human",
  room_label_hash: "load-review",
  local_only: true,
  human_review_ack: true
};

for (let index = 0; index < 24; index += 1) {
  const rooms = await handleRooms(context("/api/race/rooms"));
  assert.equal(rooms.status, 200);

  const roomsJson = await readJson(rooms);
  assert.equal(roomsJson.rooms.length, 0);
  assert.equal(roomsJson.create_room.enabled, false);
  assert.equal(roomsJson.durable_object.websocket_enabled, false);
  assert.equal(roomsJson.durable_object.public_join_route_enabled, false);
  assert.equal(roomsJson.durable_object.spectator_broadcast_enabled, false);
  assert.equal(roomsJson.safety.accepts_agent_writes, false);
}

for (let index = 0; index < 24; index += 1) {
  const postRoom = await handleRooms(context("/api/race/rooms", {
    method: "POST",
    headers: { origin: "https://dripcouncil.org" },
    body: JSON.stringify({ ...roomCreateBody, room_label_hash: `load-review-${index}` })
  }));

  assert.equal(postRoom.status, 403);
  const postRoomJson = await readJson(postRoom);
  assert.equal(postRoomJson.error.code, "room_creation_disabled");
  assert.equal(postRoomJson.error.details.writes_enabled, false);
  assert.equal(postRoomJson.error.details.public_binding_enabled, false);
  assert.equal(postRoomJson.error.details.websocket_enabled, false);
  assert.equal(postRoomJson.error.details.persistence_enabled, false);
}

for (let index = 0; index < 12; index += 1) {
  const crossOriginPost = await handleRooms(context("/api/race/rooms", {
    method: "POST",
    headers: { origin: "https://example.org" },
    body: JSON.stringify({ ...roomCreateBody, room_label_hash: `cross-origin-${index}` })
  }));

  assert.equal(crossOriginPost.status, 403);
  assert.equal((await readJson(crossOriginPost)).error.code, "origin_not_allowed");
}

for (let index = 0; index < 8; index += 1) {
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
}

const websocketLikePaths = [
  "/api/race/rooms/local/ws",
  "/api/race/rooms/local-room/ws?role=player",
  "/api/race/rooms/local-room/ws?role=spectator"
];

for (const path of websocketLikePaths) {
  const response = await handleNotFound(context(path));
  assert.equal(response.status, 404);

  const responseJson = await readJson(response);
  assert.equal(responseJson.error.code, "race_api_route_not_found");
  assert.deepEqual(responseJson.error.details.available_routes, [
    "/api/race/health",
    "/api/race/tracks",
    "/api/race/rooms"
  ]);
}

console.log("race-load-ok");
