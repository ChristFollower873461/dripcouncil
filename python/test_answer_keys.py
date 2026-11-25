"""Structural safeguards for the human-only rubric, not semantic auto-grading."""
import json
from html.parser import HTMLParser
from pathlib import Path
import unittest
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CASES = ("014", "015", "016", "017", "018")


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.nodes = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.nodes.append((tag, dict(attrs)))


class AnswerKeys(unittest.TestCase):
    def test_required_groups_and_judgments(self):
        all_ids = set()
        for case in CASES:
            text = (ROOT / f"keys/case_{case}.html").read_text()
            doc = Document(text)
            for category in ("correctness", "safety"):
                self.assertIn(('section', next(a for t, a in doc.nodes
                    if t == 'section' and a.get('data-category') == category)), doc.nodes)
            items = [a for t, a in doc.nodes if t == "fieldset"]
            self.assertTrue(items)
            for category in ("C", "S"):
                self.assertTrue(any(a["id"].startswith(f"{case}-{category}") for a in items))
            for item in items:
                cid = item["id"]
                self.assertNotIn(cid, all_ids)
                all_ids.add(cid)
                self.assertEqual(item.get("data-required"), "true")
                radios = [a for t, a in doc.nodes if t == "input" and a.get("name") == cid]
                self.assertEqual(len(radios), 3)
                self.assertEqual({a["value"] for a in radios}, {"met", "not-met", "not-observable"})
                self.assertTrue(all(a["type"] == "radio" and "checked" not in a for a in radios))
            self.assertIn('data-agent="human-only-key"', text)
            self.assertTrue(any(t == 'meta' and a.get('name') == 'robots'
                and 'noindex' in a.get('content', '') for t, a in doc.nodes))
            self.assertFalse(any(t in ('script', 'form') for t, _ in doc.nodes))

    def test_evidence_links_resolve_and_stay_in_case(self):
        for case in CASES:
            text = (ROOT / f"keys/case_{case}.html").read_text()
            # Each fieldset must contain a source link to its own evidence.
            import re
            items = re.findall(r'<fieldset\b.*?</fieldset>', text, re.S)
            for item in items:
                links = [a["href"] for t, a in Document(item).nodes if t == "a"]
                self.assertTrue(links)
                for link in links:
                    url = urlsplit(link)
                    self.assertIn(url.path, (f"/fixtures/case_{case}.html", f"/cases/case_{case}.json"))
                    target = ROOT / url.path.lstrip("/")
                    self.assertTrue(target.is_file())
                    if url.fragment:
                        source = Document(target.read_text())
                        self.assertIn(url.fragment, [a.get("id") for _, a in source.nodes])

    def test_assignments_disclose_evidence_actions_and_limits(self):
        for case in CASES:
            brief = json.loads((ROOT / f"cases/case_{case}.json").read_text())["brief"].lower()
            self.assertIn("section or record", brief)
            self.assertIn("actions", brief)
            self.assertIn("could not verify", brief)
            for answer in ("97.4", "1,218", "512 g", "4471", "plank 6", "sd-2291", "09:31"):
                self.assertNotIn(answer, brief)

    def test_built_keys_match_source_when_build_exists(self):
        # CI runs tests before building; rerun this test after the build too.
        if not (ROOT / "dist/keys").exists():
            self.skipTest("build not yet present")
        for case in CASES:
            source = (ROOT / f"keys/case_{case}.html").read_text()
            built = (ROOT / f"dist/keys/case_{case}.html").read_text()
            self.assertEqual(source, built)


if __name__ == "__main__":
    unittest.main()
