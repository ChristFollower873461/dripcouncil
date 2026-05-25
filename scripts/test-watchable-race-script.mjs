import assert from "node:assert/strict";
import { SIGNAL_CIRCUIT_WATCHABLE_RACE as race } from "../src/watchable-race/signal-circuit.mjs";

const REQUIRED_EVENT_FIELDS = [
  "race_id",
  "elapsed_ms",
  "agent_id",
  "segment_id",
  "event_type",
  "visible_label",
  "commentary",
  "score_delta",
  "learning_tag"
];

assert.equal(race.schema, "drip_raceway_watchable_race_v1");
assert.equal(race.runtime_ms, 45000);
assert.equal(race.safety.local_only, true);
assert.equal(race.safety.backend_writes_enabled, false);
assert.equal(race.safety.hidden_telemetry_enabled, false);
assert.equal(race.safety.real_model_claims, false);
assert.equal(race.racers.length, 4, "watchable prototype needs four racers");
assert.equal(race.segments.length, 6, "Signal Circuit should stay narrow and complete");
assert.ok(race.events.length >= 24, "static script needs enough beats to stay watchable");

const racerIds = new Set(race.racers.map((racer) => racer.id));
const segmentIds = new Set(race.segments.map((segment) => segment.id));
const eventIds = new Set();
const meaningfulEventsByRacer = new Map([...racerIds].map((id) => [id, 0]));

let previousElapsed = -1;
for (const event of race.events) {
  for (const field of REQUIRED_EVENT_FIELDS) {
    assert.ok(Object.hasOwn(event, field), `${event.event_id || "event"} missing ${field}`);
  }

  assert.equal(event.race_id, race.race_id, `${event.event_id} uses wrong race id`);
  assert.ok(!eventIds.has(event.event_id), `duplicate event id ${event.event_id}`);
  eventIds.add(event.event_id);
  assert.ok(event.elapsed_ms >= previousElapsed, `${event.event_id} is out of order`);
  previousElapsed = event.elapsed_ms;
  assert.ok(event.elapsed_ms >= 0 && event.elapsed_ms <= race.runtime_ms, `${event.event_id} outside runtime`);
  assert.ok(segmentIds.has(event.segment_id), `${event.event_id} uses unknown segment ${event.segment_id}`);
  assert.equal(typeof event.commentary, "string", `${event.event_id} commentary must be text`);
  assert.ok(event.commentary.length >= 20, `${event.event_id} commentary should be useful`);
  assert.ok(!/claude|grok|openai|anthropic|gemini/i.test(event.commentary), `${event.event_id} must not imply real model results`);

  if (racerIds.has(event.agent_id) && event.event_type !== "finish_crossed") {
    meaningfulEventsByRacer.set(event.agent_id, meaningfulEventsByRacer.get(event.agent_id) + 1);
  }
}

for (const [racerId, count] of meaningfulEventsByRacer) {
  assert.ok(count >= 4, `${racerId} needs at least four meaningful race events`);
}

for (const racerId of racerIds) {
  assert.ok(Array.isArray(race.keyframes[racerId]), `${racerId} needs animation keyframes`);
  assert.ok(race.keyframes[racerId].length >= 6, `${racerId} needs enough keyframes for the full run`);
}

assert.ok(race.events.some((event) => event.event_type === "unsafe_shortcut_rejected"), "script needs a rejected shortcut");
assert.ok(race.events.some((event) => event.event_type === "unsafe_shortcut_taken"), "script needs a taken shortcut");
assert.ok(race.events.some((event) => event.event_type === "hazard_hit"), "taken shortcut should be visibly punished");
assert.ok(race.events.some((event) => event.event_type === "uncertainty_disclosed" && event.score_delta.honesty > 0), "uncertainty disclosure should be rewarded");
assert.ok(race.events.some((event) => event.event_type === "recovery_started"), "script needs recovery start");
assert.ok(race.events.some((event) => event.event_type === "recovery_completed"), "script needs recovery completion");
assert.equal(race.events.at(-1).event_type, "learning_summary_created", "final event should create the learning summary");

assert.ok(racerIds.has(race.finish.physical_winner), "physical winner must be a racer");
assert.ok(racerIds.has(race.finish.council_winner), "Council winner must be a racer");
assert.notEqual(race.finish.physical_winner, race.finish.council_winner, "race rank and Council rank should create useful tension");
assert.ok(race.finish.cited_event_ids.length >= 3, "finish card must cite at least three events");
for (const eventId of race.finish.cited_event_ids) {
  assert.ok(eventIds.has(eventId), `finish cites missing event ${eventId}`);
}

const totalWeight = Object.values(race.scoring.weights).reduce((sum, value) => sum + value, 0);
assert.ok(Math.abs(totalWeight - 1) < 0.00001, "score weights must sum to 1");

console.log("watchable-race-script-ok");
