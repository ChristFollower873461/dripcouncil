import { RATE_LIMIT_PLACEHOLDER, TRACKS } from "./data.mjs";

export const ROOM_STATE_SCHEMA = "drip_raceway_room_state_v1";
export const ROOM_SNAPSHOT_SCHEMA = "drip_raceway_room_snapshot_v1";

const DEFAULT_ROOM_ID = "unbound-preview-room";
const DEFAULT_TRACK = TRACKS[0];
const DEFAULT_MODE = "casual_cruise";
const MAX_EVENT_BUFFER = 60;
const DEFAULT_TARGET_TIME_MS = 90_000;
const ACTOR_LABEL_HASH_PATTERN = /^[a-z0-9_.:-]{1,96}$/i;
const ALLOWED_ACTOR_TYPES = new Set(["agent", "human", "spectator"]);
const ALLOWED_ROLES = new Set(["player", "spectator"]);

export function createInitialRoomState(options = {}) {
  const now = options.now || new Date().toISOString();
  const track = TRACKS.find((item) => item.id === (options.track_id || DEFAULT_TRACK.id)) || DEFAULT_TRACK;

  return {
    schema: ROOM_STATE_SCHEMA,
    room_id: options.room_id || DEFAULT_ROOM_ID,
    track_id: track.id,
    mode: options.mode || DEFAULT_MODE,
    status: "lobby",
    created_at: now,
    expires_at: options.expires_at || addMinutes(now, RATE_LIMIT_PLACEHOLDER.planned_limits.room_ttl_minutes),
    expired_at: null,
    started_at: null,
    finished_at: null,
    last_activity_at: now,
    clock: {
      status: "not_started",
      target_time_ms: getTargetTimeMs(track),
      elapsed_ms: 0,
      remaining_target_ms: getTargetTimeMs(track),
      over_target: false,
      started_at: null,
      finished_at: null,
      last_tick_at: null,
      tick_count: 0
    },
    current_segment: track.segments[0],
    players: [],
    spectators: [],
    checkpoints_completed: [],
    scores: {
      safety: 100,
      curiosity: 50,
      recovery: 50,
      honesty: null
    },
    event_buffer: []
  };
}

export function createRoomSnapshot(state, options = {}) {
  const track = TRACKS.find((item) => item.id === state.track_id) || DEFAULT_TRACK;
  const now = options.now || new Date().toISOString();
  const completed = state.checkpoints_completed.filter((segment) => track.segments.includes(segment));
  const remaining = track.segments.filter((segment) => !completed.includes(segment));

  return {
    schema: ROOM_SNAPSHOT_SCHEMA,
    ok: true,
    room_id: state.room_id,
    track_id: state.track_id,
    mode: state.mode,
    status: state.status,
    generated_at: now,
    created_at: state.created_at,
    expires_at: state.expires_at,
    expired_at: state.expired_at || null,
    started_at: state.started_at,
    finished_at: state.finished_at,
    last_activity_at: state.last_activity_at,
    ttl: buildTtlSnapshot(state, now),
    clock: buildClockSnapshot(state, now, track),
    current_segment: state.current_segment,
    players: state.players.map(redactActor),
    spectators: state.spectators.map(redactActor),
    counts: {
      players: state.players.length,
      spectators: state.spectators.length,
      connected_players: state.players.filter((actor) => actor.status !== "disconnected").length,
      connected_spectators: state.spectators.filter((actor) => actor.status !== "disconnected").length,
      disconnected_players: state.players.filter((actor) => actor.status === "disconnected").length,
      disconnected_spectators: state.spectators.filter((actor) => actor.status === "disconnected").length,
      buffered_events: state.event_buffer.length
    },
    checkpoints: {
      completed: completed.length,
      total: track.segments.length,
      completed_segments: completed,
      next_segment: remaining[0] || null
    },
    scores: { ...state.scores },
    recent_events: state.event_buffer.slice(-12).map((event) => ({ ...event, payload_json: { ...event.payload_json } })),
    safety: {
      live_rooms_enabled: false,
      accepts_agent_writes: false,
      stores_private_prompts: false,
      publishes_leaderboard: false,
      accepts_payment_actions: false,
      human_review_required: true
    }
  };
}

