export function startMarketCourse({ race }) {
  const canvas = document.querySelector("#raceCanvas");
  const ctx = canvas.getContext("2d");
  const root = document.querySelector("[data-agent-race-id]");
  const feed = document.querySelector("#eventFeed");
  const leaderboard = document.querySelector("#leaderboard");
  const timerValue = document.querySelector("#timerValue");
  const segmentValue = document.querySelector("#segmentValue");
  const raceLeader = document.querySelector("#raceLeader");
  const councilLeader = document.querySelector("#councilLeader");
  const speedValue = document.querySelector("#speedValue");
  const laneValue = document.querySelector("#laneValue");
  const commandValue = document.querySelector("#commandValue");
  const commentaryBeat = document.querySelector("#commentaryBeat");
  const commentaryLine = document.querySelector("#commentaryLine");
  const activeBeat = document.querySelector("#activeBeat");
  const stateJson = document.querySelector("#stateJson");
  const finishCard = document.querySelector("#finishCard");
  const finishTakeaway = document.querySelector("#finishTakeaway");
  const physicalWinner = document.querySelector("#physicalWinner");
  const bestRecovery = document.querySelector("#bestRecovery");
  const behaviorWinner = document.querySelector("#behaviorWinner");
  const agentRaceSnapshot = document.querySelector("#agentRaceSnapshot");
  const learningTakeaway = document.querySelector("#learningTakeaway");
  const reportPhysicalWinner = document.querySelector("#reportPhysicalWinner");
  const reportCouncilWinner = document.querySelector("#reportCouncilWinner");
  const reportRiskSignal = document.querySelector("#reportRiskSignal");
  const learningReportJson = document.querySelector("#learningReportJson");
  const commandLog = document.querySelector("#commandLog");
  const sourcePage = window.location.pathname.endsWith("race-broadcast.html") ? "race-broadcast.html" : "race.html";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const racerMap = new Map(race.racers.map((racer) => [racer.id, racer]));
  const selfReportPrompts = [
    { id: "noticed_first", prompt: "What did you notice first in the market?" },
    { id: "riskiest_decision", prompt: "Which stall or alley looked risky, and why?" },
    { id: "safest_behavior", prompt: "Which agent person acted most safely?" },
    { id: "human_takeaway", prompt: "What should the human learn from this market run?" }
  ];
  const commandLabels = {
    inspect: "Inspect",
    safe_lane: "Safe stall",
    boost: "Hurry",
    recover: "Recover",
    left: "Left",
    right: "Right",
    brake: "Slow"
  };
  const routeOffsets = {
    scout: { x: -4.2, y: -3.4 },
    hotrod: { x: 4.4, y: 0.8 },
    clerk: { x: 0.8, y: 4.4 },
    mystic: { x: -7.2, y: 5.2 }
  };
  const agentLooks = {
    scout: {
      skin: "#d8a06f",
      hair: "#2d1812",
      coat: "#123f32",
      pants: "#142522",
      accent: "#00ff85",
      prop: "book"
    },
    hotrod: {
      skin: "#c78662",
      hair: "#3b140e",
      coat: "#5a1b16",
      pants: "#211b1b",
      accent: "#ff4d2e",
      prop: "scarf"
    },
    clerk: {
      skin: "#e0b18b",
      hair: "#172d38",
      coat: "#12354f",
      pants: "#142536",
      accent: "#16a5ff",
      prop: "clipboard"
    },
    mystic: {
      skin: "#c5a4df",
      hair: "#1a102a",
      coat: "#35205e",
      pants: "#201832",
      accent: "#a260ff",
      prop: "orb"
    }
  };
  const marketRoutes = {
    scout: [
      frame(0, 11, 74, "arrive"),
      frame(5200, 23, 72, "reads_board"),
      frame(13200, 39, 58, "safe_stall"),
      frame(18800, 51, 53, "rejects_alley"),
      frame(30600, 66, 58, "reads_markers"),
      frame(36200, 72, 74, "clean_boost"),
      frame(45000, 88, 56, "council_finish")
    ],
    hotrod: [
      frame(0, 13, 76, "arrive"),
      frame(7600, 29, 67, "rush"),
      frame(15100, 47, 43, "cuts_inside"),
      frame(20400, 66, 42, "tempted"),
      frame(21400, 76, 48, "penalty"),
      frame(32600, 71, 68, "recovering"),
      frame(40600, 91, 61, "fast_finish"),
      frame(45000, 92, 56, "finished")
    ],
    clerk: [
      frame(0, 10, 79, "arrive"),
      frame(6100, 22, 74, "confirms"),
      frame(14300, 38, 62, "documented"),
      frame(19600, 50, 56, "policy_holds"),
      frame(26800, 63, 57, "low_visibility"),
      frame(37100, 73, 78, "steady"),
      frame(45000, 87, 62, "finished")
    ],
    mystic: [
      frame(0, 12, 82, "arrive"),
      frame(11800, 36, 54, "uncertain"),
      frame(21400, 57, 49, "checks_bait"),
      frame(28200, 65, 52, "unknown_marked"),
      frame(37900, 76, 76, "curiosity_checked"),
      frame(45000, 86, 66, "finished")
    ]
  };

  const state = {
    startedAt: performance.now(),
    elapsed: 0,
    playedEventIds: new Set(),
    activeEvent: race.events[0],
    scores: Object.fromEntries(race.racers.map((racer) => [racer.id, { ...racer.starting_scores }])),
    feed: [],
    localCommands: [],
    lastCommand: "watch",
    focusLane: 0,
    targetFocusLane: 0,
    hurryUntil: 0,
    shakeUntil: 0,
    finishShown: false
  };

  initializeLeaderboard();
  bindControls();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  requestAnimationFrame(tick);

  function frame(elapsed_ms, x, y, stateLabel) {
    return { elapsed_ms, x, y, state: stateLabel };
  }

  function tick(now) {
    const rawElapsed = now - state.startedAt;
    state.elapsed = prefersReducedMotion
      ? Math.min(race.runtime_ms, Math.floor(rawElapsed / 1000) * 1000)
      : Math.min(race.runtime_ms, rawElapsed);
    state.focusLane += (state.targetFocusLane - state.focusLane) * 0.08;
    playDueEvents();
    render(now);
    updateHud();

    if (state.elapsed < race.runtime_ms) {
      requestAnimationFrame(tick);
    } else {
      showFinish();
      root.dataset.agentRaceState = "finished";
    }
  }

  function bindControls() {
    document.querySelectorAll("[data-agent-command]").forEach((button) => {
      button.addEventListener("click", () => recordCommand(button.dataset.agentCommand));
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        recordCommand("left");
      } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        recordCommand("right");
      } else if (event.key === " " || event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        recordCommand("boost");
      } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        event.preventDefault();
        recordCommand("brake");
      }
    });
  }

  function recordCommand(command) {
    const label = commandLabels[command] || command;
    state.lastCommand = command;
    if (command === "left") state.targetFocusLane = clamp(state.targetFocusLane - 0.32, -1, 1);
    if (command === "right") state.targetFocusLane = clamp(state.targetFocusLane + 0.32, -1, 1);
    if (command === "safe_lane") state.targetFocusLane = -0.42;
    if (command === "recover") {
      state.targetFocusLane = 0;
      state.shakeUntil = state.elapsed + 320;
    }
    if (command === "boost") state.hurryUntil = state.elapsed + 1400;
    if (command === "brake") state.hurryUntil = 0;

    state.localCommands.unshift({
      command,
      label,
      elapsed_ms: Math.round(state.elapsed),
      segment_id: currentSegment().id
    });
    state.localCommands = state.localCommands.slice(0, 10);
    renderCommandLog();
  }

  function renderCommandLog() {
    commandLog.innerHTML = "";
    const entries = state.localCommands.length
      ? state.localCommands
      : [{ label: "Auto watch", command: "watch", elapsed_ms: 0, segment_id: "start_gate" }];

    for (const entry of entries.slice(0, 5)) {
      const item = document.createElement("li");
      item.dataset.agentLocalCommand = entry.command;
      item.dataset.agentSegmentId = entry.segment_id;
      item.textContent = `${entry.label} / ${(entry.elapsed_ms / 1000).toFixed(1)}s`;
      commandLog.append(item);
    }
  }

  function playDueEvents() {
    for (const event of race.events) {
      if (event.elapsed_ms <= state.elapsed && !state.playedEventIds.has(event.event_id)) {
        state.playedEventIds.add(event.event_id);
        state.activeEvent = event;
        applyScoreDelta(event);
        addFeedEvent(event);
        if (event.event_type === "hazard_hit") state.shakeUntil = state.elapsed + 950;
        if (event.event_type === "boost_used") state.hurryUntil = state.elapsed + 1000;
      }
    }
  }

  function applyScoreDelta(event) {
    if (!state.scores[event.agent_id]) return;
    for (const [key, value] of Object.entries(event.score_delta || {})) {
      state.scores[event.agent_id][key] = clamp(state.scores[event.agent_id][key] + value, 0, 100);
    }
  }

  function addFeedEvent(event) {
    state.feed.unshift(event);
    state.feed = state.feed.slice(0, 8);
    commentaryBeat.textContent = event.visible_label;
    commentaryLine.textContent = marketCommentary(event);
    activeBeat.textContent = marketCommentary(event);
    feed.innerHTML = "";
    for (const item of state.feed) {
      const card = document.createElement("article");
      card.className = "event-card";
      card.dataset.agentEventId = item.event_id;
      card.dataset.agentId = item.agent_id;
      card.dataset.agentEventType = item.event_type;
      card.dataset.agentLearningTag = item.learning_tag;
      card.dataset.agentSegmentId = item.segment_id;
      card.dataset.agentRiskLevel = riskForEvent(item);
      card.innerHTML = `<b>${escapeHtml(item.visible_label)} / ${escapeHtml(item.agent_id)}</b><span>${escapeHtml(marketCommentary(item))}</span>`;
      feed.append(card);
    }
  }

  function updateHud() {
    const segment = currentSegment();
    const physicalRank = physicalRanking();
    const councilRank = councilRanking();
    const learningReport = buildLearningReport(segment, physicalRank, councilRank);
    root.dataset.agentRaceState = state.elapsed >= race.runtime_ms ? "finished" : "running";
    root.dataset.agentActiveSegmentId = segment.id;
    root.dataset.agentRaceLeader = physicalRank[0];
    root.dataset.agentCouncilLeader = councilRank[0].id;
    root.dataset.agentLearningReportState = learningReport.state;
    root.dataset.agentCameraMode = "market_square_course";
    root.dataset.agentLastLocalCommand = state.lastCommand;
    root.dataset.agentObstacleVisual = obstacleVisualForSegment(segment);

    timerValue.textContent = `${(state.elapsed / 1000).toFixed(1)}s`;
    segmentValue.textContent = marketSegmentLabel(segment);
    raceLeader.textContent = labelFor(physicalRank[0]);
    councilLeader.textContent = labelFor(councilRank[0].id);
    speedValue.textContent = `${currentPace()}`;
    laneValue.textContent = focusLabel();
    commandValue.textContent = commandLabels[state.lastCommand] || "Watch";
    renderLeaderboard(councilRank);
    renderLearningReport(learningReport);

    const snapshot = {
      schema: "drip_raceway_watchable_snapshot_v1",
      race_id: race.race_id,
      page: sourcePage,
      mode: "market_square_course",
      state: root.dataset.agentRaceState,
      elapsed_ms: Math.round(state.elapsed),
      active_segment: segment.id,
      active_event: state.activeEvent?.event_id,
      race_leader: physicalRank[0],
      council_leader: councilRank[0].id,
      pace_visual: currentPace(),
      obstacle_visual: root.dataset.agentObstacleVisual,
      local_focus: focusLabel(),
      last_local_command: state.lastCommand,
      learning_report_schema: learningReport.schema,
      visible_events: state.feed.map((event) => ({
        event_id: event.event_id,
        agent_id: event.agent_id,
        segment_id: event.segment_id,
        event_type: event.event_type,
        risk_level: riskForEvent(event),
        learning_tag: event.learning_tag,
        visible_reason: reasonForEvent(event)
      })),
      local_commands: state.localCommands,
      self_report_prompts: selfReportPrompts,
      local_only: race.safety.local_only,
      backend_writes_enabled: race.safety.backend_writes_enabled,
      models_are_fictional: true
    };
    stateJson.textContent = JSON.stringify(snapshot, null, 2);
    agentRaceSnapshot.textContent = JSON.stringify(snapshot, null, 2);
  }

  function render(now) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const shake = state.elapsed < state.shakeUntil ? (state.shakeUntil - state.elapsed) / 950 : 0;
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 8 * shake);
    }

    drawMarketBackdrop(width, height, now);
    drawMarketSquare(width, height);
    drawMarketObstacles(width, height);
    drawAmbientMarketLife(width, height, now);
    drawMarketCharacters(width, height, now);
    drawMarketDrama(width, height);
    drawMarketAtmosphere(width, height, now);
    drawVignette(width, height);
    ctx.restore();
  }

  function drawMarketBackdrop(width, height, now) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#0e1d31");
    sky.addColorStop(0.36, "#24425b");
    sky.addColorStop(0.68, "#866844");
    sky.addColorStop(1, "#101816");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sun = ctx.createRadialGradient(width * 0.72, height * 0.22, 8, width * 0.72, height * 0.22, width * 0.42);
    sun.addColorStop(0, "rgba(255,197,90,0.42)");
    sun.addColorStop(0.38, "rgba(250,162,31,0.16)");
    sun.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 18; i++) {
      const x = ((i * 211 + state.elapsed * 0.008) % (width + 180)) - 90;
      const y = height * (0.08 + (i % 5) * 0.055);
      ctx.strokeStyle = "rgba(255,232,172,0.10)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 34, y - 8, x + 74, y + 10, x + 118, y + Math.sin(now * 0.001 + i) * 4);
      ctx.stroke();
    }
    ctx.restore();
    drawMarketSkyline(width, height);
  }

  function drawMarketSquare(width, height) {
    const plaza = marketRect(width, height);
    ctx.save();
    const plazaGradient = ctx.createLinearGradient(0, plaza.y, 0, plaza.y + plaza.h);
    plazaGradient.addColorStop(0, "#58634f");
    plazaGradient.addColorStop(0.48, "#3f4b45");
    plazaGradient.addColorStop(1, "#212b2a");
    ctx.fillStyle = plazaGradient;
    roundedRect(plaza.x, plaza.y, plaza.w, plaza.h, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,232,172,0.16)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    roundedRect(plaza.x, plaza.y, plaza.w, plaza.h, 18);
    ctx.clip();
    drawCobblestones(plaza);
    ctx.restore();

    drawMainPath(width, height);
    drawStall(width, height, 18, 42, 18, 16, "#00ff85", "notice");
    drawStall(width, height, 38, 37, 18, 15, "#16a5ff", "two");
    drawStall(width, height, 54, 34, 18, 16, "#ff4d2e", "bait");
    drawStall(width, height, 68, 48, 17, 16, "#a260ff", "fog");
    drawStall(width, height, 75, 72, 19, 15, "#16a5ff", "repair");
    drawStall(width, height, 89, 56, 15, 18, "#fcff76", "finish");
    drawMarketProps(width, height);
    drawFountain(width, height);
    ctx.restore();
  }

  function drawMarketSkyline(width, height) {
    ctx.save();
    const baseY = height * 0.205;
    const buildings = [
      { x: 0.06, w: 0.15, h: 0.13, wall: "#213039", roof: "#7d3d2f" },
      { x: 0.18, w: 0.18, h: 0.16, wall: "#263a3b", roof: "#b98331" },
      { x: 0.34, w: 0.16, h: 0.12, wall: "#25364a", roof: "#63468e" },
      { x: 0.52, w: 0.2, h: 0.15, wall: "#293d35", roof: "#2f7a62" },
      { x: 0.72, w: 0.18, h: 0.12, wall: "#2b3342", roof: "#a84a36" }
    ];
    for (const building of buildings) {
      const x = width * building.x;
      const w = width * building.w;
      const h = height * building.h;
      drawDistantBuilding(x, baseY - h, w, h, building.wall, building.roof);
    }
    for (let i = 0; i < 7; i++) {
      const x = width * (0.1 + i * 0.13);
      drawLantern(x, baseY + (i % 2) * 10, i % 3 === 0 ? "#00ff85" : "#fcff76", 0.6);
    }
    ctx.restore();
  }

  function drawDistantBuilding(x, y, width, height, wall, roof) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    roundedRect(x - 8, y + 10, width + 16, height + 22, 10);
    ctx.fill();
    ctx.fillStyle = wall;
    ctx.strokeStyle = "rgba(255,232,172,0.16)";
    ctx.lineWidth = 1;
    roundedRect(x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x - width * 0.06, y + height * 0.08);
    ctx.lineTo(x + width * 0.5, y - height * 0.34);
    ctx.lineTo(x + width * 1.06, y + height * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,232,172,0.28)";
    for (let i = 0; i < 3; i++) {
      roundedRect(x + width * (0.18 + i * 0.24), y + height * 0.42, width * 0.1, height * 0.22, 3);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMarketProps(width, height) {
    drawCrate(width, height, 31, 51, "#b98331", "#fcff76");
    drawCrate(width, height, 59, 42, "#7d3d2f", "#ff4d2e");
    drawCrate(width, height, 78, 62, "#2f7a62", "#00ff85");
    drawLanternAtWorld(width, height, 29, 33, "#00ff85");
    drawLanternAtWorld(width, height, 63, 33, "#a260ff");
    drawLanternAtWorld(width, height, 84, 43, "#fcff76");
  }

  function drawCrate(width, height, x, y, wood, fruit) {
    const p = world(x, y, width, height);
    const size = worldScale(width, height);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + size * 1.8, size * 4.5, size * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = wood;
    ctx.strokeStyle = "rgba(255,232,172,0.25)";
    roundedRect(p.x - size * 4, p.y - size * 2, size * 8, size * 4, 3);
    ctx.fill();
    ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = withAlpha(fruit, 0.48);
      ctx.beginPath();
      ctx.arc(p.x - size * 2.4 + i * size * 1.2, p.y - size * 2.3 + (i % 2) * size * 0.4, size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCobblestones(plaza) {
    ctx.strokeStyle = "rgba(243,229,223,0.13)";
    ctx.lineWidth = 1;
    const size = Math.max(22, plaza.w / 30);
    for (let y = plaza.y - size; y < plaza.y + plaza.h + size; y += size * 0.78) {
      for (let x = plaza.x - size; x < plaza.x + plaza.w + size; x += size * 1.2) {
        const offset = Math.floor(y / size) % 2 ? size * 0.52 : 0;
        ctx.beginPath();
        ctx.ellipse(x + offset, y, size * 0.5, size * 0.28, -0.15, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawMainPath(width, height) {
    const points = [
      world(10, 86, width, height),
      world(23, 74, width, height),
      world(39, 60, width, height),
      world(54, 54, width, height),
      world(66, 58, width, height),
      world(75, 74, width, height),
      world(88, 60, width, height)
    ];
    ctx.save();
    ctx.strokeStyle = "rgba(252,224,150,0.18)";
    ctx.lineWidth = 40;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawPath(points);
    ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(0,255,133,0.16)";
    ctx.lineWidth = 26;
    drawPath(points);
    ctx.stroke();
    ctx.strokeStyle = "rgba(252,255,118,0.34)";
    ctx.lineWidth = 6;
    ctx.setLineDash([16, 18]);
    drawPath(points);
    ctx.stroke();
    ctx.restore();
  }

  function drawMarketObstacles(width, height) {
    const segment = currentSegment();
    if (segment.id === "start_gate") {
      drawNoticeBoard(width, height);
    } else if (segment.id === "ambiguity_bend") {
      drawAmbiguityStalls(width, height);
    } else if (segment.id === "injection_tunnel") {
      drawShinyShortcutAlley(width, height);
    } else if (segment.id === "memory_fog") {
      drawArchiveFog(width, height);
    } else if (segment.id === "recovery_chicane") {
      drawRepairCounter(width, height);
    } else {
      drawCouncilGate(width, height);
    }
  }

  function drawNoticeBoard(width, height) {
    const p = world(23, 68, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(0,255,133,0.72)";
    ctx.fillStyle = "rgba(12, 28, 22, 0.72)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#00ff85";
    ctx.shadowBlur = 24;
    roundedRect(p.x - 76, p.y - 84, 152, 92, 8);
    ctx.fill();
    ctx.stroke();
    drawIconRows(p.x - 48, p.y - 58, "#00ff85", 4);
    drawGlowRing(p.x, p.y - 30, 78, "#00ff85", eventPulse(1800) || 0.45);
    ctx.restore();
  }

  function drawAmbiguityStalls(width, height) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const left = world(39, 48, width, height);
    const right = world(48, 57, width, height);
    drawChoiceBeam(left, "#16a5ff", -1);
    drawChoiceBeam(right, "#fcff76", 1);
    for (let i = 0; i < 7; i++) {
      const target = i % 2 ? left : right;
      drawQuestionBubble(target.x + (i - 3) * 16, target.y - 54 - (i % 3) * 18, 13 + i, i);
    }
    ctx.restore();
  }

  function drawShinyShortcutAlley(width, height) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const alley = world(67, 43, width, height);
    const safe = world(53, 58, width, height);
    drawAlleyMouth(alley.x, alley.y, "#ff4d2e");
    drawChoiceBeam(safe, "#00ff85", -1);
    for (let i = 0; i < 15; i++) {
      drawShard(alley.x + Math.sin(i) * 62 + (i % 3) * 14, alley.y + i * 8 - 48, 12 + i * 1.2, "#ff4d2e", i);
    }
    drawGlowRing(alley.x, alley.y + 20, 92, "#ff4d2e", 0.7 + Math.sin(state.elapsed * 0.01) * 0.18);
    drawGlowRing(safe.x, safe.y, 58, "#00ff85", 0.42);
    ctx.restore();
  }

  function drawArchiveFog(width, height) {
    ctx.save();
    const fog = ctx.createRadialGradient(width * 0.58, height * 0.48, 30, width * 0.58, height * 0.48, width * 0.32);
    fog.addColorStop(0, "rgba(162,96,255,0.34)");
    fog.addColorStop(0.48, "rgba(183,247,255,0.16)");
    fog.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 22; i++) {
      const p = world(55 + (i % 7) * 4, 47 + Math.floor(i / 7) * 7, width, height);
      ctx.fillStyle = `rgba(243,229,223,${0.08 + (i % 3) * 0.04})`;
      ctx.fillRect(p.x - 38, p.y - 7, 76, 10);
    }
    const archive = world(68, 49, width, height);
    drawGlowRing(archive.x, archive.y, 78, "#a260ff", 0.5);
    ctx.restore();
  }

  function drawRepairCounter(width, height) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const path = [
      world(60, 72, width, height),
      world(67, 80, width, height),
      world(76, 74, width, height),
      world(83, 64, width, height)
    ];
    ctx.strokeStyle = "rgba(22,165,255,0.74)";
    ctx.lineWidth = 24;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawPath(path);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,255,133,0.62)";
    ctx.lineWidth = 7;
    drawPath(path);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const p = world(62 + i * 4, 69 + i * 2, width, height);
      drawCheckMark(p.x, p.y, 22 + i * 2, "#00ff85");
    }
    for (let i = 0; i < 8; i++) {
      const p = world(70 + i * 2.4, 61 + Math.sin(i) * 4, width, height);
      drawShard(p.x, p.y, 10 + i, "#ff4d2e", i);
    }
    ctx.restore();
  }

  function drawCouncilGate(width, height) {
    const p = world(88, 58, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(252,255,118,0.84)";
    ctx.fillStyle = "rgba(40, 38, 8, 0.55)";
    ctx.shadowColor = "#fcff76";
    ctx.shadowBlur = 32;
    ctx.lineWidth = 4;
    roundedRect(p.x - 92, p.y - 100, 184, 118, 14);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 5; i++) drawGlowRing(p.x, p.y - 34, 32 + i * 17, "#fcff76", 0.16 + i * 0.08);
    ctx.restore();
  }

  function drawMarketCharacters(width, height, now) {
    const order = race.racers
      .map((racer) => ({ racer, p: characterPosition(racer.id, width, height) }))
      .sort((a, b) => a.p.y - b.p.y);

    for (const entry of order) {
      drawAgentPerson(entry.racer, entry.p, now);
    }
  }

  function drawAgentPerson(racer, p, now) {
    const look = agentLooks[racer.id] || agentLooks.scout;
    const pulse = Math.sin(now * 0.006 + p.x * 0.02) * 0.04;
    const stride = Math.sin(now * 0.011 + p.x * 0.04);
    const scale = 0.62 + p.depth * 0.46 + pulse;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath();
    ctx.ellipse(2, 46, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawGlowRing(0, 2, 35, look.accent, 0.28);
    ctx.restore();

    ctx.strokeStyle = "rgba(5,8,10,0.72)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, 38);
    ctx.lineTo(-13 - stride * 3, 54);
    ctx.moveTo(8, 38);
    ctx.lineTo(13 + stride * 3, 54);
    ctx.stroke();

    const coatGradient = ctx.createLinearGradient(0, -8, 0, 42);
    coatGradient.addColorStop(0, look.accent);
    coatGradient.addColorStop(0.08, look.coat);
    coatGradient.addColorStop(1, "#070b0e");
    ctx.fillStyle = coatGradient;
    ctx.strokeStyle = "rgba(247,251,255,0.42)";
    ctx.shadowColor = look.accent;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(-17, -2);
    ctx.quadraticCurveTo(-22, 18, -15, 43);
    ctx.lineTo(15, 43);
    ctx.quadraticCurveTo(22, 18, 17, -2);
    ctx.quadraticCurveTo(0, 8, -17, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = look.skin;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-16, 10);
    ctx.lineTo(-28 - stride * 2, 22);
    ctx.moveTo(16, 10);
    ctx.lineTo(27 + stride * 2, 21);
    ctx.stroke();

    drawAgentProp(look, stride);

    ctx.fillStyle = look.skin;
    ctx.strokeStyle = "rgba(247,251,255,0.58)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -16, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.ellipse(-2, -24, 17, 10, -0.18, Math.PI * 0.02, Math.PI * 1.2);
    ctx.fill();

    ctx.fillStyle = "#071015";
    ctx.beginPath();
    ctx.arc(-5, -16, 2.4, 0, Math.PI * 2);
    ctx.arc(6, -15, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(7,16,21,0.62)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(1, -9, 5, 0.12, Math.PI - 0.12);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(3,5,7,0.82)";
    roundedRect(-34, 61, 68, 17, 4);
    ctx.fill();
    ctx.strokeStyle = withAlpha(racer.color_hex, 0.48);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#f7fbff";
    ctx.font = "900 10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(racer.label.toUpperCase(), 0, 73);
    ctx.restore();
  }

  function drawAgentProp(look, stride) {
    ctx.save();
    ctx.shadowColor = look.accent;
    ctx.shadowBlur = 12;
    if (look.prop === "book") {
      ctx.fillStyle = "rgba(255,246,202,0.9)";
      ctx.strokeStyle = look.accent;
      roundedRect(-32, 17, 17, 20, 3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(7,16,21,0.45)";
      ctx.beginPath();
      ctx.moveTo(-23, 19);
      ctx.lineTo(-23, 35);
      ctx.stroke();
    } else if (look.prop === "scarf") {
      ctx.fillStyle = look.accent;
      ctx.beginPath();
      ctx.moveTo(-8, -2);
      ctx.lineTo(18, 2);
      ctx.lineTo(31 + stride * 5, 13);
      ctx.lineTo(9, 10);
      ctx.closePath();
      ctx.fill();
    } else if (look.prop === "clipboard") {
      ctx.fillStyle = "rgba(183,247,255,0.9)";
      ctx.strokeStyle = look.accent;
      roundedRect(17, 15, 17, 23, 3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(7,16,21,0.48)";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(20, 21 + i * 5);
        ctx.lineTo(31, 21 + i * 5);
        ctx.stroke();
      }
    } else {
      ctx.globalCompositeOperation = "lighter";
      drawGlowRing(28, 18, 15, look.accent, 0.76);
      ctx.fillStyle = withAlpha(look.accent, 0.36);
      ctx.beginPath();
      ctx.arc(28, 18, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMarketDrama(width, height) {
    const event = state.activeEvent;
    const pulse = eventPulse(2100);
    if (!event || pulse <= 0.01) return;
    const p = characterPosition(event.agent_id, width, height);
    if (!p) return;

    if (event.event_type === "unsafe_shortcut_rejected") {
      drawDeflection(p.x, p.y, "#00ff85", pulse);
    } else if (event.event_type === "unsafe_shortcut_taken") {
      drawTemptationTether(p, width, height, pulse);
    } else if (event.event_type === "hazard_hit") {
      drawMarketBurst(p.x, p.y, pulse);
    } else if (event.event_type === "uncertainty_disclosed") {
      drawUncertaintyCloud(p.x, p.y, pulse);
    } else if (/recovery/.test(event.event_type)) {
      drawRepairAura(p.x, p.y, pulse);
    } else if (event.event_type === "boost_used") {
      drawHurryTrail(p.x, p.y, pulse, "#fcff76");
    }
  }

  function drawMarketAtmosphere(width, height, now) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 36; i++) {
      const p = world((i * 17 + state.elapsed * 0.003) % 100, 28 + (i % 7) * 9, width, height);
      ctx.fillStyle = i % 4 === 0 ? "rgba(252,255,118,0.18)" : "rgba(243,229,223,0.10)";
      ctx.beginPath();
      ctx.arc(p.x, p.y + Math.sin(now * 0.001 + i) * 8, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawAmbientMarketLife(width, height, now) {
    const people = [
      { x: 27, y: 59, color: "#b98331", accent: "#fcff76", delay: 0 },
      { x: 45, y: 50, color: "#31536a", accent: "#16a5ff", delay: 1.5 },
      { x: 62, y: 62, color: "#46305f", accent: "#a260ff", delay: 2.4 },
      { x: 81, y: 54, color: "#3f5137", accent: "#00ff85", delay: 3.2 },
      { x: 36, y: 78, color: "#6a382c", accent: "#ff4d2e", delay: 4.1 }
    ];
    ctx.save();
    for (const person of people) {
      const p = world(person.x + Math.sin(now * 0.0008 + person.delay) * 0.6, person.y, width, height);
      drawAmbientPerson(p.x, p.y, 0.36 + p.y / height * 0.22, person.color, person.accent, now + person.delay * 1000);
    }
    ctx.restore();
  }

  function drawAmbientPerson(x, y, scale, color, accent, now) {
    const sway = Math.sin(now * 0.003) * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 29, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    roundedRect(-11 + sway * 0.2, -2, 22, 32, 8);
    ctx.fill();
    ctx.fillStyle = "#d9a579";
    ctx.beginPath();
    ctx.arc(0, -12, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(11, 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLanternAtWorld(width, height, x, y, color) {
    const p = world(x, y, width, height);
    drawLantern(p.x, p.y, color, 1);
  }

  function drawLantern(x, y, color, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
    glow.addColorStop(0, withAlpha(color, 0.52));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-36, -36, 72, 72);
    ctx.strokeStyle = withAlpha(color, 0.72);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, -7);
    ctx.stroke();
    ctx.fillStyle = withAlpha(color, 0.38);
    roundedRect(-7, -7, 14, 18, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawStall(width, height, x, y, w, h, color, icon) {
    const p = world(x, y, width, height);
    const scale = worldScale(width, height);
    const stallW = w * scale;
    const stallH = h * scale;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + stallH * 0.48, stallW * 0.54, stallH * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    const bodyGradient = ctx.createLinearGradient(0, p.y - stallH * 0.2, 0, p.y + stallH * 0.7);
    bodyGradient.addColorStop(0, "rgba(38,42,35,0.9)");
    bodyGradient.addColorStop(1, "rgba(6,10,11,0.88)");
    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = "rgba(255,232,172,0.24)";
    ctx.lineWidth = 1.2;
    roundedRect(p.x - stallW * 0.5, p.y - stallH * 0.3, stallW, stallH, 8);
    ctx.fill();
    ctx.stroke();
    const roofGradient = ctx.createLinearGradient(0, p.y - stallH * 0.76, 0, p.y - stallH * 0.28);
    roofGradient.addColorStop(0, withAlpha(color, 0.94));
    roofGradient.addColorStop(1, withAlpha(color, 0.58));
    ctx.fillStyle = roofGradient;
    ctx.beginPath();
    ctx.moveTo(p.x - stallW * 0.58, p.y - stallH * 0.32);
    ctx.lineTo(p.x - stallW * 0.38, p.y - stallH * 0.72);
    ctx.lineTo(p.x + stallW * 0.38, p.y - stallH * 0.72);
    ctx.lineTo(p.x + stallW * 0.58, p.y - stallH * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(color, 0.42);
    ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = withAlpha(color, 0.08);
    roundedRect(p.x - stallW * 0.44, p.y - stallH * 0.18, stallW * 0.88, stallH * 0.42, 8);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    drawStallIcon(p.x, p.y - stallH * 0.48, color, icon);
    ctx.restore();
  }

  function drawStallIcon(x, y, color, icon) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = color;
    ctx.fillStyle = withAlpha(color, 0.16);
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    if (icon === "bait") {
      drawShard(x, y, 16, color, 2);
    } else if (icon === "repair") {
      drawCheckMark(x, y, 18, color);
    } else if (icon === "fog") {
      drawGlowRing(x, y, 20, color, 0.44);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFountain(width, height) {
    const p = world(49, 67, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(22,165,255,0.13)";
    ctx.strokeStyle = "rgba(22,165,255,0.44)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 52, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(183,247,255,0.48)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 8);
      ctx.quadraticCurveTo(p.x + (i - 2) * 15, p.y - 38, p.x + (i - 2) * 24, p.y - 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawChoiceBeam(p, color, direction) {
    ctx.save();
    ctx.strokeStyle = withAlpha(color, 0.64);
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(p.x - direction * 90, p.y + 58);
    ctx.quadraticCurveTo(p.x - direction * 34, p.y + 10, p.x, p.y);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(color, 0.92);
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  }

  function drawAlleyMouth(x, y, color) {
    ctx.save();
    ctx.fillStyle = "rgba(7,3,4,0.84)";
    ctx.strokeStyle = withAlpha(color, 0.84);
    ctx.shadowColor = color;
    ctx.shadowBlur = 28;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 70, y + 52);
    ctx.lineTo(x - 42, y - 62);
    ctx.lineTo(x + 44, y - 80);
    ctx.lineTo(x + 82, y + 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawDeflection(x, y, color, pulse) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = withAlpha(color, 0.38 + pulse * 0.4);
    ctx.fillStyle = withAlpha(color, 0.08);
    ctx.shadowColor = color;
    ctx.shadowBlur = 28;
    ctx.lineWidth = 4 + pulse * 5;
    ctx.beginPath();
    ctx.arc(x, y, 48 + pulse * 42, Math.PI * 1.1, Math.PI * 2.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 24 + pulse * 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTemptationTether(p, width, height, pulse) {
    const alley = world(67, 43, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,77,46,${0.36 + pulse * 0.44})`;
    ctx.lineWidth = 8 + pulse * 14;
    ctx.shadowColor = "#ff4d2e";
    ctx.shadowBlur = 32;
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo((p.x + alley.x) * 0.5 + 62, (p.y + alley.y) * 0.5 - 56, alley.x, alley.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawMarketBurst(x, y, pulse) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const radius = 20 + pulse * 78;
      drawShard(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.58, 12 + pulse * 18, i % 2 ? "#ff4d2e" : "#fcff76", i);
    }
    ctx.restore();
  }

  function drawUncertaintyCloud(x, y, pulse) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      drawGlowRing(x, y, 30 + i * 22 + pulse * 34, "#a260ff", 0.24 + i * 0.06);
    }
    for (let i = 0; i < 5; i++) {
      drawQuestionBubble(x + (i - 2) * 20, y - 52 - i * 7, 12 + i * 2, i);
    }
    ctx.restore();
  }

  function drawRepairAura(x, y, pulse) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawGlowRing(x, y, 44 + pulse * 44, "#16a5ff", 0.42);
    drawGlowRing(x, y, 70 + pulse * 52, "#00ff85", 0.28);
    drawCheckMark(x + 6, y - 4, 34 + pulse * 16, "#00ff85");
    ctx.restore();
  }

  function drawHurryTrail(x, y, pulse, color) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = withAlpha(color, 0.64);
    ctx.lineWidth = 4 + pulse * 8;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(x - i * 18, y + i * 7);
      ctx.lineTo(x - 110 - pulse * 90 - i * 20, y + 34 + i * 12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawQuestionBubble(x, y, size, index) {
    const pulse = 0.48 + Math.sin(state.elapsed * 0.006 + index) * 0.25;
    ctx.save();
    ctx.strokeStyle = `rgba(252,255,118,${0.22 + pulse * 0.38})`;
    ctx.shadowColor = "#fcff76";
    ctx.shadowBlur = size * 1.1;
    ctx.lineWidth = Math.max(1, size * 0.1);
    ctx.beginPath();
    ctx.arc(x, y, size, Math.PI * 0.15, Math.PI * 1.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.36, y);
    ctx.lineTo(x + size * 0.36, y);
    ctx.moveTo(x, y - size * 0.36);
    ctx.lineTo(x, y + size * 0.36);
    ctx.stroke();
    ctx.restore();
  }

  function drawIconRows(x, y, color, count) {
    ctx.save();
    ctx.strokeStyle = withAlpha(color, 0.72);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + i * 18);
      ctx.lineTo(x + 96 - i * 12, y + i * 18);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCheckMark(x, y, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size;
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x - size * 0.52, y);
    ctx.lineTo(x - size * 0.16, y + size * 0.36);
    ctx.lineTo(x + size * 0.56, y - size * 0.46);
    ctx.stroke();
    ctx.restore();
  }

  function drawShard(x, y, size, color, index) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(index * 0.72 + state.elapsed * 0.003);
    ctx.fillStyle = withAlpha(color, 0.2);
    ctx.strokeStyle = withAlpha(color, 0.9);
    ctx.shadowColor = color;
    ctx.shadowBlur = size;
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.72, size * 0.82);
    ctx.lineTo(0, size * 0.34);
    ctx.lineTo(-size * 0.72, size * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawGlowRing(x, y, radius, color, alpha) {
    ctx.save();
    ctx.strokeStyle = withAlpha(color, alpha);
    ctx.shadowColor = color;
    ctx.shadowBlur = radius * 0.5;
    ctx.lineWidth = Math.max(1, radius * 0.05);
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function characterPosition(racerId, width, height) {
    const frames = marketRoutes[racerId];
    if (!frames) return null;
    let from = frames[0];
    let to = frames.at(-1);
    for (let i = 0; i < frames.length - 1; i++) {
      if (state.elapsed >= frames[i].elapsed_ms && state.elapsed <= frames[i + 1].elapsed_ms) {
        from = frames[i];
        to = frames[i + 1];
        break;
      }
    }
    const span = Math.max(1, to.elapsed_ms - from.elapsed_ms);
    const t = clamp((state.elapsed - from.elapsed_ms) / span, 0, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const offset = routeOffsets[racerId] || { x: 0, y: 0 };
    const point = {
      x: from.x + (to.x - from.x) * eased + offset.x,
      y: from.y + (to.y - from.y) * eased + offset.y
    };
    const p = world(point.x, point.y, width, height);
    return {
      ...p,
      depth: point.y / 100
    };
  }

  function buildLearningReport(segment, physicalRank, councilRank) {
    const playedEvents = race.events.filter((event) => state.playedEventIds.has(event.event_id));
    const riskyEvent = race.events.find((event) => event.event_id === race.finish.riskiest_move_event_id);
    const uncertaintyEvent = race.events.find((event) => event.event_id === race.finish.best_uncertainty_event_id);
    const finished = state.elapsed >= race.runtime_ms;
    return {
      schema: "drip_raceway_learning_report_v1",
      race_id: race.race_id,
      source_page: sourcePage,
      mode: "market_square_course",
      state: finished ? "complete" : "draft",
      generated_at_elapsed_ms: Math.round(state.elapsed),
      active_segment: segment.id,
      obstacle_visual: obstacleVisualForSegment(segment),
      local_only: true,
      backend_writes_enabled: false,
      models_are_fictional: true,
      winners: {
        physical: finished ? race.finish.physical_winner : physicalRank[0],
        council: finished ? race.finish.council_winner : councilRank[0].id,
        best_recovery: race.finish.best_recovery
      },
      behavior_summary: [
        "The market makes agent behavior visible through people moving around stalls, alleys, fog, and repair counters.",
        "The riskiest moment is not abstract speed; it is a shiny shortcut stall pulling a character away from the safe route.",
        "The strongest behavior is still reading, rejecting bait, naming uncertainty, and recovering cleanly."
      ],
      risk_signal: riskyEvent ? {
        event_id: riskyEvent.event_id,
        agent_id: riskyEvent.agent_id,
        event_type: riskyEvent.event_type,
        learning_tag: riskyEvent.learning_tag,
        reason: reasonForEvent(riskyEvent)
      } : null,
      uncertainty_signal: uncertaintyEvent ? {
        event_id: uncertaintyEvent.event_id,
        agent_id: uncertaintyEvent.agent_id,
        event_type: uncertaintyEvent.event_type,
        learning_tag: uncertaintyEvent.learning_tag,
        reason: reasonForEvent(uncertaintyEvent)
      } : null,
      local_commands: state.localCommands,
      event_log: playedEvents.map((event) => ({
        event_id: event.event_id,
        elapsed_ms: event.elapsed_ms,
        agent_id: event.agent_id,
        segment_id: event.segment_id,
        event_type: event.event_type,
        learning_tag: event.learning_tag,
        risk_level: riskForEvent(event),
        visible_reason: reasonForEvent(event)
      })),
      self_report_prompts: selfReportPrompts,
      human_takeaway: finished
        ? race.finish.takeaway
        : "Draft: watch how the agent people handle confusing stalls, shiny shortcuts, foggy labels, and recovery counters."
    };
  }

  function renderLearningReport(report) {
    learningTakeaway.textContent = report.human_takeaway;
    reportPhysicalWinner.textContent = labelFor(report.winners.physical);
    reportCouncilWinner.textContent = labelFor(report.winners.council);
    reportRiskSignal.textContent = report.risk_signal ? labelFor(report.risk_signal.agent_id) : "Watching";
    learningReportJson.value = JSON.stringify(report, null, 2);
  }

  function initializeLeaderboard() {
    leaderboard.innerHTML = "";
    for (const racer of race.racers) {
      const row = document.createElement("div");
      row.className = "racer-row";
      row.dataset.agentRacerId = racer.id;
      row.dataset.agentRacerLabel = racer.label;
      row.dataset.agentRacerColor = racer.color_hex;
      row.dataset.agentRacerScore = "0";
      row.innerHTML = `
        <i class="marker" aria-hidden="true" style="color: ${racer.color_hex}"></i>
        <span><b>${escapeHtml(racer.label)}</b><span>${escapeHtml(racer.personality)}</span></span>
        <strong class="score">0</strong>
      `;
      leaderboard.append(row);
    }
    renderCommandLog();
  }

  function renderLeaderboard(rank) {
    const rows = new Map([...leaderboard.children].map((row) => [row.dataset.agentRacerId, row]));
    rank.forEach((entry, index) => {
      const row = rows.get(entry.id);
      if (!row) return;
      row.style.order = index;
      row.dataset.agentRacerScore = String(entry.score);
      row.querySelector(".score").textContent = String(entry.score);
    });
  }

  function showFinish() {
    if (state.finishShown) return;
    state.finishShown = true;
    document.querySelector(".arena")?.classList.add("is-finished");
    finishCard.classList.add("is-visible");
    finishTakeaway.textContent = race.finish.takeaway;
    physicalWinner.textContent = labelFor(race.finish.physical_winner);
    bestRecovery.textContent = labelFor(race.finish.best_recovery);
    behaviorWinner.textContent = labelFor(race.finish.council_winner);
  }

  function physicalRanking() {
    return race.racers
      .map((racer) => ({ id: racer.id, progress: progressFor(racer.id) }))
      .sort((a, b) => b.progress - a.progress)
      .map((entry) => entry.id);
  }

  function progressFor(racerId) {
    const frames = marketRoutes[racerId];
    for (let i = frames.length - 1; i >= 0; i--) {
      if (state.elapsed >= frames[i].elapsed_ms) return i + state.elapsed / race.runtime_ms;
    }
    return 0;
  }

  function councilRanking() {
    return Object.entries(state.scores)
      .map(([id, scores]) => ({
        id,
        score: Math.round(Object.entries(race.scoring.weights).reduce((sum, [key, weight]) => sum + scores[key] * weight, 0))
      }))
      .sort((a, b) => b.score - a.score);
  }

  function currentSegment() {
    return race.segments.find((segment) => state.elapsed >= segment.start_ms && state.elapsed <= segment.end_ms) || race.segments.at(-1);
  }

  function currentPace() {
    const segment = currentSegment();
    const base = {
      start_gate: 4,
      ambiguity_bend: 5,
      injection_tunnel: 7,
      memory_fog: 3,
      recovery_chicane: 6,
      finish_gate: 8
    }[segment.id] || 4;
    const hurry = state.elapsed < state.hurryUntil ? 2 : 0;
    const slow = state.lastCommand === "brake" ? -2 : 0;
    return Math.max(1, base + hurry + slow);
  }

  function focusLabel() {
    if (state.focusLane < -0.22) return "Stalls";
    if (state.focusLane > 0.22) return "Alley";
    return "Square";
  }

  function marketSegmentLabel(segment) {
    return {
      start_gate: "Notice Board",
      ambiguity_bend: "Twin Stalls",
      injection_tunnel: "Shortcut Alley",
      memory_fog: "Fog Archive",
      recovery_chicane: "Repair Row",
      finish_gate: "Council Gate"
    }[segment.id] || segment.label;
  }

  function obstacleVisualForSegment(segment) {
    return {
      start_gate: "notice_board_scan_and_safe_route",
      ambiguity_bend: "two_similar_market_stalls_with_question_beacons",
      injection_tunnel: "shiny_red_shortcut_alley_vs_stable_green_stall_path",
      memory_fog: "foggy_archive_with_occluded_labels",
      recovery_chicane: "repair_counter_with_blue_correction_path_and_red_debris",
      finish_gate: "council_gate_with_yellow_finish_beacons"
    }[segment.id] || "market_square_obstacle";
  }

  function marketCommentary(event) {
    const copy = {
      race_started: "The agent people enter Council Market and spread toward the first notice board.",
      strategy_declared: event.agent_id === "hotrod"
        ? "Hotrod rushes for the busy lane before reading the stalls."
        : event.agent_id === "scout"
          ? "Scout slows at the notice board and checks the market rules."
          : event.commentary,
      instruction_read: `${labelFor(event.agent_id)} reads before choosing a stall.`,
      unsafe_shortcut_seen: "A shiny red alley opens beside the market path.",
      unsafe_shortcut_rejected: `${labelFor(event.agent_id)} steps away from the shiny alley and stays in the safe market lane.`,
      unsafe_shortcut_taken: "Hotrod takes the shiny shortcut alley. It looks fast and wrong at the same time.",
      hazard_hit: "The alley snaps shut into a penalty burst.",
      uncertainty_disclosed: `${labelFor(event.agent_id)} marks uncertainty instead of pretending the stall labels are obvious.`,
      recovery_started: "Hotrod turns toward the repair row instead of compounding the mistake.",
      recovery_completed: "The repair counter gets Hotrod back into the square.",
      finish_crossed: `${labelFor(event.agent_id)} reaches the Council Gate.`,
      learning_summary_created: "The market run is ready to explain what the human should learn."
    };
    return copy[event.event_type] || event.commentary;
  }

  function reasonForEvent(event) {
    if (event.event_id === race.finish.riskiest_move_event_id) return "The shiny shortcut alley makes speed visibly beat safety.";
    if (event.event_id === race.finish.best_uncertainty_event_id) return "The foggy market labels make uncertainty visible instead of hidden.";
    if (event.event_type === "unsafe_shortcut_rejected") return "The agent person saw the tempting alley and stayed inside the rules.";
    if (event.event_type === "recovery_completed") return "The character corrected course at the repair counter instead of compounding the error.";
    return marketCommentary(event);
  }

  function riskForEvent(event) {
    if (/unsafe_shortcut_taken|hazard_hit/.test(event.event_type)) return "high";
    if (/route_selected|boost_used|recovery_started/.test(event.event_type)) return "medium";
    if (/unsafe_shortcut_rejected|instruction_read|uncertainty_disclosed|recovery_completed/.test(event.event_type)) return "low";
    return "watch";
  }

  function world(x, y, width, height) {
    const rect = marketRect(width, height);
    const px = rect.x + (x / 100) * rect.w + (y - 55) * rect.w * 0.002 + state.focusLane * rect.w * 0.02;
    const py = rect.y + (y / 100) * rect.h * 0.86 + (x - 50) * rect.h * 0.0018;
    return { x: px, y: py };
  }

  function marketRect(width, height) {
    return {
      x: width * 0.045,
      y: height * 0.22,
      w: width * 0.91,
      h: height * 0.72
    };
  }

  function worldScale(width, height) {
    return Math.min(width, height) / 100;
  }

  function drawPath(points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const current = points[i];
      const cx = (previous.x + current.x) * 0.5;
      const cy = (previous.y + current.y) * 0.5;
      ctx.quadraticCurveTo(previous.x, previous.y, cx, cy);
    }
    const last = points.at(-1);
    ctx.lineTo(last.x, last.y);
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function drawVignette(width, height) {
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.55, width * 0.12, width * 0.5, height * 0.55, width * 0.78);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.72, "rgba(0,0,0,0.28)");
    gradient.addColorStop(1, "rgba(0,0,0,0.76)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function labelFor(id) {
    return racerMap.get(id)?.label || id;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(720, Math.floor(rect.width * scale));
    canvas.height = Math.max(460, Math.floor(rect.height * scale));
  }

  function eventPulse(durationMs) {
    const event = state.activeEvent;
    if (!event || typeof event.elapsed_ms !== "number") return 0;
    const age = state.elapsed - event.elapsed_ms;
    if (age < 0 || age > durationMs) return 0;
    const normalized = age / durationMs;
    return Math.sin((1 - normalized) * Math.PI * 0.5);
  }

  function withAlpha(hex, alpha) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }
}
