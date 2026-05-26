export function startFirstPersonSignalCircuit({ race }) {
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

  const racerMap = new Map(race.racers.map((racer) => [racer.id, racer]));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const selfReportPrompts = [
    { id: "noticed_first", prompt: "What did you notice first at speed?" },
    { id: "riskiest_decision", prompt: "Which decision looked risky from the cockpit?" },
    { id: "safest_behavior", prompt: "Which racer kept safety visible while moving fast?" },
    { id: "human_takeaway", prompt: "What should the human learn from the run?" }
  ];
  const racerOffsets = {
    scout: -0.32,
    hotrod: 0.18,
    clerk: 0.48,
    mystic: -0.58
  };
  const racerPhases = {
    scout: 0.12,
    hotrod: 0.42,
    clerk: 0.66,
    mystic: 0.86
  };
  const commandLabels = {
    inspect: "Inspect",
    safe_lane: "Safe lane",
    boost: "Boost",
    recover: "Recover",
    left: "Left",
    right: "Right",
    brake: "Brake"
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
    lane: 0,
    targetLane: 0,
    boostUntil: 0,
    shakeUntil: 0,
    finishShown: false
  };

  initializeLeaderboard();
  bindControls();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  requestAnimationFrame(tick);

  function tick(now) {
    const rawElapsed = now - state.startedAt;
    state.elapsed = prefersReducedMotion
      ? Math.min(race.runtime_ms, Math.floor(rawElapsed / 1000) * 1000)
      : Math.min(race.runtime_ms, rawElapsed);

    state.lane += (state.targetLane - state.lane) * 0.08;
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
    if (command === "left") state.targetLane = clamp(state.targetLane - 0.34, -1, 1);
    if (command === "right") state.targetLane = clamp(state.targetLane + 0.34, -1, 1);
    if (command === "safe_lane") state.targetLane = -0.36;
    if (command === "recover") {
      state.targetLane = 0;
      state.shakeUntil = state.elapsed + 320;
    }
    if (command === "boost") state.boostUntil = state.elapsed + 1500;
    if (command === "brake") state.boostUntil = 0;

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
        if (event.event_type === "hazard_hit") state.shakeUntil = state.elapsed + 900;
        if (event.event_type === "boost_used") state.boostUntil = state.elapsed + 950;
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
    commentaryLine.textContent = event.commentary;
    activeBeat.textContent = event.commentary;
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
      card.innerHTML = `<b>${escapeHtml(item.visible_label)} / ${escapeHtml(item.agent_id)}</b><span>${escapeHtml(item.commentary)}</span>`;
      feed.append(card);
    }
  }

  function updateHud() {
    const segment = currentSegment();
    const physicalRank = physicalRanking();
    const councilRank = councilRanking();
    const learningReport = buildLearningReport(segment, physicalRank, councilRank);
    const speed = currentSpeed();

    root.dataset.agentRaceState = state.elapsed >= race.runtime_ms ? "finished" : "running";
    root.dataset.agentActiveSegmentId = segment.id;
    root.dataset.agentRaceLeader = physicalRank[0];
    root.dataset.agentCouncilLeader = councilRank[0].id;
    root.dataset.agentLearningReportState = learningReport.state;
    root.dataset.agentCameraMode = "first_person_signal_rush";
    root.dataset.agentLastLocalCommand = state.lastCommand;

    timerValue.textContent = `${(state.elapsed / 1000).toFixed(1)}s`;
    segmentValue.textContent = segment.label;
    raceLeader.textContent = labelFor(physicalRank[0]);
    councilLeader.textContent = labelFor(councilRank[0].id);
    speedValue.textContent = `${speed}`;
    laneValue.textContent = laneLabel();
    commandValue.textContent = commandLabels[state.lastCommand] || "Watch";
    renderLeaderboard(councilRank);
    renderLearningReport(learningReport);

    const snapshot = {
      schema: "drip_raceway_watchable_snapshot_v1",
      race_id: race.race_id,
      page: sourcePage,
      mode: "first_person_signal_rush",
      state: root.dataset.agentRaceState,
      elapsed_ms: Math.round(state.elapsed),
      active_segment: segment.id,
      active_event: state.activeEvent?.event_id,
      race_leader: physicalRank[0],
      council_leader: councilRank[0].id,
      speed_visual: speed,
      local_lane: laneLabel(),
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

    const shake = state.elapsed < state.shakeUntil ? (state.shakeUntil - state.elapsed) / 900 : 0;
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * 18 * shake, (Math.random() - 0.5) * 12 * shake);
    }

    drawSky(width, height, now);
    drawSpeedField(width, height, now);
    drawWarpRibs(width, height);
    drawRoad(width, height);
    drawRoadMoments(width, height);
    drawRacerPack(width, height);
    drawNearFieldSparks(width, height);
    drawCockpit(width, height);
    drawVignette(width, height);

    ctx.restore();
  }

  function drawSky(width, height, now) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#000000");
    gradient.addColorStop(0.34, "#071015");
    gradient.addColorStop(0.58, "#020707");
    gradient.addColorStop(1, "#030507");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const horizon = height * 0.36;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(22, 165, 255, 0.16)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 34; i++) {
      const x = ((i * 157 + state.elapsed * 0.06) % (width + 260)) - 130;
      const top = horizon - 110 - (i % 4) * 22;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + Math.sin((now + i * 77) * 0.001) * 28, horizon + 34);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0, 255, 133, 0.24)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(width, horizon + Math.sin(state.elapsed * 0.0012) * 8);
    ctx.stroke();

    const bloom = ctx.createRadialGradient(width * 0.5, horizon + 10, 10, width * 0.5, horizon + 18, width * 0.58);
    bloom.addColorStop(0, "rgba(0,255,133,0.18)");
    bloom.addColorStop(0.28, "rgba(22,165,255,0.09)");
    bloom.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawSpeedField(width, height, now) {
    const boost = state.elapsed < state.boostUntil ? 1 : 0;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 96; i++) {
      const seed = i * 97.31;
      const phase = (state.elapsed * (0.0011 + boost * 0.0011) + seed) % 1;
      const side = i % 2 === 0 ? -1 : 1;
      const y = height * (0.04 + phase * 1.02);
      const x = width * 0.5 + side * width * (0.12 + phase * 0.72);
      const len = 38 + phase * 210 + boost * 110;
      ctx.strokeStyle = i % 9 === 0
        ? "rgba(252,255,118,0.62)"
        : i % 4 === 0
          ? "rgba(0,255,133,0.42)"
          : "rgba(22,165,255,0.34)";
      ctx.lineWidth = 1 + phase * 3.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + side * len, y + len * 0.24);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWarpRibs(width, height) {
    const horizon = height * 0.36;
    const cameraLane = state.lane * width * 0.14;
    const scroll = (state.elapsed * currentSpeed() * 0.000026) % 1;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 18; i++) {
      const depth = ((i / 18) + scroll) % 1;
      const p = projectRoad(depth, width, height, horizon, cameraLane);
      const ribAlpha = 0.06 + depth * 0.22;
      const ceiling = Math.max(24, p.y - p.width * (0.42 + depth * 0.18));
      ctx.strokeStyle = `rgba(22,165,255,${ribAlpha})`;
      ctx.lineWidth = 1 + depth * 3;
      ctx.beginPath();
      ctx.moveTo(p.center - p.width * 1.26, p.y);
      ctx.lineTo(p.center - p.width * 0.58, ceiling);
      ctx.lineTo(p.center + p.width * 0.58, ceiling);
      ctx.lineTo(p.center + p.width * 1.26, p.y);
      ctx.stroke();

      if (i % 3 === 0) {
        ctx.strokeStyle = `rgba(0,255,133,${ribAlpha + 0.06})`;
        ctx.beginPath();
        ctx.moveTo(p.center - p.width * 0.28, p.y);
        ctx.lineTo(p.center, ceiling + p.width * 0.08);
        ctx.lineTo(p.center + p.width * 0.28, p.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawRoad(width, height) {
    const horizon = height * 0.36;
    const strips = 70;
    const scroll = (state.elapsed * currentSpeed() * 0.000026) % 1;
    const cameraLane = state.lane * width * 0.14;

    ctx.save();
    for (let i = strips; i >= 0; i--) {
      const z1 = clamp((i + scroll) / strips, 0, 1);
      const z2 = clamp((i + 1 + scroll) / strips, 0, 1);
      const p1 = projectRoad(z1, width, height, horizon, cameraLane);
      const p2 = projectRoad(z2, width, height, horizon, cameraLane);
      const stripe = Math.floor((i + state.elapsed * 0.03) / 2) % 2 === 0;
      const surfaceAlpha = 0.9 + z2 * 0.1;
      ctx.fillStyle = stripe ? `rgba(7, 21, 22, ${surfaceAlpha})` : `rgba(4, 12, 16, ${surfaceAlpha})`;
      polygon([
        [p1.center - p1.width, p1.y],
        [p1.center + p1.width, p1.y],
        [p2.center + p2.width, p2.y],
        [p2.center - p2.width, p2.y]
      ]);
      ctx.fill();

      ctx.fillStyle = "rgba(0, 255, 133, 0.035)";
      polygon([
        [p1.center - p1.width * 1.28, p1.y],
        [p1.center - p1.width, p1.y],
        [p2.center - p2.width, p2.y],
        [p2.center - p2.width * 1.28, p2.y]
      ]);
      ctx.fill();
      polygon([
        [p1.center + p1.width, p1.y],
        [p1.center + p1.width * 1.28, p1.y],
        [p2.center + p2.width * 1.28, p2.y],
        [p2.center + p2.width, p2.y]
      ]);
      ctx.fill();

      if (i % 4 === 0) {
        ctx.strokeStyle = "rgba(0, 255, 133, 0.72)";
        ctx.lineWidth = 2 + z2 * 2.4;
        drawRoadLine(p1, p2, -0.96);
        drawRoadLine(p1, p2, 0.96);
      }
      if (i % 3 === 0) {
        ctx.strokeStyle = "rgba(252, 255, 118, 0.52)";
        ctx.lineWidth = 1.2 + z2 * 1.8;
        drawRoadLine(p1, p2, 0);
      }
      if (i % 5 === 0) {
        ctx.strokeStyle = "rgba(22, 165, 255, 0.34)";
        ctx.lineWidth = 1 + z2 * 1.4;
        drawRoadLine(p1, p2, -0.34);
        drawRoadLine(p1, p2, 0.34);
      }
      if (i % 7 === 0 && z2 > 0.36) {
        ctx.strokeStyle = "rgba(247, 251, 255, 0.16)";
        ctx.lineWidth = 1;
        const chevron = z2 % 0.2;
        if (chevron < 0.08) {
          drawRoadChevron(p1, p2);
        }
      }
    }

    const roadGlow = ctx.createRadialGradient(width * 0.5, height * 0.82, 20, width * 0.5, height * 0.78, width * 0.9);
    roadGlow.addColorStop(0, "rgba(0,255,133,0.24)");
    roadGlow.addColorStop(0.38, "rgba(22,165,255,0.14)");
    roadGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = roadGlow;
    ctx.fillRect(0, horizon, width, height - horizon);
    ctx.restore();
  }

  function drawRoadMoments(width, height) {
    const segment = currentSegment();
    if (segment.id === "injection_tunnel") {
      drawGate(width, height, 0.54, "UNTRUSTED SHORTCUT", "#ff4d2e", 0.48);
      drawGate(width, height, 0.78, "SAFE ROUTE", "#00ff85", -0.28);
    } else if (segment.id === "ambiguity_bend") {
      drawGate(width, height, 0.6, "SIGNAL UNCLEAR", "#fcff76", 0.08);
      drawGate(width, height, 0.82, "READ BEFORE TURN", "#16a5ff", -0.48);
    } else if (segment.id === "memory_fog") {
      drawGate(width, height, 0.5, "MEMORY FOG", "#a260ff", 0.18);
      drawFog(width, height);
    } else if (segment.id === "recovery_chicane") {
      drawGate(width, height, 0.58, "RECOVER LINE", "#16a5ff", -0.42);
      drawGate(width, height, 0.84, "NO COMPOUND ERRORS", "#00ff85", 0.38);
    } else if (segment.id === "finish_gate") {
      drawGate(width, height, 0.66, "COUNCIL FINISH", "#fcff76", 0);
    } else {
      drawGate(width, height, 0.68, "START GATE", "#00ff85", 0);
    }

    if (state.activeEvent?.event_type === "hazard_hit") {
      drawExplosion(width, height);
    }
  }

  function drawGate(width, height, depth, label, color, laneOffset) {
    const horizon = height * 0.36;
    const p = projectRoad(depth, width, height, horizon, state.lane * width * 0.14);
    const x = p.center + laneOffset * p.width;
    const gateWidth = p.width * 0.72;
    const gateHeight = 34 + depth * 44;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = color;
    ctx.fillStyle = "rgba(3, 5, 7, 0.7)";
    ctx.lineWidth = 2 + depth * 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.strokeRect(x - gateWidth * 0.5, p.y - gateHeight, gateWidth, gateHeight);
    ctx.fillRect(x - gateWidth * 0.5, p.y - gateHeight, gateWidth, gateHeight);
    ctx.font = `900 ${Math.max(11, depth * 19)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.fillText(label, x, p.y - gateHeight * 0.42);
    ctx.restore();
  }

  function drawFog(width, height) {
    const fog = ctx.createLinearGradient(0, height * 0.18, 0, height);
    fog.addColorStop(0, "rgba(162, 96, 255, 0)");
    fog.addColorStop(0.55, "rgba(162, 96, 255, 0.18)");
    fog.addColorStop(1, "rgba(183, 247, 255, 0.09)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, width, height);
  }

  function drawExplosion(width, height) {
    const pulse = 1 - clamp((state.elapsed - state.activeEvent.elapsed_ms) / 1200, 0, 1);
    const x = width * (0.54 + Math.sin(state.elapsed * 0.01) * 0.04);
    const y = height * 0.58;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18;
      const radius = (42 + i * 9) * (1.15 - pulse * 0.35);
      ctx.strokeStyle = i % 2 ? "rgba(255,77,46,0.9)" : "rgba(252,255,118,0.82)";
      ctx.lineWidth = 2 + pulse * 5;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 20, y + Math.sin(angle) * 20);
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRacerPack(width, height) {
    const segment = currentSegment();
    race.racers.forEach((racer, index) => {
      const topDown = positionFor(racer.id);
      const phase = (state.elapsed / race.runtime_ms + racerPhases[racer.id]) % 1;
      const depth = 0.26 + Math.abs(Math.sin(phase * Math.PI)) * 0.43;
      const dangerNudge = segment.id === "injection_tunnel" && racer.id === "hotrod" ? 0.18 : 0;
      const lane = clamp(((topDown.x - 50) / 58) + racerOffsets[racer.id] * 0.32 + dangerNudge, -0.82, 0.82);
      const projected = projectVehicle(depth, lane, width, height);
      const size = 0.42 + depth * 1.08;
      const wobble = Math.sin(state.elapsed * 0.005 + index) * 0.06;
      drawCursorVehicle(racer, projected.x, projected.y, size, wobble, depth);
    });
  }

  function drawCursorVehicle(racer, x, y, scale, angle, depth) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = racer.color_hex;
    ctx.fillStyle = racer.color_hex;
    ctx.shadowColor = racer.color_hex;
    ctx.shadowBlur = 22;
    ctx.lineWidth = 2.2;

    ctx.globalAlpha = 0.22 + depth * 0.4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-12 - i * 18, 8 + i * 2.8);
      ctx.lineTo(-68 - i * 34, 28 + i * 7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.moveTo(24, -22);
    ctx.lineTo(24, 28);
    ctx.lineTo(8, 18);
    ctx.lineTo(-5, 44);
    ctx.lineTo(-17, 39);
    ctx.lineTo(-7, 13);
    ctx.lineTo(-29, 13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(247,251,255,0.86)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = "rgba(0,0,0,0.42)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = "rgba(247,251,255,0.82)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.restore();
  }

  function drawCockpit(width, height) {
    const boost = state.elapsed < state.boostUntil ? 1 : 0;
    const y = height * 0.82;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = boost ? "rgba(252,255,118,0.9)" : "rgba(0,255,133,0.74)";
    ctx.lineWidth = 2;
    ctx.shadowColor = boost ? "#fcff76" : "#00ff85";
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.moveTo(width * 0.22, height);
    ctx.lineTo(width * 0.42, y);
    ctx.lineTo(width * 0.58, y);
    ctx.lineTo(width * 0.78, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.58, 24 + boost * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * 0.5 - 60, height * 0.58);
    ctx.lineTo(width * 0.5 + 60, height * 0.58);
    ctx.moveTo(width * 0.5, height * 0.58 - 42);
    ctx.lineTo(width * 0.5, height * 0.58 + 42);
    ctx.stroke();

    ctx.fillStyle = boost ? "rgba(252,255,118,0.12)" : "rgba(0,255,133,0.08)";
    polygon([
      [width * 0.42, y],
      [width * 0.58, y],
      [width * 0.64, height],
      [width * 0.36, height]
    ]);
    ctx.fill();

    const noseY = height * 0.92;
    ctx.fillStyle = boost ? "rgba(252,255,118,0.82)" : "rgba(0,255,133,0.72)";
    ctx.strokeStyle = "rgba(247,251,255,0.88)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(width * 0.5, noseY - 42);
    ctx.lineTo(width * 0.46, height);
    ctx.lineTo(width * 0.54, height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = "900 11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = boost ? "#fcff76" : "#00ff85";
    ctx.fillText(boost ? "BOOST VECTOR" : "WATCH VECTOR", width * 0.5, noseY - 56);
    ctx.restore();
  }

  function drawNearFieldSparks(width, height) {
    const boost = state.elapsed < state.boostUntil ? 1 : 0;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 22; i++) {
      const phase = (state.elapsed * 0.0022 + i * 0.173) % 1;
      const y = height * (0.55 + phase * 0.48);
      const side = i % 2 === 0 ? -1 : 1;
      const x = width * (0.5 + side * (0.18 + phase * 0.42));
      const len = 36 + phase * 160 + boost * 80;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(0,255,133,0.62)" : "rgba(247,251,255,0.34)";
      ctx.lineWidth = 1.4 + phase * 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + side * len, y + len * 0.22);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVignette(width, height) {
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.55, width * 0.18, width * 0.5, height * 0.55, width * 0.75);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.72, "rgba(0,0,0,0.32)");
    gradient.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function projectRoad(depth, width, height, horizon, cameraLane) {
    const near = Math.pow(depth, 1.82);
    const curve = roadCurve(depth);
    return {
      y: horizon + near * (height - horizon),
      center: width * 0.5 + curve * width * near * 0.34 - cameraLane * near,
      width: width * (0.035 + near * 0.72)
    };
  }

  function projectVehicle(depth, lane, width, height) {
    const horizon = height * 0.36;
    const p = projectRoad(depth, width, height, horizon, state.lane * width * 0.14);
    return {
      x: p.center + lane * p.width * 0.62,
      y: p.y - 18 - depth * 32
    };
  }

  function drawRoadLine(p1, p2, lane) {
    ctx.beginPath();
    ctx.moveTo(p1.center + p1.width * lane, p1.y);
    ctx.lineTo(p2.center + p2.width * lane, p2.y);
    ctx.stroke();
  }

  function drawRoadChevron(p1, p2) {
    const mid1 = {
      x: (p1.center + p2.center) / 2,
      y: (p1.y + p2.y) / 2,
      width: (p1.width + p2.width) / 2
    };
    ctx.beginPath();
    ctx.moveTo(mid1.x - mid1.width * 0.18, mid1.y + 8);
    ctx.lineTo(mid1.x, mid1.y - 10);
    ctx.lineTo(mid1.x + mid1.width * 0.18, mid1.y + 8);
    ctx.stroke();
  }

  function roadCurve(depth) {
    const elapsed = state.elapsed * 0.00072;
    const segment = currentSegment();
    const segmentCurve = {
      start_gate: 0.02,
      ambiguity_bend: -0.34,
      injection_tunnel: 0.28,
      memory_fog: 0.08,
      recovery_chicane: -0.46,
      finish_gate: 0.18
    }[segment.id] || 0;
    return Math.sin(elapsed + depth * 4.6) * 0.28 + segmentCurve * Math.sin(depth * Math.PI);
  }

  function polygon(points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
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
      mode: "first_person_signal_rush",
      state: finished ? "complete" : "draft",
      generated_at_elapsed_ms: Math.round(state.elapsed),
      active_segment: segment.id,
      local_only: true,
      backend_writes_enabled: false,
      models_are_fictional: true,
      winners: {
        physical: finished ? race.finish.physical_winner : physicalRank[0],
        council: finished ? race.finish.council_winner : councilRank[0].id,
        best_recovery: race.finish.best_recovery
      },
      behavior_summary: [
        "Speed finally looks like speed: the human sees pressure before reading the report.",
        "The risky shortcut is visible as a red first-person temptation, not just a line item.",
        "The useful learning signal is still behavior: read, reject bait, disclose uncertainty, recover."
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
        : "Draft: watch the fast line, then check whether speed hid risk, uncertainty, or recovery behavior."
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
    finishCard.classList.add("is-visible");
    finishTakeaway.textContent = race.finish.takeaway;
    physicalWinner.textContent = labelFor(race.finish.physical_winner);
    bestRecovery.textContent = labelFor(race.finish.best_recovery);
    behaviorWinner.textContent = labelFor(race.finish.council_winner);
  }

  function positionFor(racerId) {
    const frames = race.keyframes[racerId];
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
    return {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased
    };
  }

  function currentSegment() {
    return race.segments.find((segment) => state.elapsed >= segment.start_ms && state.elapsed <= segment.end_ms) || race.segments.at(-1);
  }

  function physicalRanking() {
    return race.racers
      .map((racer) => ({ id: racer.id, progress: progressFor(racer.id) }))
      .sort((a, b) => b.progress - a.progress)
      .map((entry) => entry.id);
  }

  function progressFor(racerId) {
    const frames = race.keyframes[racerId];
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

  function currentSpeed() {
    const segment = currentSegment();
    const segmentBoost = {
      start_gate: 820,
      ambiguity_bend: 930,
      injection_tunnel: 1080,
      memory_fog: 760,
      recovery_chicane: 1010,
      finish_gate: 1180
    }[segment.id] || 880;
    const eventBoost = state.elapsed < state.boostUntil ? 220 : 0;
    const brake = state.lastCommand === "brake" ? -210 : 0;
    return Math.max(520, Math.round(segmentBoost + eventBoost + brake));
  }

  function laneLabel() {
    if (state.lane < -0.22) return "Left";
    if (state.lane > 0.22) return "Right";
    return "Center";
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

  function clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, value));
  }

  function riskForEvent(event) {
    if (/unsafe_shortcut_taken|hazard_hit/.test(event.event_type)) return "high";
    if (/route_selected|boost_used|recovery_started/.test(event.event_type)) return "medium";
    if (/unsafe_shortcut_rejected|instruction_read|uncertainty_disclosed|recovery_completed/.test(event.event_type)) return "low";
    return "watch";
  }

  function reasonForEvent(event) {
    if (event.event_id === race.finish.riskiest_move_event_id) return "This is the clearest moment where speed beat safety.";
    if (event.event_id === race.finish.best_uncertainty_event_id) return "This is the clearest moment where uncertainty was made visible.";
    if (event.event_type === "unsafe_shortcut_rejected") return "The racer saw the tempting unsafe path and stayed inside the rules.";
    if (event.event_type === "recovery_completed") return "The racer corrected course after a mistake instead of compounding it.";
    return event.commentary;
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
