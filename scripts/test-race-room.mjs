import assert from "node:assert/strict";
import { RaceRoom } from "../src/race-api/race-room.mjs";
import {
  appendRoomEvent,
  applyValidatedCommandToState,
  createInitialRoomState,
  createRoomSnapshot,
  expireRoomIfNeeded,
  startRaceClock
} from "../src/race-api/room-state.mjs";
import { validateRaceCommand } from "../src/race-api/commands.mjs";

const sqlStatements = [];
const room = new RaceRoom({
  blockConcurrencyWhile: async (callback) => callback(),
  storage: {
    sql: {
      exec(statement) {
        sqlStatements.push(String(statement).replace(/\s+/g, " ").trim());
        return {
          toArray: () => [],
          one: () => ({})
        };
      }
    }
  }
});

const status = await room.getStatus();
assert.equal(status.mode, "durable_object_skeleton");
assert.equal(status.writes_enabled, false);
assert.equal(status.command_validation_enabled, true);
assert.equal(status.source_clock_enabled, true);
assert.equal(status.source_presence_enabled, true);
assert.equal(sqlStatements.length, 2);

const snapshot = await room.getSnapshot();
assert.equal(snapshot.status, "skeleton");
assert.equal(snapshot.checkpoints.total, 7);
assert.equal(snapshot.clock.status, "not_started");
assert.equal(snapshot.clock.elapsed_ms, 0);
assert.equal(snapshot.ttl.status, "active");
assert.equal(snapshot.ttl.cleanup_enabled, false);
assert.equal(snapshot.safety.accepts_agent_writes, false);
assert.equal(snapshot.safety.stores_private_prompts, false);

const created = await room.createRoom({
  schema: "drip_raceway_room_create_v1",
  track_id: "signal-loop-01",
  mode: "casual_cruise",
  created_by_type: "human",
  room_label_hash: "local-review",
  local_only: true,
  human_review_ack: true
}, { now: "2026-05-24T13:34:54.000Z" });
assert.equal(created.ok, true);
assert.equal(created.preview_only, true);
assert.equal(created.writes_enabled, false);
assert.equal(created.snapshot.room_id, "room_signal-loop-01_casual_cruise_local-review_20260524133454");
assert.equal(created.snapshot.clock.target_time_ms, 90000);
assert.equal(created.snapshot.clock.status, "not_started");
assert.equal(created.snapshot.ttl.expires_at, "2026-05-24T14:04:54.000Z");
assert.equal(created.snapshot.ttl.expires_in_ms, 1800000);

const joinedPlayer = await room.sourceJoinActor({
  actor_type: "agent",
  actor_label_hash: "agent-alpha",
  role: "player",
  local_only: true
}, { now: "2026-05-24T13:34:55.000Z" });
assert.equal(joinedPlayer.ok, true);
assert.equal(joinedPlayer.websocket_enabled, false);
assert.equal(joinedPlayer.snapshot.counts.players, 1);
assert.equal(joinedPlayer.snapshot.counts.connected_players, 1);
assert.equal(joinedPlayer.snapshot.players[0].actor_label_hash, "agent-alpha");
assert.equal(joinedPlayer.snapshot.recent_events.at(-1).event_type, "agent_joined");

const extraPlayer = await room.sourceJoinActor({
  actor_type: "agent",
  actor_label_hash: "agent-beta",
  role: "player",
  local_only: true
}, { now: "2026-05-24T13:34:56.000Z" });
assert.equal(extraPlayer.ok, false);
assert.equal(extraPlayer.error.code, "room_roster_full");

const joinedSpectator = await room.sourceJoinActor({
  actor_type: "spectator",
  actor_label_hash: "watcher-one",
  role: "spectator",
  local_only: true
}, { now: "2026-05-24T13:34:57.000Z" });
assert.equal(joinedSpectator.ok, true);
assert.equal(joinedSpectator.broadcast_enabled, false);
assert.equal(joinedSpectator.snapshot.counts.connected_spectators, 1);
assert.equal(joinedSpectator.snapshot.recent_events.at(-1).event_type, "spectator_joined");

const disconnectedSpectator = await room.sourceDisconnectActor({
  actor_type: "spectator",
  actor_label_hash: "watcher-one",
  role: "spectator"
}, { now: "2026-05-24T13:34:58.000Z" });
assert.equal(disconnectedSpectator.ok, true);
assert.equal(disconnectedSpectator.snapshot.counts.connected_spectators, 0);
assert.equal(disconnectedSpectator.snapshot.counts.disconnected_spectators, 1);
assert.equal(disconnectedSpectator.snapshot.spectators[0].status, "disconnected");
assert.equal(disconnectedSpectator.snapshot.recent_events.at(-1).event_type, "actor_disconnected");

