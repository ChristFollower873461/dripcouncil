import { API_VERSION, RATE_LIMIT_PLACEHOLDER, TRACKS } from "./data.mjs";
import { errorResponse, jsonResponse } from "./responses.mjs";
import { guardRequest } from "./validation.mjs";

const READ_ONLY_METHODS = ["GET", "HEAD", "OPTIONS"];
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
    allowedMethods: READ_ONLY_METHODS,
    allowedQuery: [],
    maxBodyBytes: MAX_BODY_BYTES
  });
  if (guard) return guard;

  return jsonResponse(request, {
    schema: "drip_raceway_rooms_v1",
    ok: true,
    version: API_VERSION,
    mode: "read_only_placeholder",
    rooms: [],
    create_room: {
      enabled: false,
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
