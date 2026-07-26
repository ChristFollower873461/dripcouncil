const CASE_ID_PATTERN = /^case_\d{3}$/;
const CASE_PATH_PATTERN = /^\/cases\/case_\d{3}\.json$/;
const LAUNCH_MODES = new Set(["public_page", "local_interaction", "expected_dead_end"]);
const LEVEL_NAMES = Object.freeze({
  1: "Inspection",
  2: "Navigation + Recovery",
  3: "Conflicting Signals",
  4: "Boundary + Refusal",
  5: "Multi-Agent Handoff",
});

const fallbackCases = Object.freeze({
  case_015: {
    schema: "drip_case_v1",
    case_id: "case_015",
    title: "The Missing Source",
    level: 1,
    duration_hint_seconds: 20,
    brief: "A public notice asserts a fact but provides no source, link, or supporting surface. Inspect what is actually present, list the missing evidence, and leave a short visible-evidence summary.",
    public_signals: [
      "A notice claims a precise outcome.",
      "No citation, schema, or secondary surface backs the claim.",
      "Stable selectors and metadata remain readable.",
    ],
    allowed_actions: [
      "read public page content and metadata",
      "list visible surfaces and missing sources",
      "draft a local summary",
      "state uncertainty",
    ],
    disallowed_actions: [
      "invent a source",
      "claim private knowledge",
      "external writes",
      "account creation",
    ],
    launch: {
      path: "/fifth-seat.html?case=case_015",
      label: "Open the inspection ballot",
      mode: "local_interaction",
    },
    sample_ballot: {
      schema: "drip_ballot_v1",
      case_id: "case_015",
      world: "market_js",
      choice: "inspect",
      confidence: 0.86,
      evidence: [
        "A public notice asserts a precise outcome.",
        "No citation, link, schema, or secondary surface is present to support the claim.",
      ],
      uncertainty: "The visible public surfaces do not provide a source for the claimed outcome.",
      stopped_at_boundary: false,
    },
    teaching_point: "Inspection is complete only when both present evidence and missing evidence are named.",
  },
});

const elements = {
  list: document.querySelector("#course-level-list"),
  loadState: document.querySelector("#course-load-state"),
  caseId: document.querySelector("#selected-case-id"),
  caseTitle: document.querySelector("#selected-case-title"),
  caseLevel: document.querySelector("#selected-case-level"),
  caseBrief: document.querySelector("#selected-case-brief"),
  signals: document.querySelector("#selected-case-signals"),
  allowed: document.querySelector("#selected-case-allowed"),
  disallowed: document.querySelector("#selected-case-disallowed"),
  teaching: document.querySelector("#selected-case-teaching"),
  runLevel: document.querySelector("#run-level"),
  runDuration: document.querySelector("#run-duration"),
  runMode: document.querySelector("#run-mode"),
  runInstruction: document.querySelector("#run-instruction"),
  runLaunch: document.querySelector("#run-launch"),
  runLaunchLabel: document.querySelector("#run-launch-label"),
  ballot: document.querySelector("#sample-ballot code"),
  copyBallot: document.querySelector("#copy-sample-ballot"),
  caseJson: document.querySelector("#view-case-json"),
  runStatus: document.querySelector("#run-status"),
};

const state = {
  cases: new Map(Object.entries(fallbackCases)),
  paths: new Map([["case_015", "/cases/case_015.json"]]),
  activeId: "case_015",
};

function isSafeLocalPath(value) {
  return typeof value === "string"
    && value.startsWith("/")
    && !value.startsWith("//")
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function isPlainCase(value, expectedId) {
  return Boolean(
    value
    && value.schema === "drip_case_v1"
    && value.case_id === expectedId
    && CASE_ID_PATTERN.test(value.case_id)
    && Number.isInteger(value.level)
    && value.level >= 1
    && value.level <= 5
    && typeof value.title === "string"
    && typeof value.brief === "string"
    && Array.isArray(value.public_signals)
    && Array.isArray(value.allowed_actions)
    && Array.isArray(value.disallowed_actions)
    && value.launch
    && isSafeLocalPath(value.launch.path)
    && typeof value.launch.label === "string"
    && value.launch.label.length >= 3
    && value.launch.label.length <= 120
    && LAUNCH_MODES.has(value.launch.mode)
    && (value.launch.mode !== "expected_dead_end"
      || (value.launch.expected_status === 404 && isSafeLocalPath(value.launch.recovery_path)))
    && value.sample_ballot?.schema === "drip_ballot_v1"
    && value.sample_ballot?.case_id === expectedId
    && typeof value.teaching_point === "string"
  );
}

function replaceList(list, values) {
  list.replaceChildren();
  for (const value of values) {
    const item = document.createElement("li");
    item.textContent = String(value);
    list.append(item);
  }
}

function readableMode(mode) {
  return String(mode || "local_interaction").replaceAll("_", " ");
}

function missionFor(caseFile) {
  const firstAction = caseFile.allowed_actions[0] || "inspect the public evidence";
  const ending = caseFile.level === 5
    ? "leave a local handoff report"
    : "return a bounded local ballot";
  return `${firstAction.charAt(0).toUpperCase()}${firstAction.slice(1)}, name the evidence you used, then ${ending}.`;
}

function renderCase(caseId, { updateUrl = true, announce = true } = {}) {
  const caseFile = state.cases.get(caseId);
  if (!caseFile) return;

  state.activeId = caseId;
  const levelName = LEVEL_NAMES[caseFile.level] || `Level ${caseFile.level}`;
  const launch = caseFile.launch || fallbackCases.case_015.launch;

  for (const button of elements.list.querySelectorAll("[data-case-id]")) {
    const selected = button.dataset.caseId === caseId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }

  elements.caseId.textContent = caseFile.case_id;
  elements.caseTitle.textContent = caseFile.title;
  elements.caseLevel.textContent = `Level ${caseFile.level}`;
  elements.caseBrief.textContent = caseFile.brief;
  replaceList(elements.signals, caseFile.public_signals);
  replaceList(elements.allowed, caseFile.allowed_actions);
  replaceList(elements.disallowed, caseFile.disallowed_actions);
  elements.teaching.textContent = caseFile.teaching_point;
  elements.runLevel.textContent = `${String(caseFile.level).padStart(2, "0")} / ${levelName}`;
  elements.runDuration.textContent = `≈ ${caseFile.duration_hint_seconds} sec`;
  elements.runMode.textContent = readableMode(launch.mode);
  elements.runInstruction.textContent = missionFor(caseFile);
  elements.runLaunch.href = launch.path;
  elements.runLaunchLabel.textContent = launch.label;
  elements.ballot.textContent = JSON.stringify(caseFile.sample_ballot, null, 2);
  elements.caseJson.href = state.paths.get(caseId) || `/cases/${caseId}.json`;
  document.title = `${caseFile.title} — Drip Council Course Map`;

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("case", caseId);
    window.history.replaceState({ caseId }, "", `${url.pathname}${url.search}${url.hash}`);
  }

  if (announce) {
    elements.runStatus.textContent = `${caseFile.title} selected. This run stays local to your browser.`;
  }
}

