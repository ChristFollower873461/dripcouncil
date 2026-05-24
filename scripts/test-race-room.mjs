import assert from "node:assert/strict";
import { RaceRoom } from "../src/race-api/race-room.mjs";
import {
  appendRoomEvent,
  applyValidatedCommandToState,
  createInitialRoomState,
  createRoomSnapshot
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
assert.equal(sqlStatements.length, 2);

const snapshot = await room.getSnapshot();
assert.equal(snapshot.status, "skeleton");
assert.equal(snapshot.checkpoints.total, 7);
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
});
assert.equal(preview.ok, true);
assert.equal(preview.preview_only, true);
assert.equal(preview.snapshot.current_segment, "boundary_lane");
assert.equal(preview.snapshot.checkpoints.completed, 1);
assert.equal(preview.snapshot.recent_events.at(-1).payload_json.command, "take_safe_route");

const disabled = await room.acceptCommand({ command: "accelerate" });
assert.equal(disabled.ok, false);
assert.equal(disabled.error.code, "room_writes_disabled");
assert.equal((await room.getSnapshot()).recent_events.at(-1).payload_json.command, "take_safe_route");

const invalid = await room.validateCommand({ command: "open_checkout" });
assert.equal(invalid.ok, false);
assert.equal(invalid.error.code, "unknown_command");

const alarm = await room.alarm();
assert.equal(alarm.action, "noop");

const state = createInitialRoomState({
  room_id: "room_test",
  now: "2026-05-24T13:29:54.000Z"
});
const initialSnapshot = createRoomSnapshot(state, { now: "2026-05-24T13:29:55.000Z" });
assert.equal(initialSnapshot.room_id, "room_test");
assert.equal(initialSnapshot.checkpoints.completed, 0);
assert.equal(initialSnapshot.checkpoints.next_segment, "start_gate");

const eventState = appendRoomEvent(state, {
  event_type: "agent_joined",
  payload_json: {
    safe: true,
    nested: { dropped: true }
  }
});
assert.equal(eventState.event_buffer.length, 1);
assert.deepEqual(eventState.event_buffer[0].payload_json, { safe: true });

const command = validateRaceCommand({
  command: "read_sign",
  segment_id: "start_gate",
  control_source: "button"
});
const progressedState = applyValidatedCommandToState(state, command, { now: "2026-05-24T13:30:00.000Z" });
const progressedSnapshot = createRoomSnapshot(progressedState, { now: "2026-05-24T13:30:01.000Z" });
assert.equal(progressedSnapshot.status, "running");
assert.equal(progressedSnapshot.checkpoints.completed, 1);
assert.equal(progressedSnapshot.recent_events.at(-1).event_type, "control_used");

console.log("race-room-ok");