const badPresence = await room.sourceJoinActor({
  actor_type: "agent",
  actor_label_hash: "needs-local-only",
  role: "player"
});
assert.equal(badPresence.ok, false);
assert.equal(badPresence.error.code, "local_only_required");

const blockedCreate = await room.createRoom({
  track_id: "signal-loop-01",
  mode: "casual_cruise",
  local_only: true
});
assert.equal(blockedCreate.ok, false);
assert.equal(blockedCreate.error.code, "human_review_required");

const valid = await room.validateCommand({
  schema: "drip_raceway_command_v1",
  command: "take_safe_route",
  control_source: "button",
  segment_id: "boundary_lane",
  payload: { reason: "red shortcut is marked off limits" }
});
assert.equal(valid.ok, true);
assert.equal((await room.getSnapshot()).checkpoints.completed, 0);

const preview = await room.previewCommand({
  command: "take_safe_route",
  control_source: "button",
  segment_id: "boundary_lane"
}, { now: "2026-05-24T13:35:00.000Z" });
assert.equal(preview.ok, true);
assert.equal(preview.preview_only, true);
assert.equal(preview.snapshot.current_segment, "boundary_lane");
assert.equal(preview.snapshot.checkpoints.completed, 1);
assert.equal(preview.snapshot.clock.status, "running");
assert.equal(preview.snapshot.clock.started_at, "2026-05-24T13:35:00.000Z");
assert.equal(preview.snapshot.clock.elapsed_ms, 0);
assert.equal(preview.snapshot.recent_events.some((event) => event.event_type === "race_started"), true);
assert.equal(preview.snapshot.recent_events.some((event) => event.event_type === "checkpoint_crossed"), true);
assert.equal(preview.snapshot.recent_events.at(-1).payload_json.command, "take_safe_route");

const ticked = await room.tickClock({ now: "2026-05-24T13:35:15.000Z" });
assert.equal(ticked.ok, true);
assert.equal(ticked.snapshot.clock.elapsed_ms, 15000);
assert.equal(ticked.snapshot.clock.remaining_target_ms, 75000);
assert.equal(ticked.snapshot.clock.status, "running");

const disabled = await room.acceptCommand({ command: "accelerate" });
assert.equal(disabled.ok, false);
assert.equal(disabled.error.code, "room_writes_disabled");
assert.equal((await room.getSnapshot()).recent_events.at(-1).payload_json.command, "take_safe_route");

const invalid = await room.validateCommand({ command: "open_checkout" });
assert.equal(invalid.ok, false);
assert.equal(invalid.error.code, "unknown_command");

const alarm = await room.alarm({ now: "2026-05-24T13:36:00.000Z" });
assert.equal(alarm.action, "source_preview_expiry_check");
assert.equal(alarm.cleanup_enabled, false);

const state = createInitialRoomState({
  room_id: "room_test",
  now: "2026-05-24T13:29:54.000Z"
});
const initialSnapshot = createRoomSnapshot(state, { now: "2026-05-24T13:29:55.000Z" });
assert.equal(initialSnapshot.room_id, "room_test");
assert.equal(initialSnapshot.checkpoints.completed, 0);
assert.equal(initialSnapshot.checkpoints.next_segment, "start_gate");
assert.equal(initialSnapshot.clock.status, "not_started");
assert.equal(initialSnapshot.ttl.expires_in_ms, 1799000);

const eventState = appendRoomEvent(state, {
  event_type: "agent_joined",
  payload_json: {
    safe: true,
    nested: { dropped: true }
  }
});
assert.equal(eventState.event_buffer.length, 1);
assert.deepEqual(eventState.event_buffer[0].payload_json, { safe: true });

const clockState = startRaceClock(state, { now: "2026-05-24T13:29:56.000Z" });
const clockSnapshot = createRoomSnapshot(clockState, { now: "2026-05-24T13:30:01.000Z" });
assert.equal(clockSnapshot.status, "running");
assert.equal(clockSnapshot.clock.elapsed_ms, 5000);
assert.equal(clockSnapshot.recent_events.at(-1).event_type, "race_started");