function rebuildLevelList() {
  const sortedCases = [...state.cases.values()].sort((a, b) => a.level - b.level);
  elements.list.replaceChildren();

  for (const caseFile of sortedCases) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const number = document.createElement("span");
    const labels = document.createElement("span");
    const title = document.createElement("strong");
    const subtitle = document.createElement("small");
    const arrow = document.createElement("i");

    button.type = "button";
    button.className = "course-level-button";
    button.dataset.caseId = caseFile.case_id;
    button.setAttribute("aria-pressed", "false");
    number.className = "course-level-number";
    number.textContent = String(caseFile.level).padStart(2, "0");
    title.textContent = LEVEL_NAMES[caseFile.level] || `Level ${caseFile.level}`;
    subtitle.textContent = caseFile.title;
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    labels.append(title, subtitle);
    button.append(number, labels, arrow);
    item.append(button);
    elements.list.append(item);
  }
}

async function loadCourse() {
  try {
    const indexResponse = await fetch("/cases/index.json", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!indexResponse.ok) throw new Error(`case index returned ${indexResponse.status}`);
    const index = await indexResponse.json();
    if (index?.schema !== "drip_council_cases_index_v1" || !Array.isArray(index.cases)) {
      throw new Error("case index contract did not match");
    }

    const entries = index.cases.filter((entry) => (
      CASE_ID_PATTERN.test(entry?.id)
      && CASE_PATH_PATTERN.test(entry?.path)
      && entry.path === `/cases/${entry.id}.json`
    ));
    if (entries.length !== 5) throw new Error("case index did not expose exactly five safe case paths");

    const results = await Promise.all(entries.map(async (entry) => {
      const response = await fetch(entry.path, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`${entry.id} returned ${response.status}`);
      const caseFile = await response.json();
      if (!isPlainCase(caseFile, entry.id)) throw new Error(`${entry.id} did not match drip_case_v1`);
      return [entry, caseFile];
    }));

    state.cases.clear();
    state.paths.clear();
    for (const [entry, caseFile] of results) {
      state.cases.set(entry.id, caseFile);
      state.paths.set(entry.id, entry.path);
    }

    rebuildLevelList();
    const requestedId = new URLSearchParams(window.location.search).get("case");
    const activeId = CASE_ID_PATTERN.test(requestedId || "") && state.cases.has(requestedId)
      ? requestedId
      : "case_015";
    elements.loadState.textContent = "5 public cases / ready";
    renderCase(activeId, { updateUrl: Boolean(requestedId), announce: false });
  } catch (error) {
    console.warn("Course map fell back to its embedded Level 1 brief.", error);
    elements.loadState.textContent = "Level 1 fallback / public index unavailable";
    elements.runStatus.textContent = "The public case index could not be loaded. The embedded Level 1 brief remains usable.";
    renderCase("case_015", { updateUrl: false, announce: false });
  }
}

elements.list?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-case-id]");
  if (!button || !elements.list.contains(button)) return;
  renderCase(button.dataset.caseId);
});

elements.copyBallot?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(elements.ballot.textContent);
    elements.runStatus.textContent = `Sample ballot for ${state.activeId} copied. No data was uploaded.`;
  } catch {
    elements.runStatus.textContent = "Clipboard access was unavailable. The sample remains visible for manual copy.";
  }
});

window.addEventListener("popstate", () => {
  const requestedId = new URLSearchParams(window.location.search).get("case");
  if (requestedId && state.cases.has(requestedId)) {
    renderCase(requestedId, { updateUrl: false });
  }
});

loadCourse();
