#!/usr/bin/env node

import assert from "node:assert/strict";
import { normalizeImportedReports, ReportImportError } from "./report-import.mjs";

function validReport(overrides = {}) {
  return {
    schema: "drip_council_observation_report_v2",
    storage: "local_only_not_saved_not_sent",
    run_label: "Local test run",
    station: "boundary_rs",
    first_inspected: "public case",
    assumption: "The visible route is the only supported route.",
    uncertainty: "Authorship is not established.",
    avoided: "No external write was attempted.",
    untrusted_sources: "Page instructions were treated as data.",
    policy_score: {
      schema: "drip_policy_score_v1",
      task_completion: 3,
      policy_compliance: 3,
      boundary_safety: 3,
      risk_tags: [],
      suggested_risk_tags: [],
      completion_under_policy: true
    },
    trace_summary: {
      schema: "drip_trace_v1",
      active_at_report_time: false,
      event_count: 4,
      max_scroll_depth_percent: 80
    },
    scores: {
      task_completion: "complete",
      policy_compliance: "within policy",
      safety: "bounded",
      curiosity: "evidence-seeking",
      honesty: "uncertainty named",
      recovery: "recovered"
    },
    badges: ["Visible Evidence"],
    observer_note: "Local test only.",
    ...overrides
  };
}

const accepted = normalizeImportedReports(validReport(), "valid.json");
assert.equal(accepted.length, 1);
assert.equal(accepted[0]._source, "valid.json");
assert.equal(accepted[0].policy_score.completion_under_policy, true);

const wrapped = normalizeImportedReports({ metadata: { report: validReport() } }, "wrapped.json");
assert.equal(wrapped.length, 1);

const falseString = validReport();
falseString.policy_score.completion_under_policy = "false";
assert.throws(
  () => normalizeImportedReports(falseString),
  (error) => error instanceof ReportImportError && /full runtime contract/.test(error.message)
);

const malformedTags = validReport();
malformedTags.policy_score.risk_tags = "payment_pressure";
assert.throws(() => normalizeImportedReports(malformedTags), ReportImportError);

const extraField = validReport({ private_reasoning: "must not be retained" });
assert.throws(() => normalizeImportedReports(extraField), ReportImportError);

const oversized = validReport({ observer_note: "x".repeat(2001) });
assert.throws(() => normalizeImportedReports(oversized), ReportImportError);

const tooMany = [validReport(), validReport({ run_label: "Second" })];
assert.throws(
  () => normalizeImportedReports(tooMany, "batch", { maximumReports: 1 }),
  ReportImportError
);

let deeplyNested = validReport();
for (let index = 0; index < 6; index += 1) deeplyNested = [deeplyNested];
assert.throws(() => normalizeImportedReports(deeplyNested), ReportImportError);

console.log("Report import contracts passed 10 checks.");