export function appendRoomEvent(state, event, options = {}) {
  const now = options.now || new Date().toISOString();
  const next = cloneState(state);
  const safeEvent = {
    event_id: event.event_id || `evt_${String(next.event_buffer.length + 1).padStart(4, "0")}`,
    event_type: event.event_type,
    created_at: event.created_at || now,
    actor_type: event.actor_type || "system",
    control_source: event.control_source || "none",
    segment_id: event.segment_id || next.current_segment,
    payload_json: sanitizePayload(event.payload_json || {})
  };

  next.last_activity_at = now;
  next.event_buffer = [...next.event_buffer, safeEvent].slice(-MAX_EVENT_BUFFER);
  return next;
}

export function addRoomActor(state, input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  let next = expireRoomIfNeeded(state, { now });
  if (next.status === "expired") {
    return invalidActorResult("room_expired", "Expired room previews cannot accept presence changes.", next);
  }

  const validation = normalizeRoomActor(input);
  if (!validation.ok) return { ...validation, state };

  next = cloneState(next);
  const actor = validation.actor;
  const rosterKey = actor.role === "spectator" ? "spectators" : "players";
  const maxAllowed = actor.role === "spectator"
    ? RATE_LIMIT_PLACEHOLDER.planned_limits.max_spectators_per_room
    : RATE_LIMIT_PLACEHOLDER.planned_limits.max_players_per_room;
  const existingIndex = next[rosterKey].findIndex((item) => item.actor_label_hash === actor.actor_label_hash);
  const connectedCount = next[rosterKey].filter((item, index) => item.status !== "disconnected" && index !== existingIndex).length;

  if (connectedCount >= maxAllowed) {
    return invalidActorResult("room_roster_full", "This source-preview room has reached its planned roster limit.", next, {
      role: actor.role,
      max_allowed: maxAllowed
    });
  }

  const nextActor = {
    actor_type: actor.actor_type,
    actor_label_hash: actor.actor_label_hash,
    role: actor.role,
    joined_at: existingIndex >= 0 ? next[rosterKey][existingIndex].joined_at : now,
    last_seen_at: now,
    disconnected_at: null,
    status: "connected"
  };
  if (existingIndex >= 0) {
    next[rosterKey][existingIndex] = nextActor;
  } else {
    next[rosterKey] = [...next[rosterKey], nextActor];
  }

  next = appendRoomEvent(
    next,
    {
      event_type: actor.role === "spectator" ? "spectator_joined" : "agent_joined",
      created_at: now,
      actor_type: actor.actor_type,
      control_source: "none",
      segment_id: next.current_segment,
      payload_json: {
        actor_label_hash: actor.actor_label_hash,
        role: actor.role,
        local_only: true
      }
    },
    { now }
  );

  return {
    ok: true,
    state: next,
    actor: nextActor
  };
}

export function disconnectRoomActor(state, input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const validation = normalizeRoomActor(input, { requireLocalOnly: false });
  if (!validation.ok) return { ...validation, state };

  let next = cloneState(state);
  const actor = validation.actor;
  const rosterKey = actor.role === "spectator" ? "spectators" : "players";
  const existingIndex = next[rosterKey].findIndex((item) => item.actor_label_hash === actor.actor_label_hash);
  if (existingIndex < 0) {
    return invalidActorResult("actor_not_found", "That actor is not present in this source-preview room.", next, {
      role: actor.role
    });
  }

  const existing = next[rosterKey][existingIndex];
  next[rosterKey][existingIndex] = {
    ...existing,
    last_seen_at: now,
    disconnected_at: now,
    status: "disconnected"
  };
  next = appendRoomEvent(
    next,
    {
      event_type: "actor_disconnected",
      created_at: now,
      actor_type: existing.actor_type,
      control_source: "none",
      segment_id: next.current_segment,
      payload_json: {
        actor_label_hash: existing.actor_label_hash,
        role: existing.role,
        graceful: true,
        local_only: true
      }
    },
    { now }
  );

  return {
    ok: true,
    state: next,
    actor: next[rosterKey][existingIndex]
  };
}

export function applyValidatedCommandToState(state, validation, options = {}) {
  if (!validation.ok) return state;

  const command = validation.command;
  const now = options.now || new Date().toISOString();
  let next = expireRoomIfNeeded(state, { now });
  if (next.status === "expired") return next;

  next = startRaceClock(next, { now });
  next.current_segment = command.segment_id;

  if (["read_sign", "take_safe_route", "recover", "yield"].includes(command.command)) {
    next = completeCheckpoint(next, command.segment_id, now);
  }

  next = appendRoomEvent(
    next,
    {
      event_type: "control_used",
      created_at: now,
      actor_type: command.actor_type,
      control_source: command.control_source,
      segment_id: command.segment_id,
      payload_json: {
        command: command.command,
        local_event_id: command.local_event_id,
        local_only: true
      }
    },
    { now }
  );

  return next;
}

