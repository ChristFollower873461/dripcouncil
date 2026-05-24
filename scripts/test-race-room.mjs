import assert from "node:assert/strict";
import { RaceRoom } from "../src/race-api/race-room.mjs";

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

const valid = await room.validateCommand({
  schema: "drip_raceway_command_v1",
  command: "take_safe_route",
  control_source: "button",
  segment_id: "boundary_lane",
  payload: { reason: "red shortcut is marked off limits" }
});
assert.equal(valid.ok, true);

const disabled = await room.acceptCommand({ command: "accelerate" });
assert.equal(disabled.ok, false);
assert.equal(disabled.error.code, "room_writes_disabled");

const invalid = await room.validateCommand({ command: "open_checkout" });
assert.equal(invalid.ok, false);
assert.equal(invalid.error.code, "unknown_command");

const alarm = await room.alarm();
assert.equal(alarm.action, "noop");

console.log("race-room-ok");
