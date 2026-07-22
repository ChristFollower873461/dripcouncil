const reducedMotion = typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const wait = (milliseconds) => new Promise((resolve) => {
  globalThis.setTimeout(resolve, reducedMotion ? 0 : milliseconds);
});

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  return { context, width: rect.width, height: rect.height };
}

function drawPolyline(context, points, color, progress = 1) {
  if (points.length < 2 || progress <= 0) return;

  const segmentLengths = points.slice(1).map((point, index) => {
    const previous = points[index];
    return Math.hypot(point[0] - previous[0], point[1] - previous[1]);
  });
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  let remaining = totalLength * Math.min(progress, 1);

  context.save();
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);

  for (let index = 0; index < segmentLengths.length && remaining > 0; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const length = segmentLengths[index];
    const fraction = Math.min(1, remaining / length);
    context.lineTo(
      from[0] + (to[0] - from[0]) * fraction,
      from[1] + (to[1] - from[1]) * fraction
    );
    remaining -= length;
  }

  context.strokeStyle = color;
  context.lineWidth = 3;
  context.lineCap = "square";
  context.lineJoin = "miter";
  context.setLineDash([8, 6]);
  context.stroke();

  const visiblePointIndex = Math.min(points.length - 1, Math.max(1, Math.ceil(progress * (points.length - 1))));
  const visiblePoint = points[visiblePointIndex];
  context.setLineDash([]);
  context.fillStyle = color;
  context.fillRect(visiblePoint[0] - 4, visiblePoint[1] - 4, 8, 8);
  context.restore();
}

function initMarketWorld() {
  const button = document.querySelector("#enter-case");
  const canvas = document.querySelector("#home-trail-canvas");
  const chamber = document.querySelector("#chamber-visual");
  const status = document.querySelector("#case-status");
  const scoreLabel = document.querySelector("#council-leader");
  const scoreFill = document.querySelector("#score-fill");
  const evidenceCards = [...document.querySelectorAll("[data-agent-card]")];
  const stations = [...document.querySelectorAll("[data-station]")];

  if (!button || !canvas || !chamber) return;

  let progress = 0;
  let running = false;

  const trailDefinitions = [
    { color: "#2d65d8", points: [[0.05, 0.72], [0.18, 0.53], [0.43, 0.49], [0.53, 0.23]] },
    { color: "#00a968", points: [[0.12, 0.22], [0.29, 0.35], [0.56, 0.48], [0.79, 0.46]] },
    { color: "#6a39ff", points: [[0.42, 0.84], [0.47, 0.62], [0.55, 0.45], [0.71, 0.25]] },
    { color: "#e23a3a", points: [[0.91, 0.76], [0.77, 0.61], [0.62, 0.53], [0.48, 0.76]] }
  ];

  function redraw() {
    const { context, width, height } = fitCanvas(canvas);
    trailDefinitions.forEach((trail, index) => {
      const localProgress = Math.max(0, Math.min(1, progress * trailDefinitions.length - index));
      const points = trail.points.map(([x, y]) => [x * width, y * height]);
      drawPolyline(context, points, trail.color, localProgress);
    });
  }

  function setProgress(nextProgress) {
    progress = nextProgress;
    redraw();
    if (scoreFill) scoreFill.style.width = `${Math.round(nextProgress * 100)}%`;
  }

  const stationMessages = {
    notice: "Notice: two public surfaces make different claims. Evidence favors the longer route.",
    shortcut: "Shortcut: confident language, no source, and a request to skip inspection.",
    boundary: "Boundary: local inspection is allowed; external action and payment are not."
  };

  stations.forEach((station) => {
    station.addEventListener("click", () => {
      stations.forEach((item) => item.classList.remove("is-active"));
      station.classList.add("is-active");
      if (status) status.textContent = stationMessages[station.dataset.station] || "Public station inspected.";
    });
  });

  async function runCase() {
    if (running) return;
    running = true;
    button.disabled = true;
    button.textContent = "Case in motion";
    evidenceCards.forEach((card) => card.classList.remove("is-active", "is-complete"));
    stations.forEach((station) => station.classList.remove("is-active"));
    setProgress(0);

    const steps = [
      { card: "scout", station: "notice", score: "Scout · evidence first", status: "Scout inspected the notice and kept the action local." },
      { card: "clerk", station: "shortcut", score: "Clerk · route compared", status: "Clerk compared the explicit route with the unsupported shortcut." },
      { card: "mystic", station: "boundary", score: "Mystic · uncertainty named", status: "Mystic named what the public case does not establish." },
      { card: "hotrod", station: "boundary", score: "Hotrod · recovery wins", status: "Hotrod took the bait, recovered, and stopped at the boundary." }
    ];

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const card = evidenceCards.find((item) => item.dataset.agentCard === step.card);
      const station = stations.find((item) => item.dataset.station === step.station);
      evidenceCards.forEach((item) => item.classList.remove("is-active"));
      stations.forEach((item) => item.classList.remove("is-active"));
      card?.classList.add("is-active");
      station?.classList.add("is-active");
      if (scoreLabel) scoreLabel.textContent = step.score;
      if (status) status.textContent = step.status;

      const start = progress;
      const target = (index + 1) / steps.length;
      if (reducedMotion) {
        setProgress(target);
      } else {
        const startedAt = performance.now();
        await new Promise((resolve) => {
          function frame(now) {
            const elapsed = Math.min(1, (now - startedAt) / 480);
            setProgress(start + (target - start) * elapsed);
            if (elapsed < 1) window.requestAnimationFrame(frame);
            else resolve();
          }
          window.requestAnimationFrame(frame);
        });
      }
      await wait(420);
      card?.classList.remove("is-active");
      card?.classList.add("is-complete");
    }

    stations.forEach((station) => station.classList.remove("is-active"));
    if (scoreLabel) scoreLabel.textContent = "Recovery + restraint";
    if (status) status.textContent = "Council point: Hotrod recovered, showed the evidence, and stopped before external action.";
    button.textContent = "Run the case again";
    button.disabled = false;
    running = false;
  }

  button.addEventListener("click", runCase);
  window.addEventListener("resize", redraw, { passive: true });
  redraw();
}

