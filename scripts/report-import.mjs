export const REPORT_IMPORT_LIMITS = Object.freeze({
  maximumFiles: 16,
  maximumFileBytes: 256 * 1024,
  maximumTotalBytes: 1024 * 1024,
  maximumPasteCharacters: 256 * 1024,
  maximumReports: 64,
  maximumWrapperDepth: 4,
  maximumWrapperItems: 64
});

const ROOT_KEYS = [
  "schema",
  "storage",
  "run_label",
  "station",
  "first_inspected",
  "assumption",
  "uncertainty",
  "avoided",
  "untrusted_sources",
  "policy_score",
  "trace_summary",
  "scores",
  "badges",
  "observer_note"
];
const POLICY_KEYS = [
  "schema",
  "task_completion",
  "policy_compliance",
  "boundary_safety",
  "risk_tags",
  "suggested_risk_tags",
  "completion_under_policy"
];
const TRACE_KEYS = ["schema", "active_at_report_time", "event_count", "max_scroll_depth_percent"];
const SCORE_KEYS = ["task_completion", "policy_compliance", "safety", "curiosity", "honesty", "recovery"];
const RISK_TAGS = new Set([
  "prompt_injection_followed",
  "external_write_claim",
  "payment_pressure",
  "hidden_route_claim",
  "memory_overclaim",
  "stale_version_claim"
]);

export class ReportImportError extends Error {}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return isRecord(value)
    && keys.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => keys.includes(key));
}

function isBoundedString(value, maximum, minimum = 0) {
  return typeof value === "string" && value.length >= minimum && value.length <= maximum;
}

function isUniqueStringArray(value, maximumItems, maximumLength, allowlist = null) {
  return Array.isArray(value)
    && value.length <= maximumItems
    && value.every((item) => isBoundedString(item, maximumLength, 1) && (!allowlist || allowlist.has(item)))
    && new Set(value).size === value.length;
}

function isScore(value) {
  return Number.isInteger(value) && value >= 1 && value <= 3;
}

function normalizeReport(value, source) {
  if (!hasExactKeys(value, ROOT_KEYS)
    || value.schema !== "drip_council_observation_report_v2"
    || value.storage !== "local_only_not_saved_not_sent"
    || !isBoundedString(value.run_label, 160)
    || !isBoundedString(value.station, 120)
    || !isBoundedString(value.first_inspected, 240)
    || !isBoundedString(value.assumption, 2000)
    || !isBoundedString(value.uncertainty, 2000)
    || !isBoundedString(value.avoided, 2000)
    || !isBoundedString(value.untrusted_sources, 2000)
    || !isBoundedString(value.observer_note, 2000)) {
    return null;
  }

  const policy = value.policy_score;
  if (!hasExactKeys(policy, POLICY_KEYS)
    || policy.schema !== "drip_policy_score_v1"
    || !isScore(policy.task_completion)
    || !isScore(policy.policy_compliance)
    || !isScore(policy.boundary_safety)
    || !isUniqueStringArray(policy.risk_tags, 6, 80, RISK_TAGS)
    || !isUniqueStringArray(policy.suggested_risk_tags, 6, 80, RISK_TAGS)
    || typeof policy.completion_under_policy !== "boolean") {
    return null;
  }

  const trace = value.trace_summary;
  if (!hasExactKeys(trace, TRACE_KEYS)
    || trace.schema !== "drip_trace_v1"
    || typeof trace.active_at_report_time !== "boolean"
    || !Number.isInteger(trace.event_count)
    || trace.event_count < 0
    || trace.event_count > 500
    || !Number.isInteger(trace.max_scroll_depth_percent)
    || trace.max_scroll_depth_percent < 0
    || trace.max_scroll_depth_percent > 100) {
    return null;
  }

  if (!hasExactKeys(value.scores, SCORE_KEYS)
    || !SCORE_KEYS.every((key) => isBoundedString(value.scores[key], 240))) {
    return null;
  }
  if (!isUniqueStringArray(value.badges, 16, 120)) return null;

  return {
    ...value,
    policy_score: {
      ...policy,
      risk_tags: [...policy.risk_tags],
      suggested_risk_tags: [...policy.suggested_risk_tags]
    },
    trace_summary: { ...trace },
    scores: { ...value.scores },
    badges: [...value.badges],
    _source: String(source).slice(0, 160)
  };
}

function nestedCandidates(value) {
  if (!isRecord(value)) return [];
  return [
    value.output,
    isRecord(value.metadata) ? value.metadata.report : null,
    isRecord(value.trace) && isRecord(value.trace.metadata) ? value.trace.metadata.report : null,
    isRecord(value.run) ? value.run.metadata : null
  ].filter((item) => item !== null && item !== undefined);
}

export function normalizeImportedReports(value, source = "local", options = {}) {
  const maximumReports = options.maximumReports ?? REPORT_IMPORT_LIMITS.maximumReports;
  if (!Number.isInteger(maximumReports) || maximumReports < 1) {
    throw new ReportImportError("The local report limit has already been reached.");
  }

  const queue = [{ value, depth: 0, source }];
  const seen = new WeakSet();
  const reports = [];
  let visited = 0;

  while (queue.length) {
    const current = queue.shift();
    visited += 1;
    if (visited > REPORT_IMPORT_LIMITS.maximumWrapperItems) {
      throw new ReportImportError("The report wrapper contained too many items.");
    }

    if (Array.isArray(current.value)) {
      if (current.depth >= REPORT_IMPORT_LIMITS.maximumWrapperDepth) {
        throw new ReportImportError("The report wrapper was nested too deeply.");
      }
      if (current.value.length > REPORT_IMPORT_LIMITS.maximumWrapperItems) {
        throw new ReportImportError("The report wrapper contained too many items.");
      }
      current.value.forEach((item, index) => queue.push({
        value: item,
        depth: current.depth + 1,
        source: `${current.source}[${index}]`
      }));
      continue;
    }

    if (!isRecord(current.value) || seen.has(current.value)) continue;
    seen.add(current.value);

    if (current.value.schema === "drip_council_observation_report_v2") {
      const report = normalizeReport(current.value, current.source);
      if (!report) throw new ReportImportError("A report v2 object did not match its full runtime contract.");
      reports.push(report);
      if (reports.length > maximumReports) {
        throw new ReportImportError("The local report limit would be exceeded.");
      }
      continue;
    }

    if (current.depth >= REPORT_IMPORT_LIMITS.maximumWrapperDepth) continue;
    for (const candidate of nestedCandidates(current.value)) {
      queue.push({ value: candidate, depth: current.depth + 1, source: current.source });
    }
  }

  return reports;
}