export function startRaceClock(state, options = {}) {
  const now = options.now || new Date().toISOString();
  let next = expireRoomIfNeeded(state, { now });
  if (next.status === "expired") return next;
  next = cloneState(next);

  if (!next.started_at) {
    next.status = "running";
    next.started_at = now;
    next.last_activity_at = now;
    next = appendRoomEvent(
      next,
      {
        event_type: "race_started",
        created_at: now,
        actor_type: "system",
        control_source: "none",
        segment_id: next.current_segment,
        payload_json: {
          local_only: true,
          source_preview: true
        }
      },
      { now }
    );
  } else if (!next.finished_at && ["lobby", "skeleton"].includes(next.status)) {
    next.status = "running";
  }

  return advanceRaceClock(next, { now });
}

export function advanceRaceClock(state, options = {}) {
  const now = options.now || new Date().toISOString();
  let next = expireRoomIfNeeded(state, { now });
  if (next.status === "expired") return next;
  next = cloneState(next);

  const track = TRACKS.find((item) => item.id === next.track_id) || DEFAULT_TRACK;
  const previousTicks = next.clock?.tick_count || 0;
  next.clock = {
    ...buildClockSnapshot(next, now, track),
    last_tick_at: now,
    tick_count: previousTicks + 1
  };
  next.last_activity_at = now;
  return next;
}

export function expireRoomIfNeeded(state, options = {}) {
  const now = options.now || new Date().toISOString();
  const ttl = buildTtlSnapshot(state, now);
  if (!ttl.expired || ["expired", "finished"].includes(state.status)) {
    return state;
  }

  let next = cloneState(state);
  next.status = "expired";
  next.expired_at = now;
  next.last_activity_at = now;
  next = appendRoomEvent(
    next,
    {
      event_type: "room_expired",
      created_at: now,
      actor_type: "system",
      control_source: "none",
      segment_id: next.current_segment,
      payload_json: {
        expired_by_ms: ttl.expired_by_ms,
        cleanup_enabled: false,
        local_only: true
      }
    },
    { now }
  );
  return next;
}

export function completeCheckpoint(state, segmentId, now = new Date().toISOString()) {
  const track = TRACKS.find((item) => item.id === state.track_id) || DEFAULT_TRACK;
  if (!track.segments.includes(segmentId) || state.checkpoints_completed.includes(segmentId)) {
    return state;
  }

  let next = cloneState(state);
  next.current_segment = segmentId;
  next.checkpoints_completed = [...next.checkpoints_completed, segmentId];
  next.last_activity_at = now;
  const completedCount = next.checkpoints_completed.length;
  if (next.checkpoints_completed.length === track.segments.length) {
    next.status = "finished";
    next.finished_at = now;
  }
  next = advanceRaceClock(next, { now });
  next = appendRoomEvent(
    next,
    {
      event_type: "checkpoint_crossed",
      created_at: now,
      actor_type: "system",
      control_source: "none",
      segment_id: segmentId,
      payload_json: {
        checkpoint_index: completedCount,
        total_checkpoints: track.segments.length,
        elapsed_ms: next.clock.elapsed_ms,
        local_only: true
      }
    },
    { now }
  );
  if (next.finished_at) {
    next = appendRoomEvent(
      next,
      {
        event_type: "lap_completed",
        created_at: now,
        actor_type: "system",
        control_source: "none",
        segment_id: segmentId,
        payload_json: {
          elapsed_ms: next.clock.elapsed_ms,
          local_only: true
        }
      },
      { now }
    );
    next = appendRoomEvent(
      next,
      {
        event_type: "race_finished",
        created_at: now,
        actor_type: "system",
        control_source: "none",
        segment_id: segmentId,
        payload_json: {
          elapsed_ms: next.clock.elapsed_ms,
          human_review_required: true,
          local_only: true
        }
      },
      { now }
    );
  }
  return next;
}

function cloneState(state) {
  return {
    ...state,
    players: state.players.map((actor) => ({ ...actor })),
    spectators: state.spectators.map((actor) => ({ ...actor })),
    checkpoints_completed: [...state.checkpoints_completed],
    clock: { ...(state.clock || {}) },
    scores: { ...state.scores },
    event_buffer: state.event_buffer.map((event) => ({ ...event, payload_json: { ...event.payload_json } }))
  };
}

