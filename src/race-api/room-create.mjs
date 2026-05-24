import { RATE_LIMIT_PLACEHOLDER, TRACKS } from "./data.mjs";

export const ROOM_CREATE_SCHEMA = "drip_raceway_room_create_v1";
export const MAX_ROOM_CREATE_BYTES = 1024;

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "schema",
  "track_id",
  "mode",
  "created_by_type",
  "room_label_hash",
  "local_only",
  "human_review_ack"
]);

const ALLOWED_MODES = new Set([
  "casual_cruise",
  "eval_sprint",
  "safety_slalom",
  "reading_order_rally",
  "recovery_lap"
]);

const ALLOWED_CREATOR_TYPES = new Set(["agent", "human"]);
const HASH_PATTERN = /^[a-z0-9_.:-]{1,96}$/i;

export function validateRoomCreate(input) {
  if (!isPlainObject(input)) {
    return invalid("invalid_room_create_envelope", "Room creation requests must be JSON objects.");
  }

  const serialized = JSON.stringify(input);
  if (serialized.length > MAX_ROOM_CREATE_BYTES) {
    return invalid("room_create_too_large", "Room creation requests are capped before public writes are enabled.", {
      max_bytes: MAX_ROOM_CREATE_BYTES
    });
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      return invalid("unknown_room_create_field", "Room creation only accepts documented fields.", {
        field: key,
        allowed_fields: [...ALLOWED_TOP_LEVEL_KEYS]
      });
    }
  }

  if (input.schema !== undefined && input.schema !== ROOM_CREATE_SCHEMA) {
    return invalid("unknown_room_create_schema", "Room creation requests must use the documented schema.", {
      expected_schema: ROOM_CREATE_SCHEMA
    });
  }

  const trackId = input.track_id || "signal-loop-01";
  const track = TRACKS.find((item) => item.id === trackId);
  if (!track) {
    return invalid("unknown_room_track", "Room creation must target a public race track.", {
      track_id: trackId,
      allowed_track_ids: TRACKS.map((item) => item.id)
    });
  }

  const mode = input.mode || "casual_cruise";
  if (!ALLOWED_MODES.has(mode)) {
    return invalid("unknown_room_mode", "Room creation must use a supported race mode.", {
      mode,
      allowed_modes: [...ALLOWED_MODES]
    });
  }

  const createdByType = input.created_by_type || "human";
  if (!ALLOWED_CREATOR_TYPES.has(createdByType)) {
    return invalid("unknown_room_creator", "Room creator type must be agent or human.", {
      allowed_creator_types: [...ALLOWED_CREATOR_TYPES]
    });
  }

  if (input.room_label_hash !== undefined && !HASH_PATTERN.test(input.room_label_hash)) {
    return invalid("invalid_room_label_hash", "Room labels must be hashed or anonymous machine-readable identifiers.");
  }

  if (input.local_only !== true) {
    return invalid("local_only_required", "Room creation must acknowledge local-only preview status until public writes are reviewed.");
  }

  if (input.human_review_ack !== true) {
    return invalid("human_review_required", "Room creation must acknowledge human review before public launch.");
  }

  return {
    ok: true,
    room: {
      schema: ROOM_CREATE_SCHEMA,
      track_id: track.id,
      mode,
      created_by_type: createdByType,
      room_label_hash: input.room_label_hash || "anonymous",
      local_only: true,
      human_review_ack: true,
      ttl_minutes: RATE_LIMIT_PLACEHOLDER.planned_limits.room_ttl_minutes
    }
  };
}

export async function readRoomCreateBody(request) {
  const text = await request.text();
  if (!text.trim()) {
    return invalid("empty_room_create_body", "Room creation requests must include a JSON body.");
  }
  if (text.length > MAX_ROOM_CREATE_BYTES) {
    return invalid("room_create_too_large", "Room creation request bodies are capped before public writes are enabled.", {
      max_bytes: MAX_ROOM_CREATE_BYTES
    });
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return invalid("invalid_room_create_json", "Room creation requests must be valid JSON.");
  }
}

export function buildLocalRoomId(room, now = new Date().toISOString()) {
  const stamp = now.replace(/[^0-9]/g, "").slice(0, 14);
  return `room_${room.track_id}_${room.mode}_${room.room_label_hash}_${stamp}`;
}

function invalid(code, message, details = {}) {
  return {
    ok: false,
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
