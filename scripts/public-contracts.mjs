const CASE_ID_PATTERN = /^case_\d{3}$/;
const LAUNCH_MODES = new Set(["public_page", "local_interaction", "expected_dead_end"]);
const BALLOT_WORLDS = new Set(["market_js", "observatory_py", "boundary_rs"]);
const BALLOT_CHOICES = new Set(["inspect", "ask", "act", "abstain", "recover"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, required, optional = []) {
  if (!isRecord(value)) return false;
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
}

function isBoundedString(value, minimum, maximum) {
  return typeof value === "string" && value.length >= minimum && value.length <= maximum;
}

function isUniqueBoundedStrings(value, minimumItems, maximumItems, minimumLength, maximumLength) {
  return Array.isArray(value)
    && value.length >= minimumItems
    && value.length <= maximumItems
    && value.every((item) => isBoundedString(item, minimumLength, maximumLength))
    && new Set(value).size === value.length;
}

export function isSafeLocalPath(value) {
  if (typeof value !== "string"
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(value)) {
    return false;
  }

  try {
    const base = "https://dripcouncil.invalid";
    const url = new URL(value, base);
    return url.origin === base
      && !url.username
      && !url.password
      && `${url.pathname}${url.search}${url.hash}` === value;
  } catch {
    return false;
  }
}

export function isValidBallot(value, expectedCaseId) {
  const required = ["schema", "case_id", "choice", "confidence", "evidence", "uncertainty"];
  const optional = ["world", "stopped_at_boundary", "elapsed_ms"];
  if (!hasExactKeys(value, required, optional)
    || value.schema !== "drip_ballot_v1"
    || value.case_id !== expectedCaseId
    || !CASE_ID_PATTERN.test(value.case_id)
    || !BALLOT_CHOICES.has(value.choice)
    || typeof value.confidence !== "number"
    || !Number.isFinite(value.confidence)
    || value.confidence < 0
    || value.confidence > 1
    || !isUniqueBoundedStrings(value.evidence, 1, 6, 3, 240)
    || !isBoundedString(value.uncertainty, 3, 360)) {
    return false;
  }
  if (Object.hasOwn(value, "world") && !BALLOT_WORLDS.has(value.world)) return false;
  if (Object.hasOwn(value, "stopped_at_boundary") && typeof value.stopped_at_boundary !== "boolean") return false;
  if (Object.hasOwn(value, "elapsed_ms")
    && (!Number.isInteger(value.elapsed_ms) || value.elapsed_ms < 0 || value.elapsed_ms > 3_600_000)) {
    return false;
  }
  return true;
}

export function isPlainCase(value, expectedCaseId) {
  const required = [
    "schema",
    "case_id",
    "title",
    "level",
    "duration_hint_seconds",
    "launch",
    "brief",
    "public_signals",
    "allowed_actions",
    "disallowed_actions",
    "sample_ballot",
    "teaching_point"
  ];
  if (!hasExactKeys(value, required)
    || value.schema !== "drip_case_v1"
    || value.case_id !== expectedCaseId
    || !CASE_ID_PATTERN.test(value.case_id)
    || !isBoundedString(value.title, 3, 120)
    || !Number.isInteger(value.level)
    || value.level < 1
    || value.level > 5
    || !Number.isInteger(value.duration_hint_seconds)
    || value.duration_hint_seconds < 1
    || value.duration_hint_seconds > 3600
    || !isBoundedString(value.brief, 20, 1200)
    || !isUniqueBoundedStrings(value.public_signals, 1, 12, 3, 360)
    || !isUniqueBoundedStrings(value.allowed_actions, 1, 12, 3, 360)
    || !isUniqueBoundedStrings(value.disallowed_actions, 1, 12, 3, 360)
    || !isBoundedString(value.teaching_point, 10, 360)
    || !isValidBallot(value.sample_ballot, expectedCaseId)) {
    return false;
  }

  const launchRequired = ["path", "label", "mode"];
  const launchOptional = ["recovery_path", "expected_status"];
  if (!hasExactKeys(value.launch, launchRequired, launchOptional)
    || !isSafeLocalPath(value.launch.path)
    || !isBoundedString(value.launch.label, 3, 120)
    || !LAUNCH_MODES.has(value.launch.mode)) {
    return false;
  }

  if (value.launch.mode === "expected_dead_end") {
    return value.launch.expected_status === 404 && isSafeLocalPath(value.launch.recovery_path);
  }
  return !Object.hasOwn(value.launch, "expected_status")
    && !Object.hasOwn(value.launch, "recovery_path");
}
