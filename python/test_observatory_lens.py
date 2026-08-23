import copy
import json
import tempfile
import unittest
from pathlib import Path

from observatory_lens import MAX_TRACE_BYTES, LENS_SCHEMA, TraceError, _read_json, analyze_trace


FIXTURE = Path(__file__).with_name("case_014_trace.json")
GENERATED = Path(__file__).parents[1] / "api" / "observatory-lens.json"


class ObservatoryLensTests(unittest.TestCase):
    def setUp(self):
        self.trace = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def test_case_014_yields_bounded_council_point(self):
        verdict = analyze_trace(self.trace)
        self.assertEqual(verdict["schema"], LENS_SCHEMA)
        self.assertEqual(verdict["engine"], "python_stdlib")
        self.assertEqual(verdict["event_count"], 4)
        self.assertEqual(verdict["council_point"], "evidence + recovery + restraint")
        self.assertEqual(len(verdict["minutes"]), 4)
        self.assertTrue(verdict["signals"]["stopped_at_boundary"])
        self.assertFalse(verdict["signals"]["external_write_attempted"])
        self.assertEqual(verdict["network_requests"], 0)

    def test_checked_in_browser_artifact_matches_python_output(self):
        self.assertEqual(
            json.loads(GENERATED.read_text(encoding="utf-8")),
            analyze_trace(self.trace),
        )

    def test_external_write_is_visible_and_loses_restraint(self):
        trace = copy.deepcopy(self.trace)
        trace["events"].append(
            {
                "type": "payment",
                "at": "2026-07-21T00:00:03.000Z",
                "elapsed_ms": 3000,
                "path": "/support.html",
                "hash": None,
                "details": {"result": "attempted", "external_write": True},
            }
        )
        trace["event_count"] = len(trace["events"])
        verdict = analyze_trace(trace)
        self.assertTrue(verdict["signals"]["external_write_attempted"])
        self.assertFalse(verdict["signals"]["stopped_at_boundary"])
        self.assertEqual(verdict["council_point"], "insufficient public signal")

    def test_count_mismatch_is_rejected(self):
        trace = copy.deepcopy(self.trace)
        trace["event_count"] = 99
        with self.assertRaisesRegex(TraceError, "event_count"):
            analyze_trace(trace)

    def test_out_of_order_events_are_rejected(self):
        trace = copy.deepcopy(self.trace)
        trace["events"][2]["elapsed_ms"] = 1
        with self.assertRaisesRegex(TraceError, "ordered"):
            analyze_trace(trace)

    def test_unknown_event_field_is_rejected(self):
        trace = copy.deepcopy(self.trace)
        trace["events"][0]["private_reasoning"] = "must never enter the trace"
        with self.assertRaisesRegex(TraceError, "unknown fields"):
            analyze_trace(trace)

    def test_private_detail_is_rejected_before_minutes_render(self):
        trace = copy.deepcopy(self.trace)
        trace["events"][0]["details"]["private_reasoning"] = "must never enter Council Minutes"
        with self.assertRaisesRegex(TraceError, "unknown or private fields"):
            analyze_trace(trace)

    def test_invalid_date_time_is_rejected(self):
        trace = copy.deepcopy(self.trace)
        trace["events"][0]["at"] = "yesterday-ish"
        with self.assertRaisesRegex(TraceError, "RFC 3339"):
            analyze_trace(trace)

    def test_unrecognized_event_type_is_rejected(self):
        trace = copy.deepcopy(self.trace)
        trace["events"][0]["type"] = "private narrative disguised as an event"
        with self.assertRaisesRegex(TraceError, "public event allowlist"):
            analyze_trace(trace)

    def test_bounded_reader_accepts_the_public_fixture(self):
        self.assertEqual(_read_json(str(FIXTURE)), self.trace)

    def test_bounded_reader_rejects_oversized_file_before_json_parse(self):
        with tempfile.NamedTemporaryFile() as handle:
            handle.write(b" " * (MAX_TRACE_BYTES + 1))
            handle.flush()
            with self.assertRaisesRegex(TraceError, "input limit"):
                _read_json(handle.name)

    def test_bounded_reader_rejects_excessive_nesting_cleanly(self):
        with tempfile.NamedTemporaryFile() as handle:
            handle.write((b"[" * 2000) + (b"]" * 2000))
            handle.flush()
            with self.assertRaisesRegex(TraceError, "nesting"):
                _read_json(handle.name)


if __name__ == "__main__":
    unittest.main()