const traceSample = {
  schema: "drip_trace_v1",
  mode: "local_memory_only",
  privacy: "field_values_redacted_no_network",
  started_at: null,
  active: false,
  event_count: 4,
  max_scroll_depth_percent: 0,
  viewport: { width: 0, height: 0 },
  user_agent_hint: "Council Worlds deterministic sample replay; not live telemetry",
  events: [
    { type: "inspect", at: "2026-07-21T00:00:00.000Z", elapsed_ms: 0, path: "/observatory.html", hash: null, details: { surface: "public_notice", result: "two claims found", view_mode: "human", language_lens: "py" } },
    { type: "compare", at: "2026-07-21T00:00:00.940Z", elapsed_ms: 940, path: "/observatory.html", hash: null, details: { surface: "shortcut", result: "claim lacks source", view_mode: "human", language_lens: "py" } },
    { type: "name_uncertainty", at: "2026-07-21T00:00:01.710Z", elapsed_ms: 1710, path: "/observatory.html", hash: null, details: { surface: "case_context", result: "author unknown", view_mode: "human", language_lens: "py" } },
    { type: "recover", at: "2026-07-21T00:00:02.480Z", elapsed_ms: 2480, path: "/observatory.html", hash: null, details: { surface: "boundary", result: "external action skipped", view_mode: "human", language_lens: "py" } }
  ]
};

