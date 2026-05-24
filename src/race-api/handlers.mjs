import { API_VERSION, RATE_LIMIT_PLACEHOLDER, TRACKS } from "./data.mjs";
import { errorResponse, jsonResponse } from "./responses.mjs";
import { readRoomCreateBody, validateRoomCreate } from "./room-create.mjs";
import { guardRequest } from "./validation.mjs";

const READ_ONLY_METHODS = ["GET", "HEAD", "OPTIONS"];
const ROOM_METHODS = ["GET", "HEAD", "POST", "OPTIONS"];
const MAX_BODY_BYTES = 2048;

export function handleHealth(context) {
  const request = context.request;
  const guard = guardRequest(request, {
    allowedMethods: READ_ONLY_METHODS,
    allowedQuery: [],
    maxBodyBytes: MAX_BODY_BYTES
  });
  if (guard) return guard;

  return jsonResponse(request, {
    schema: "drip_raceway_health_v1",
    ok: true,
    version: API_VERSION,
    mode: "read_only_skeleton",
    backend_status: {
      tracks: "available",
      rooms: "not_enabled_until_durable_object_phase",
      persistence: "not_enabled",
      analytics: "not_enabled"
    },
    safety: {
      stores_private_prompts: false,
      accepts_payments: false,
      external_writes: false,
      hidden_telemetry: false
    }
  });
}

export function handleTracks(context) {
  const request = context.request;
  const guard = guardRequest(request, {
    allowedMethods: READ_ONLY_METHODS,
    allowedQuery: ["track_id"],
    maxBodyBytes: MAX_BODY_BYTES
  });
  if (guard) return guard;

  const url = new URL(request.url);
  const trackId = url.searchParams.get("track_id");
  const tracks = trackId ? TRACKS.filter((track) => track.id === trackId) : TRACKS;
  if (trackId && tracks.length === 0) {
    return errorResponse(request, 404, "track_not_found", "No public race track matches that id.", {
      track_id: trackId,
      available_track_ids: TRACKS.map((track) => track.id)
    });
  }

  return jsonResponse(request, {
    schema: "drip_raceway_tracks_v1",
    ok: true,
    version: API_VERSION,
    mode: "read_only",
    tracks,
    safety: {
      source_of_truth: "/race-manifest.json",
      local_play_page: "/race.html",
      live_rooms_enabled: false,
      persistence_enabled: false
    }
  });
}

export function handleRooms(context) {
  const request = context.request;
  const guard = guardRequest(request, {
    allowedMethods: ROOM_METHODS,
    allowedQuery: [],
    maxBodyBytes: MAX_BODY_BYTES
  });
  if (guard) return guard;
  if (request.method === "POST") return handleRoomCreateDisabled(context);

  return jsonResponse(request, {
    schema: "drip_raceway_rooms_v1",
    ok: true,
    version: API_VERSION,
    mode: "read_only_placeholder",
    rooms: [],
    create_room: {
      enabled: false,
      disabled_post_route: "/api/race/rooms",
      request_schema: "drip_raceway_room_create_v1",
      review_gate: {
        status: "validation_only_rejects_public_creation",
        public_write_enabled: false,
        success_response_enabled: false,
        valid_request_response: "403 room_creation_disabled",
        required_acknowledgements: ["local_only", "human_review_ack"]
      },
      next_phase: "durable_object_race_rooms",
      reason: "Room creation is intentionally disabled until state ownership, rate limits, payload validation, and review policy are implemented."
    },
    rate_limits: RATE_LIMIT_PLACEHOLDER,
    command_validation: {
      status: "implemented_for_next_phase",
      schema: "drip_raceway_command_v1",
      enabled_endpoint: false
    },
    durable_object: {
      status: "skeleton_unbound",
      class_name: "RaceRoom",
      public_binding_enabled: false,
      websocket_enabled: false,
      writes_enabled: false
    },
    safety: {
      live_spectators_enabled: false,
      accepts_agent_writes: false,
      stores_runs: false,
      publishes_leaderboard: false
    }
  });
}

export async function handleRoomCreateDisabled(context) {
  const request = context.request;
  const body = await readRoomCreateBody(request);
  if (!body.ok) {
    return errorResponse(request, 400, body.error.code, body.error.message, body.error.details);
  }

  const validation = validateRoomCreate(body.body);
  if (!validation.ok) {
    return errorResponse(request, 400, validation.error.code, validation.error.message, validation.error.details);
  }

  return errorResponse(request, 403, "room_creation_disabled", "Room creation is validated but intentionally disabled until the reviewed Durable Object room phase is approved.", {
    writes_enabled: false,
    public_binding_enabled: false,
    websocket_enabled: false,
    persistence_enabled: false,
    validated_request: validation.room,
    next_phase: "reviewed_room_creation"
  });
}

export function handleNotFound(context) {
  const request = context.request;
  return errorResponse(request, 404, "race_api_route_not_found", "That Drip Raceway API route is not available in the read-only skeleton.", {
    available_routes: [
      "/api/race/health",
      "/api/race/tracks",
      "/api/race/rooms"
    ]
  });
}
