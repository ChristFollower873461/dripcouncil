import assert from "node:assert/strict";
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

console.log("race-api-ok");