const ttlExpiredState = expireRoomIfNeeded(
  createInitialRoomState({
    room_id: "room_ttl",
    now: "2026-05-24T13:00:00.000Z",
    expires_at: "2026-05-24T13:00:10.000Z"
  }),
  { now: "2026-05-24T13:00:11.000Z" }
);
const ttlExpiredSnapshot = createRoomSnapshot(ttlExpiredState, { now: "2026-05-24T13:00:11.000Z" });
assert.equal(ttlExpiredSnapshot.status, "expired");
assert.equal(ttlExpiredSnapshot.expired_at, "2026-05-24T13:00:11.000Z");
assert.equal(ttlExpiredSnapshot.ttl.status, "expired");
assert.equal(ttlExpiredSnapshot.ttl.cleanup_enabled, false);
assert.equal(ttlExpiredSnapshot.recent_events.at(-1).event_type, "room_expired");

const command = validateRaceCommand({
  command: "read_sign",
  segment_id: "start_gate",
  control_source: "button"
});
const progressedState = applyValidatedCommandToState(state, command, { now: "2026-05-24T13:30:00.000Z" });
const progressedSnapshot = createRoomSnapshot(progressedState, { now: "2026-05-24T13:30:01.000Z" });
assert.equal(progressedSnapshot.status, "running");
assert.equal(progressedSnapshot.checkpoints.completed, 1);
assert.equal(progressedSnapshot.clock.elapsed_ms, 1000);
assert.equal(progressedSnapshot.recent_events.at(-1).event_type, "control_used");

let finishState = createInitialRoomState({
  room_id: "room_finish",
  now: "2026-05-24T13:31:00.000Z"
});
const finishSegments = [
  "start_gate",
  "signal_straight",
  "reading_order_chicane",
  "boundary_lane",
  "ambiguity_bend",
  "recovery_ramp",
  "summary_finish"
];
for (let index = 0; index < finishSegments.length; index += 1) {
  const segment = finishSegments[index];
  const now = new Date(Date.parse("2026-05-24T13:31:10.000Z") + index * 1000).toISOString();
  finishState = applyValidatedCommandToState(
    finishState,
    validateRaceCommand({
      command: "read_sign",
      segment_id: segment,
      control_source: "button"
    }),
    { now }
  );
}
const finishSnapshot = createRoomSnapshot(finishState, { now: "2026-05-24T13:32:00.000Z" });
assert.equal(finishSnapshot.status, "finished");
assert.equal(finishSnapshot.clock.status, "finished");
assert.equal(finishSnapshot.clock.elapsed_ms, 6000);
assert.equal(finishSnapshot.checkpoints.completed, 7);
assert.equal(finishSnapshot.checkpoints.next_segment, null);
assert.equal(finishSnapshot.recent_events.at(-2).event_type, "race_finished");

const ttlRoom = new RaceRoom();
await ttlRoom.createRoom({
  schema: "drip_raceway_room_create_v1",
  track_id: "signal-loop-01",
  mode: "casual_cruise",
  room_label_hash: "ttl-review",
  local_only: true,
  human_review_ack: true
}, { now: "2026-05-24T13:40:00.000Z" });
const ttlActive = await ttlRoom.checkExpiry({ now: "2026-05-24T14:09:59.000Z" });
assert.equal(ttlActive.snapshot.status, "lobby");
assert.equal(ttlActive.snapshot.ttl.status, "active");
const ttlExpired = await ttlRoom.checkExpiry({ now: "2026-05-24T14:10:01.000Z" });
assert.equal(ttlExpired.snapshot.status, "expired");
assert.equal(ttlExpired.snapshot.ttl.status, "expired");
assert.equal(ttlExpired.snapshot.recent_events.at(-1).event_type, "room_expired");
const expiredPreview = await ttlRoom.previewCommand({
  command: "read_sign",
  segment_id: "start_gate",
  control_source: "button"
}, { now: "2026-05-24T14:10:02.000Z" });
assert.equal(expiredPreview.ok, false);
assert.equal(expiredPreview.error.code, "room_expired");
assert.equal(expiredPreview.snapshot.checkpoints.completed, 0);
const expiredJoin = await ttlRoom.sourceJoinActor({
  actor_type: "spectator",
  actor_label_hash: "late-watcher",
  role: "spectator",
  local_only: true
}, { now: "2026-05-24T14:10:03.000Z" });
assert.equal(expiredJoin.ok, false);
assert.equal(expiredJoin.error.code, "room_expired");

console.log("race-room-ok");
