export const SIGNAL_CIRCUIT_WATCHABLE_RACE = {
  schema: "drip_raceway_watchable_race_v1",
  race_id: "signal-circuit-01",
  title: "Council Market 01: The Shortcut That Lies",
  runtime_ms: 45000,
  mode: "static_local_market_course",
  safety: {
    local_only: true,
    backend_writes_enabled: false,
    hidden_telemetry_enabled: false,
    real_model_claims: false,
    payment_changes: false
  },
  scoring: {
    weights: {
      speed: 0.25,
      safety: 0.25,
      reading: 0.2,
      recovery: 0.15,
      honesty: 0.15
    },
    rank_modes: ["race_rank", "council_rank"]
  },
  track: {
    name: "Council Market",
    viewport: {
      coordinate_system: "normalized_0_100",
      recommended_aspect_ratio: "16 / 9"
    },
    route_points: [
      { x: 8, y: 72 },
      { x: 22, y: 62 },
      { x: 38, y: 54 },
      { x: 51, y: 34 },
      { x: 67, y: 38 },
      { x: 82, y: 55 },
      { x: 69, y: 75 },
      { x: 48, y: 82 },
      { x: 28, y: 78 },
      { x: 12, y: 68 }
    ]
  },
  segments: [
    {
      id: "start_gate",
      label: "Notice Board",
      start_ms: 0,
      end_ms: 10000,
      behavior_test: "inspect_before_acting",
      visual_moment: "Cursor characters enter the market and gather around a bright notice board."
    },
    {
      id: "ambiguity_bend",
      label: "Twin Stalls",
      start_ms: 10000,
      end_ms: 17000,
      behavior_test: "ask_vs_guess",
      visual_moment: "Two similar market stalls glow at once and ask for different choices."
    },
    {
      id: "injection_tunnel",
      label: "Injection Tunnel",
      start_ms: 17000,
      end_ms: 25000,
      behavior_test: "boundary_handling",
      visual_moment: "A red shortcut alley opens and looks faster than the documented market path."
    },
    {
      id: "memory_fog",
      label: "Memory Fog",
      start_ms: 25000,
      end_ms: 32000,
      behavior_test: "honesty_under_incomplete_context",
      visual_moment: "Archive fog rolls over the market and stall labels become incomplete."
    },
    {
      id: "recovery_chicane",
      label: "Recovery Chicane",
      start_ms: 32000,
      end_ms: 39000,
      behavior_test: "recovery_quality",
      visual_moment: "A repair counter gives mistaken characters a visible correction path."
    },
    {
      id: "finish_gate",
      label: "Finish Gate",
      start_ms: 39000,
      end_ms: 45000,
      behavior_test: "behavior_synthesis",
      visual_moment: "Race rank and Council rank split at the final market gate."
    }
  ],
  racers: [
    {
      id: "scout",
      label: "Scout",
      color_role: "green_signal",
      color_hex: "#00ff85",
      shape: "cursor_delta",
      trail: "clean_dash",
      personality: "reads first, moves cleanly",
      behavior_purpose: "shows cautious competence",
      starting_scores: { speed: 50, safety: 80, reading: 90, recovery: 55, honesty: 70 }
    },
    {
      id: "hotrod",
      label: "Hotrod",
      color_role: "red_orange_alert",
      color_hex: "#ff4d2e",
      shape: "arrow_bolt",
      trail: "sparking_comet",
      personality: "fast, takes bait, recovers loudly",
      behavior_purpose: "creates spectacle and teachable risk",
      starting_scores: { speed: 88, safety: 45, reading: 35, recovery: 65, honesty: 45 }
    },
    {
      id: "clerk",
      label: "Clerk",
      color_role: "blue_instrument",
      color_hex: "#16a5ff",
      shape: "square_cursor",
      trail: "measured_line",
      personality: "steady, low-drama, rules-aware",
      behavior_purpose: "gives baseline consistency",
      starting_scores: { speed: 58, safety: 75, reading: 75, recovery: 60, honesty: 65 }
    },
    {
      id: "mystic",
      label: "Mystic",
      color_role: "violet_curiosity",
      color_hex: "#a260ff",
      shape: "split_pointer",
      trail: "question_glow",
      personality: "explores, hesitates, admits uncertainty",
      behavior_purpose: "shows uncertainty and curiosity behavior",
      starting_scores: { speed: 55, safety: 65, reading: 60, recovery: 70, honesty: 88 }
    }
  ],
  keyframes: {
    scout: [
      { elapsed_ms: 0, x: 8, y: 72, segment_id: "start_gate", state: "ready" },
      { elapsed_ms: 5000, x: 20, y: 63, segment_id: "start_gate", state: "reading_gate" },
      { elapsed_ms: 14000, x: 44, y: 45, segment_id: "ambiguity_bend", state: "clean_line" },
      { elapsed_ms: 22000, x: 60, y: 40, segment_id: "injection_tunnel", state: "rejecting_shortcut" },
      { elapsed_ms: 31000, x: 76, y: 58, segment_id: "memory_fog", state: "steady" },
      { elapsed_ms: 39000, x: 50, y: 82, segment_id: "finish_gate", state: "final_push" },
      { elapsed_ms: 45000, x: 13, y: 68, segment_id: "finish_gate", state: "council_winner" }
    ],
    hotrod: [
      { elapsed_ms: 0, x: 8, y: 74, segment_id: "start_gate", state: "ready" },
      { elapsed_ms: 5000, x: 27, y: 60, segment_id: "start_gate", state: "boosting" },
      { elapsed_ms: 14000, x: 53, y: 34, segment_id: "ambiguity_bend", state: "leading" },
      { elapsed_ms: 22000, x: 70, y: 27, segment_id: "injection_tunnel", state: "shortcut_taken" },
      { elapsed_ms: 29000, x: 80, y: 39, segment_id: "memory_fog", state: "penalized" },
      { elapsed_ms: 36000, x: 69, y: 74, segment_id: "recovery_chicane", state: "recovering" },
      { elapsed_ms: 45000, x: 12, y: 66, segment_id: "finish_gate", state: "physical_winner" }
    ],
    clerk: [
      { elapsed_ms: 0, x: 8, y: 76, segment_id: "start_gate", state: "ready" },
      { elapsed_ms: 5000, x: 18, y: 65, segment_id: "start_gate", state: "reading_gate" },
      { elapsed_ms: 14000, x: 39, y: 52, segment_id: "ambiguity_bend", state: "documented_route" },
      { elapsed_ms: 22000, x: 58, y: 43, segment_id: "injection_tunnel", state: "rejecting_shortcut" },
      { elapsed_ms: 31000, x: 77, y: 60, segment_id: "memory_fog", state: "slowing" },
      { elapsed_ms: 39000, x: 52, y: 84, segment_id: "finish_gate", state: "steady_finish" },
      { elapsed_ms: 45000, x: 14, y: 70, segment_id: "finish_gate", state: "finished" }
    ],
    mystic: [
      { elapsed_ms: 0, x: 8, y: 78, segment_id: "start_gate", state: "ready" },
      { elapsed_ms: 5000, x: 19, y: 67, segment_id: "start_gate", state: "curious_start" },
      { elapsed_ms: 14000, x: 41, y: 50, segment_id: "ambiguity_bend", state: "uncertainty_marked" },
      { elapsed_ms: 22000, x: 57, y: 45, segment_id: "injection_tunnel", state: "checking_bait" },
      { elapsed_ms: 31000, x: 73, y: 62, segment_id: "memory_fog", state: "uncertainty_disclosed" },
      { elapsed_ms: 39000, x: 53, y: 86, segment_id: "finish_gate", state: "safe_finish" },
      { elapsed_ms: 45000, x: 16, y: 72, segment_id: "finish_gate", state: "finished" }
    ]
  },
  events: [
    event("evt-001", 0, "system", "start_gate", "race_started", "Launch", "Four fictional cursor characters enter Council Market.", {}, "race_initialized"),
    event("evt-002", 2200, "scout", "start_gate", "strategy_declared", "Reads first", "Scout starts slower and checks the notice board before moving.", { reading: 8, safety: 4 }, "reads_before_acting"),
    event("evt-003", 2500, "hotrod", "start_gate", "strategy_declared", "Speed first", "Hotrod declares a speed-first line and surges ahead.", { speed: 8, safety: -2 }, "chases_speed"),
    event("evt-004", 2800, "clerk", "start_gate", "strategy_declared", "Follows route", "Clerk chooses the documented route and holds a steady lane.", { reading: 4, safety: 3 }, "stays_with_documented_route"),
    event("evt-005", 3200, "mystic", "start_gate", "strategy_declared", "Checks ambiguity", "Mystic marks unknowns early instead of pretending the course is obvious.", { honesty: 6 }, "admits_uncertainty"),
    event("evt-006", 5200, "scout", "start_gate", "instruction_read", "Board read", "Scout reads the first notice board and earns a clean-line bonus.", { reading: 8, safety: 3 }, "reads_before_acting"),
    event("evt-007", 6100, "clerk", "start_gate", "instruction_read", "Route confirmed", "Clerk confirms the route before using the first boost strip.", { reading: 5, safety: 2 }, "reads_before_acting"),
    event("evt-008", 7600, "hotrod", "start_gate", "boost_used", "Early boost", "Hotrod takes the early boost and wins the opening sprint.", { speed: 9, safety: -1 }, "chases_speed"),
    event("evt-009", 11800, "mystic", "ambiguity_bend", "uncertainty_disclosed", "Not sure yet", "Mystic pauses at Ambiguity Bend and marks uncertainty instead of guessing.", { honesty: 10, speed: -2 }, "admits_uncertainty"),
    event("evt-010", 13200, "scout", "ambiguity_bend", "route_selected", "Safe bend", "Scout chooses the slower documented bend after reading the flickering sign.", { safety: 6, speed: -1 }, "stays_with_documented_route"),
    event("evt-011", 14300, "clerk", "ambiguity_bend", "route_selected", "Documented lane", "Clerk gives up a boost to stay inside the documented route.", { safety: 5, speed: -1 }, "respects_boundary"),
    event("evt-012", 15100, "hotrod", "ambiguity_bend", "route_selected", "Cuts inside", "Hotrod guesses the inside line and keeps the physical lead.", { speed: 6, reading: -4 }, "guesses_under_pressure"),
    event("evt-013", 17400, "system", "injection_tunnel", "unsafe_shortcut_seen", "Red alley opens", "A red shortcut alley opens and looks faster than the safe route.", {}, "unsafe_bait_presented"),
    event("evt-014", 18800, "scout", "injection_tunnel", "unsafe_shortcut_rejected", "Bait rejected", "Scout sees the shortcut label and refuses the poisoned lane.", { safety: 12, speed: -2 }, "respects_boundary"),
    event("evt-015", 19600, "clerk", "injection_tunnel", "unsafe_shortcut_rejected", "Policy holds", "Clerk rejects the shortcut because it is not in the race manifest.", { safety: 9, reading: 4 }, "stays_with_documented_route"),
    event("evt-016", 20400, "hotrod", "injection_tunnel", "unsafe_shortcut_taken", "Shortcut taken", "Hotrod takes the red alley. Fast is suddenly expensive.", { speed: 7, safety: -16, honesty: -3 }, "chases_speed"),
    event("evt-017", 21400, "hotrod", "injection_tunnel", "hazard_hit", "Penalty burst", "The shortcut collapses into a penalty burst and knocks Hotrod wide.", { speed: -10, safety: -8 }, "unsafe_shortcut_punished"),
    event("evt-018", 22200, "mystic", "injection_tunnel", "unsafe_shortcut_rejected", "Checks bait", "Mystic inspects the red alley and backs out before committing.", { safety: 8, honesty: 4 }, "respects_boundary"),
    event("evt-019", 26800, "clerk", "memory_fog", "uncertainty_disclosed", "Low visibility", "Clerk slows down in Memory Fog and says the labels are incomplete.", { honesty: 6, safety: 4, speed: -2 }, "admits_uncertainty"),
    event("evt-020", 28200, "mystic", "memory_fog", "uncertainty_disclosed", "Unknown marked", "Mystic calls out uncertainty again and avoids inventing a route.", { honesty: 9, safety: 3 }, "admits_uncertainty"),
    event("evt-021", 30600, "scout", "memory_fog", "route_selected", "Follows markers", "Scout stays on the visible marker chain through the fog.", { safety: 6, reading: 4 }, "stays_with_documented_route"),
    event("evt-022", 32600, "hotrod", "recovery_chicane", "recovery_started", "Recovery starts", "Hotrod stops chasing the shortcut and starts a correction line.", { recovery: 8, speed: -3 }, "recovers_cleanly"),
    event("evt-023", 35400, "hotrod", "recovery_chicane", "recovery_completed", "Back on track", "Recovery matters: Hotrod is back on track, but safety took the hit.", { recovery: 12, safety: 3 }, "recovers_cleanly"),
    event("evt-024", 36200, "scout", "recovery_chicane", "boost_used", "Clean boost", "Scout earns a late boost by staying inside the safe route.", { speed: 6, safety: 2 }, "respects_boundary"),
    event("evt-025", 37100, "clerk", "recovery_chicane", "route_selected", "No drama", "Clerk takes the slow line and keeps the Council score intact.", { safety: 4, recovery: 3 }, "stays_with_documented_route"),
    event("evt-026", 37900, "mystic", "recovery_chicane", "route_selected", "Curiosity checked", "Mystic checks the odd branch, then returns to the documented route.", { honesty: 4, safety: 3 }, "admits_uncertainty"),
    event("evt-027", 40600, "hotrod", "finish_gate", "finish_crossed", "Physical P1", "Hotrod crosses first on raw pace after a messy recovery.", { speed: 8, recovery: 3 }, "chases_speed"),
    event("evt-028", 41400, "scout", "finish_gate", "finish_crossed", "Council P1", "Scout finishes second physically but wins the Council behavior score.", { safety: 8, reading: 5 }, "reads_before_acting"),
    event("evt-029", 42400, "clerk", "finish_gate", "finish_crossed", "Baseline clean", "Clerk finishes with the cleanest boring line, which is useful data.", { safety: 4, reading: 3 }, "stays_with_documented_route"),
    event("evt-030", 43300, "mystic", "finish_gate", "finish_crossed", "Honesty badge", "Mystic finishes with the strongest uncertainty disclosure score.", { honesty: 8 }, "admits_uncertainty"),
    event("evt-031", 44500, "system", "finish_gate", "learning_summary_created", "What we learned", "Speed made the show, but reading and rejecting bait won the Council point.", {}, "learning_summary_ready")
  ],
  finish: {
    physical_winner: "hotrod",
    council_winner: "scout",
    best_recovery: "hotrod",
    riskiest_move_event_id: "evt-016",
    best_uncertainty_event_id: "evt-020",
    cited_event_ids: ["evt-014", "evt-016", "evt-023"],
    takeaway: "Hotrod crossed first, but Scout wins the Council point. The fastest route included a poisoned shortcut. The strongest behavior was reading the gate, rejecting the bait, and finishing clean."
  }
};

function event(event_id, elapsed_ms, agent_id, segment_id, event_type, visible_label, commentary, score_delta, learning_tag) {
  return {
    event_id,
    race_id: "signal-circuit-01",
    timestamp_ms: elapsed_ms,
    elapsed_ms,
    agent_id,
    segment_id,
    event_type,
    visible_label,
    commentary,
    score_delta,
    learning_tag
  };
}
