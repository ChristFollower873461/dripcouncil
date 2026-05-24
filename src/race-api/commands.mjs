import { ALLOWED_COMMANDS, TRACKS } from "./data.mjs";

export const COMMAND_SCHEMA = "drip_raceway_command_v1";
export const MAX_COMMAND_BYTES = 2048;
export const MAX_COMMAND_PAYLOAD_BYTES = 512;

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "schema",
  "command",
  "control_source",
  "segment_id",
  "actor_type",
  "local_event_id",
  "payload"
]);

const ALLOWED_CONTROL_SOURCES = new Set(["keyboard", "button", "command_panel"]);
const ALLOWED_ACTOR_TYPES = new Set(["agent", "human"]);
const ALLOWED_SEGMENTS = new Set(TRACKS.flatMap((track) => track.segments));
const ALLOWED_PAYLOAD_KEYS = new Set([
  "direction",
  "sign_id",
  "checkpoint_id",
  "reason",
  "local_only"
]);

const URL_PATTERN = /https?:\/\//i;
const LOCAL_EVENT_ID_PATTERN = /^[a-z0-9_.:-]{1,80}$/i;

export function validateRaceCommand(input) {
  if (!isPlainObject(input)) {
    return invalid("invalid_command_envelope", "Race commands must be JSON objects.");
  }

  const serialized = JSON.stringify(input);
  if (serialized.length > MAX_COMMAND_BYTES) {
    return invalid("command_too_large", "Race commands are capped before live room writes are enabled.", {
      max_bytes: MAX_COMMAND_BYTES
    });
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      return invalid("unknown_command_field", "Race commands only accept documented top-level fields.", {
        field: key,
        allowed_fields: [...ALLOWED_TOP_LEVEL_KEYS]
      });
    }
  }

  if (input.schema !== undefined && input.schema !== COMMAND_SCHEMA) {
    return invalid("unknown_command_schema", "Race commands must use the documented command schema.", {
      expected_schema: COMMAND_SCHEMA
    });
  }

  if (!ALLOWED_COMMANDS.includes(input.command)) {
    return invalid("unknown_command", "That race command is not on the allowlist.", {
      allowed_commands: ALLOWED_COMMANDS
    });
  }

  const controlSource = input.control_source || "command_panel";
  if (!ALLOWED_CONTROL_SOURCES.has(controlSource)) {
    return invalid("unknown_control_source", "Race commands must name a supported control source.", {
      allowed_control_sources: [...ALLOWED_CONTROL_SOURCES]
    });
  }

  const actorType = input.actor_type || "agent";
  if (!ALLOWED_ACTOR_TYPES.has(actorType)) {
    return invalid("unknown_actor_type", "Race commands may only come from an agent or human driver.", {
      allowed_actor_types: [...ALLOWED_ACTOR_TYPES]
    });
  }

  const segmentId = input.segment_id || "start_gate";
  if (!ALLOWED_SEGMENTS.has(segmentId)) {
    return invalid("unknown_segment", "Race commands must reference a known track segment.", {
      segment_id: segmentId,
      allowed_segments: [...ALLOWED_SEGMENTS]
    });
  }

  if (input.local_event_id !== undefined && !LOCAL_EVENT_ID_PATTERN.test(input.local_event_id)) {
    return invalid("invalid_local_event_id", "Local event ids must be short and machine-readable.");
  }

  const payloadResult = normalizePayload(input.payload);
  if (!payloadResult.ok) return payloadResult;

  return {
    ok: true,
    command: {
      schema: COMMAND_SCHEMA,
      command: input.command,
      control_source: controlSource,
      actor_type: actorType,
      segment_id: segmentId,
      local_event_id: input.local_event_id || null,
      payload: payloadResult.payload
    }
  };
}

function normalizePayload(payload = {}) {
  if (!isPlainObject(payload)) {
    return invalid("invalid_payload", "Race command payloads must be small JSON objects.");
  }

  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_COMMAND_PAYLOAD_BYTES) {
    return invalid("payload_too_large", "Race command payloads must stay small and structured.", {
      max_payload_bytes: MAX_COMMAND_PAYLOAD_BYTES
    });
  }

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(key)) {
      return invalid("unknown_payload_field", "Race command payloads cannot carry private text or arbitrary fields.", {
        field: key,
        allowed_payload_fields: [...ALLOWED_PAYLOAD_KEYS]
      });
    }

    const value = payload[key];
    if (!isPayloadScalar(value)) {
      return invalid("invalid_payload_value", "Race command payload fields must be scalar JSON values.");
    }

    if (typeof value === "string" && URL_PATTERN.test(value)) {
      return invalid("external_url_rejected", "Race command payloads must not include external URLs.");
    }
  }

  return { ok: true, payload };
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

function isPayloadScalar(value) {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}