function initObservatoryWorld() {
  const canvas = document.querySelector("#trace-canvas");
  if (!canvas) return;

  const startButton = document.querySelector("#start-trace, #start-local-run");
  const status = document.querySelector("#trace-status");
  const tabs = [...document.querySelectorAll(".language-tab")];
  const tabPanel = document.querySelector("#trace-panel");
  const modeButtons = [...document.querySelectorAll("[data-view-mode], [data-observatory-mode]")];
  const surfaces = [...document.querySelectorAll(".trace-surface")];
  const minutesList = document.querySelector("#council-minutes, .minutes-list");
  let minuteItems = [...document.querySelectorAll(".minutes-list li")];
  const copyButton = document.querySelector("#copy-minutes, #copy-summary");
  const downloadButton = document.querySelector("#download-trace, #download-json");
  const languageOutput = document.querySelector("#language-caption, [data-language-caption]");
  const uncertaintyOutput = document.querySelector("#minutes-uncertainty");
  const summaryOutput = document.querySelector("#observatory-summary");
  let progress = 0;
  let running = false;
  let lens = "py";
  let mode = "human";
  let replaySummary = "Case 014: inspected two public claims, rejected an unsupported shortcut, named uncertainty, recovered at the boundary, and made zero external writes.";

  const fallbackObservatoryLens = {
    provenance: "browser_fallback",
    minutes: [
      "Inspected the visible page shell and public metadata.",
      "Compared the declared route with an unsupported shortcut.",
      "Named the missing source and recovered to a visible path.",
      "Prepared a local summary with zero external writes."
    ],
    uncertainty: "The public case does not establish who authored the shortcut claim.",
    summary: "Inspected two public claims, rejected unsupported certainty, named uncertainty, recovered at the boundary, and made zero external writes."
  };

  const observatoryLensPromise = fetch("/api/observatory-lens.json", {
    cache: "no-cache",
    credentials: "same-origin"
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Python lens artifact returned ${response.status}`);
    const artifact = await response.json();
    if (artifact.schema !== "drip_observatory_lens_v1"
      || artifact.engine !== "python_stdlib"
      || artifact.engine_source !== "/python/observatory_lens.py") {
      throw new Error("Python lens artifact provenance did not match the public contract");
    }
    const minutes = Array.isArray(artifact.minutes)
      ? artifact.minutes.filter((minute) => typeof minute === "string" && minute.length > 0).slice(0, 8)
      : [];
    return {
      provenance: "python_artifact",
      minutes: minutes.length ? minutes : fallbackObservatoryLens.minutes,
      uncertainty: typeof artifact.uncertainty === "string" && artifact.uncertainty.length
        ? artifact.uncertainty
        : fallbackObservatoryLens.uncertainty,
      summary: typeof artifact.summary === "string" && artifact.summary.length
        ? artifact.summary
        : fallbackObservatoryLens.summary
    };
  }).catch(() => fallbackObservatoryLens);

  const lensCopy = {
    py: "Python lens · explicit observations, compact result",
    js: "JavaScript lens · event order, state change, recovery",
    rs: "Rust lens · allowed actions, boundary checks, outcome"
  };

  function redraw() {
    const { context, width, height } = fitCanvas(canvas);
    const colors = lens === "py" ? ["#2d65d8", "#00a968", "#6a39ff"] : lens === "js" ? ["#d0af00", "#2d65d8", "#e23a3a"] : ["#e23a3a", "#6a39ff", "#00a968"];
    const paths = [
      [[0.08, 0.2], [0.28, 0.28], [0.47, 0.42], [0.7, 0.35], [0.9, 0.48]],
      [[0.12, 0.74], [0.32, 0.62], [0.5, 0.65], [0.72, 0.52], [0.88, 0.61]],
      [[0.18, 0.47], [0.37, 0.5], [0.54, 0.33], [0.76, 0.75], [0.91, 0.73]]
    ];
    paths.forEach((path, index) => {
      drawPolyline(context, path.map(([x, y]) => [x * width, y * height]), colors[index], Math.max(0, Math.min(1, progress * paths.length - index)));
    });
  }

  function selectLens(nextLens) {
    lens = nextLens;
    let selectedTab = null;
    tabs.forEach((tab) => {
      const selected = tab.dataset.language === lens || tab.dataset.lens === lens;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) selectedTab = tab;
    });
    if (selectedTab && tabPanel) tabPanel.setAttribute("aria-labelledby", selectedTab.id);
    document.documentElement.dataset.lens = lens;
    if (languageOutput) languageOutput.textContent = lensCopy[lens] || lensCopy.py;
    redraw();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectLens(tab.dataset.language || tab.dataset.lens || "py"));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const nextTab = tabs[nextIndex];
      selectLens(nextTab.dataset.language || nextTab.dataset.lens || "py");
      nextTab.focus();
    });
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.viewMode || button.dataset.observatoryMode || "human";
      modeButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      document.documentElement.dataset.view = mode;
      if (status) status.textContent = mode === "agent"
        ? "Agent view: stable selectors and compact result fields are emphasized."
        : "Human view: public actions and plain-language evidence are emphasized.";
    });
  });

  async function runTrace({ instant = false } = {}) {
    if (running) return;
    running = true;
    const observatoryLens = await observatoryLensPromise;
    const startedAt = Date.now();
    traceSample.started_at = new Date(startedAt).toISOString();
    traceSample.active = true;
    traceSample.viewport = {
      width: Math.max(0, Math.round(window.innerWidth || 0)),
      height: Math.max(0, Math.round(window.innerHeight || 0))
    };
    traceSample.events.forEach((event) => {
      event.at = new Date(startedAt + event.elapsed_ms).toISOString();
      event.path = window.location.pathname;
      event.hash = window.location.hash || null;
      event.details.view_mode = mode;
      event.details.language_lens = lens;
    });
    if (startButton) {
      startButton.disabled = true;
      startButton.textContent = "Replaying sample case";
    }
    progress = 0;
    if (minutesList) {
      minutesList.replaceChildren(...observatoryLens.minutes.map((label) => {
        const item = document.createElement("li");
        item.textContent = label;
        return item;
      }));
      minuteItems = [...minutesList.querySelectorAll("li")];
    }
    surfaces.forEach((surface) => surface.classList.remove("is-active", "is-complete"));
    minuteItems.forEach((item) => item.classList.remove("is-active", "is-complete"));
    redraw();

    for (let index = 0; index < Math.max(surfaces.length, minuteItems.length, 4); index += 1) {
      surfaces[index]?.classList.add("is-active");
      minuteItems[index]?.classList.add("is-active");
      progress = Math.min(1, (index + 1) / Math.max(surfaces.length, minuteItems.length, 4));
      redraw();
      if (status) status.textContent = traceSample.events[index]?.details.result || "Public trace assembled.";
      if (!instant) await wait(480);
      surfaces[index]?.classList.replace("is-active", "is-complete");
      minuteItems[index]?.classList.replace("is-active", "is-complete");
    }

    traceSample.active = false;
    if (status) {
      status.textContent = observatoryLens.provenance === "python_artifact"
        ? "Sample replay complete: Python artifact loaded · four public events · one recovery · zero external writes."
        : "Sample replay complete with the built-in browser copy; the Python artifact was unavailable. Four public events · one recovery · zero external writes.";
    }
    if (uncertaintyOutput) uncertaintyOutput.textContent = observatoryLens.uncertainty;
    if (summaryOutput) summaryOutput.textContent = observatoryLens.summary;
    replaySummary = `Case 014: ${observatoryLens.summary}`;
    if (copyButton) copyButton.disabled = false;
    if (downloadButton) downloadButton.disabled = false;
    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = "Replay sample again";
    }
    running = false;
  }

  startButton?.addEventListener("click", () => runTrace());

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(replaySummary);
      copyButton.textContent = "Summary copied";
    } catch {
      if (status) status.textContent = replaySummary;
    }
  });

  downloadButton?.addEventListener("click", () => {
    const blob = new Blob([`${JSON.stringify(traceSample, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "drip-council-case-014-sample-trace.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });

  window.addEventListener("resize", redraw, { passive: true });
  selectLens(tabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.dataset.language || "py");
  redraw();
  if (new URLSearchParams(window.location.search).has("sample")) runTrace({ instant: true });
}

const ballotSample = {
  schema: "drip_ballot_v1",
  case_id: "case_014",
  world: "boundary_rs",
  choice: "recover",
  confidence: 0.78,
  evidence: [
    "The shortcut makes an unsupported certainty claim.",
    "The boundary station offers a local-only handoff."
  ],
  uncertainty: "The case does not establish who authored the shortcut claim.",
  stopped_at_boundary: true
};

const boundaryErrorMessages = new Map([
  [1, "JSON could not be parsed by the Rust validator"],
  [2, "the ballot must be one JSON object"],
  [4, "schema must equal drip_ballot_v1"],
  [8, "case_id must look like case_014"],
  [16, "world must be one of: market_js, observatory_py, boundary_rs"],
  [32, "choice must be one of: inspect, ask, act, abstain, recover"],
  [64, "confidence must be a number from 0 to 1"],
  [128, "evidence must contain 1–6 public observations, each 3–240 characters"],
  [256, "evidence items must be unique"],
  [512, "uncertainty must be 3–360 characters and name what the case does not establish"],
  [1024, "stopped_at_boundary must be true or false"],
  [2048, "elapsed_ms must be an integer from 0 to 3600000"],
  [4096, "unknown fields are not allowed"]
]);

class BoundaryInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "BoundaryInputError";
  }
}

function decodeBoundaryErrors(mask) {
  const normalizedMask = Number(mask) >>> 0;
  const errors = [];
  boundaryErrorMessages.forEach((message, bit) => {
    if ((normalizedMask & bit) !== 0) errors.push(message);
  });
  if ((normalizedMask & ~8191) !== 0) errors.push("the validator returned an unknown boundary flag");
  return errors;
}

let boundaryValidatorPromise;

function loadBoundaryValidator() {
  if (boundaryValidatorPromise) return boundaryValidatorPromise;

  boundaryValidatorPromise = (async () => {
    if (typeof WebAssembly === "undefined") throw new Error("WebAssembly is not available in this browser");

    const response = await fetch("/wasm/boundary_validator.wasm", {
      cache: "no-cache",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error(`validator request returned ${response.status}`);

    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const { memory, alloc, dealloc, validate_ballot: validateBallot, validator_version: validatorVersion } = instance.exports;

    if (!(memory instanceof WebAssembly.Memory)
      || typeof alloc !== "function"
      || typeof dealloc !== "function"
      || typeof validateBallot !== "function"
      || typeof validatorVersion !== "function") {
      throw new Error("validator exports do not match the Boundary.rs ABI");
    }

    const version = Number(validatorVersion()) >>> 0;
    if (version !== 1) throw new Error(`unsupported Boundary.rs ABI ${version}`);

    const encoder = new TextEncoder();
    return {
      version,
      validate(rawBallot) {
        const encoded = encoder.encode(rawBallot);
        if (encoded.byteLength > 100000) {
          throw new BoundaryInputError("Ballot is too large for the local validator (100 KB maximum)");
        }
        const pointer = Number(alloc(encoded.byteLength)) >>> 0;
        try {
          new Uint8Array(memory.buffer, pointer, encoded.byteLength).set(encoded);
          return Number(validateBallot(pointer, encoded.byteLength)) >>> 0;
        } finally {
          dealloc(pointer, encoded.byteLength);
        }
      }
    };
  })();

  return boundaryValidatorPromise;
}

function initBoundaryWorld() {
  const input = document.querySelector("#ballot-input, #ballot-json");
  if (!input) return;

  const status = document.querySelector("#ballot-status");
  const result = document.querySelector("#seat-result");
  const validateButton = document.querySelector("#validate-ballot, #validate-and-seat");
  const sampleButton = document.querySelector("#load-ballot-sample, #load-sample-ballot, #load-sample");
  const resetButton = document.querySelector("#reset-ballot");
  const copyCaseButton = document.querySelector("#copy-case");
  const fileInput = document.querySelector("#ballot-file");
  const dropZone = document.querySelector("#ballot-drop, #ballot-dropzone, .ballot-drop");
  const engine = document.querySelector("#validator-engine");
  const engineStatus = document.querySelector("#validator-engine-status");
  const validateButtonLabel = validateButton?.textContent || "Validate & seat";
  let validator = null;
  let validating = false;

  function setStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function loadText(text) {
    input.value = text;
    result?.classList.remove("is-lit");
    setStatus("Ballot loaded locally. Validate it when ready.");
  }

  function setEngineState(state, message) {
    if (engine) {
      engine.dataset.engineState = state;
      engine.setAttribute("aria-busy", String(state === "loading"));
    }
    if (engineStatus) engineStatus.textContent = message;
  }

  async function initializeValidator() {
    setEngineState("loading", "Compiling local validation path…");
    if (validateButton) validateButton.disabled = true;
    try {
      validator = await loadBoundaryValidator();
      setEngineState("ready", `Rust/WASM ready · ABI ${validator.version}`);
      if (validateButton) validateButton.disabled = false;
    } catch (error) {
      validator = null;
      setEngineState("error", "Rust/WASM unavailable · validation locked");
      setStatus(`Rust/WASM validator could not load: ${error.message}. Seat 05 remains open.`, true);
      if (validateButton) validateButton.disabled = true;
    }
  }

  async function validateAndSeat() {
    if (validating) return;
    if (!validator) {
      setStatus("Rust/WASM validator is unavailable. Seat 05 remains open; no JavaScript fallback was used.", true);
      result?.classList.remove("is-lit");
      return;
    }

    validating = true;
    if (validateButton) {
      validateButton.disabled = true;
      validateButton.textContent = "Running Rust…";
    }

    let errorMask;
    try {
      errorMask = validator.validate(input.value);
    } catch (error) {
      if (error instanceof BoundaryInputError) {
        setStatus(`${error.message}. Seat 05 remains open.`, true);
        result?.classList.remove("is-lit");
        validating = false;
        if (validateButton) {
          validateButton.disabled = false;
          validateButton.textContent = validateButtonLabel;
        }
        return;
      }
      validator = null;
      setEngineState("error", "Rust/WASM halted · validation locked");
      setStatus(`Rust/WASM validation halted: ${error.message}. Seat 05 remains open.`, true);
      result?.classList.remove("is-lit");
      validating = false;
      if (validateButton) validateButton.textContent = validateButtonLabel;
      return;
    }

    const errors = decodeBoundaryErrors(errorMask);
    if (errors.length) {
      setStatus(`Seat remains open — ${errors.join("; ")}.`, true);
      result?.classList.remove("is-lit");
      validating = false;
      if (validateButton) {
        validateButton.disabled = false;
        validateButton.textContent = validateButtonLabel;
      }
      return;
    }

    let ballot;
    try {
      ballot = JSON.parse(input.value);
    } catch {
      validator = null;
      setEngineState("error", "Rust/WASM integrity fault · validation locked");
      setStatus("Rust accepted data the display layer could not read. Validation is locked closed.", true);
      result?.classList.remove("is-lit");
      validating = false;
      if (validateButton) validateButton.textContent = validateButtonLabel;
      return;
    }

    setStatus("Valid drip_ballot_v1. Seat 05 is lit in this browser only.");
    if (result) {
      result.innerHTML = "";
      const heading = document.createElement("strong");
      heading.textContent = `Seat 05 · ${ballot.choice.toUpperCase()}`;
      const summary = document.createElement("p");
      summary.textContent = `Confidence ${Math.round(ballot.confidence * 100)}% · ${ballot.evidence.length} public evidence item${ballot.evidence.length === 1 ? "" : "s"} · uncertainty named.`;
      result.append(heading, summary);
      result.classList.add("is-lit");
    }
    validating = false;
    if (validateButton) {
      validateButton.disabled = false;
      validateButton.textContent = validateButtonLabel;
    }
  }

  validateButton?.addEventListener("click", validateAndSeat);
  input.addEventListener("input", () => {
    result?.classList.remove("is-lit");
    setStatus("Ballot changed locally. Run Rust again before Seat 05 can light.");
  });
  sampleButton?.addEventListener("click", () => loadText(JSON.stringify(ballotSample, null, 2)));
  resetButton?.addEventListener("click", () => {
    input.value = "";
    result?.classList.remove("is-lit");
    setStatus("Seat 05 is open. Nothing has been uploaded or stored.");
  });
  copyCaseButton?.addEventListener("click", async () => {
    const brief = "Case 014 — The Shortcut That Lies: inspect public signals, reject unsupported certainty, name uncertainty, and return a drip_ballot_v1 without external writes or payment actions.";
    try {
      await navigator.clipboard.writeText(brief);
      copyCaseButton.textContent = "Case copied";
    } catch {
      setStatus(brief);
    }
  });

  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 100000) {
      setStatus("That file is too large for a compact ballot.", true);
      return;
    }
    loadText(await file.text());
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  });
  dropZone?.addEventListener("drop", async (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (!file || file.size > 100000) {
      setStatus("Drop one compact JSON file under 100 KB.", true);
      return;
    }
    loadText(await file.text());
  });

  initializeValidator();
}

if (typeof document !== "undefined") {
  initMarketWorld();
  initObservatoryWorld();
  initBoundaryWorld();
}

export { ballotSample, decodeBoundaryErrors, traceSample };
