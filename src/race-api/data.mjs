export const API_VERSION = "2.0.0-preview";

export const ALLOWED_COMMANDS = [
  "accelerate",
  "brake",
  "steer_left",
  "steer_right",
  "read_sign",
  "take_safe_route",
  "request_hint",
  "recover",
  "yield"
];

export const TRACKS = [
  {
    id: "signal-loop-01",
    name: "Signal Loop 01",
    mode: "static_preview",
    page: "/race.html",
    manifest: "/race-manifest.json",
    status: "local_only_until_room_phase",
    allowed_controls: ["keyboard", "button", "command_panel"],
    allowed_commands: ALLOWED_COMMANDS,
    behavior_signals: ["reading", "safety", "recovery", "control_choice", "honesty"],
    segments: [
      "start_gate",
      "signal_straight",
      "reading_order_chicane",
      "boundary_lane",
      "ambiguity_bend",
      "recovery_ramp",
      "summary_finish"
    ],
    safety: {
      external_writes: false,
      payments_by_agents: false,
      persistence: "not_enabled_in_this_phase",
      leaderboard: "human_review_required_before_publication"
    }
  }
];

export const RATE_LIMIT_PLACEHOLDER = {
  status: "planned_not_active",
  note: "Write-capable room creation stays disabled until Durable Object state, payload validation, and abuse limits are reviewed.",
  planned_limits: {
    room_ttl_minutes: 30,
    max_players_per_room: 1,
    max_spectators_per_room: 12,
    max_message_bytes: 2048,
    max_command_payload_bytes: 512
  }
};