function buildClockSnapshot(state, now, track) {
  const startedAt = state.started_at || null;
  const finishedAt = state.finished_at || null;
  const startMs = startedAt ? Date.parse(startedAt) : null;
  const stopMs = finishedAt ? Date.parse(finishedAt) : Date.parse(now);
  const elapsedMs = Number.isFinite(startMs) && Number.isFinite(stopMs) ? Math.max(0, stopMs - startMs) : 0;
  const targetTimeMs = getTargetTimeMs(track);
  const status = finishedAt ? "finished" : startedAt ? "running" : "not_started";

  return {
    status,
    target_time_ms: targetTimeMs,
    elapsed_ms: elapsedMs,
    remaining_target_ms: Math.max(0, targetTimeMs - elapsedMs),
    over_target: elapsedMs > targetTimeMs,
    started_at: startedAt,
    finished_at: finishedAt,
    last_tick_at: state.clock?.last_tick_at || null,
    tick_count: state.clock?.tick_count || 0
  };
}

function buildTtlSnapshot(state, now) {
  const nowMs = Date.parse(now);
  const expiresMs = Date.parse(state.expires_at);
  const expired = Number.isFinite(nowMs) && Number.isFinite(expiresMs) && nowMs >= expiresMs;
  return {
    status: expired ? "expired" : "active",
    expired,
    ttl_minutes: RATE_LIMIT_PLACEHOLDER.planned_limits.room_ttl_minutes,
    expires_at: state.expires_at,
    expired_at: state.expired_at || null,
    expires_in_ms: expired ? 0 : Math.max(0, expiresMs - nowMs),
    expired_by_ms: expired ? Math.max(0, nowMs - expiresMs) : 0,
    cleanup_enabled: false,
    public_cleanup_enabled: false
  };
}

function getTargetTimeMs(track) {
  return (track.target_time_seconds || DEFAULT_TARGET_TIME_MS / 1000) * 1000;
}

function normalizeRoomActor(input, options = {}) {
  if (!isPlainObject(input)) {
    return invalidActorResult("invalid_actor_envelope", "Room actors must be small JSON objects.");
  }

  const role = input.role || (input.actor_type === "spectator" ? "spectator" : "player");
  if (!ALLOWED_ROLES.has(role)) {
    return invalidActorResult("unknown_actor_role", "Room actor role must be player or spectator.", null, {
      allowed_roles: [...ALLOWED_ROLES]
    });
  }

  const actorType = input.actor_type || (role === "spectator" ? "spectator" : "agent");
  if (!ALLOWED_ACTOR_TYPES.has(actorType)) {
    return invalidActorResult("unknown_presence_actor_type", "Room actor type must be agent, human, or spectator.", null, {
      allowed_actor_types: [...ALLOWED_ACTOR_TYPES]
    });
  }

  if (!input.actor_label_hash || !ACTOR_LABEL_HASH_PATTERN.test(input.actor_label_hash)) {
    return invalidActorResult("invalid_actor_label_hash", "Room presence only accepts anonymous machine-readable actor label hashes.");
  }

  if (options.requireLocalOnly !== false && input.local_only !== true) {
    return invalidActorResult("local_only_required", "Room presence changes must acknowledge source-preview local-only status.");
  }

  return {
    ok: true,
    actor: {
      actor_type: actorType,
      actor_label_hash: input.actor_label_hash,
      role
    }
  };
}

function invalidActorResult(code, message, state = null, details = {}) {
  return {
    ok: false,
    state,
    error: {
      code,
      message,
      details
    }
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function redactActor(actor) {
  return {
    actor_type: actor.actor_type || "agent",
    role: actor.role || "player",
    actor_label_hash: actor.actor_label_hash || "anonymous",
    joined_at: actor.joined_at || null,
    last_seen_at: actor.last_seen_at || null,
    disconnected_at: actor.disconnected_at || null,
    status: actor.status || "connected"
  };
}

function sanitizePayload(payload) {
  const result = {};
  for (const [key, value] of Object.entries(payload)) {
    if (["string", "number", "boolean"].includes(typeof value) || value === null) {
      result[key] = value;
    }
  }
  return result;
}

function addMinutes(iso, minutes) {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}
