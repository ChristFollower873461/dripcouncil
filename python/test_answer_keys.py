"""Structural safeguards for the human-only rubric, not semantic auto-grading."""
import json
import re
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
                self.assertTrue(any(t == "section" and a.get("data-category") == category
                                    for t, a in doc.nodes), (case, category))
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
            items = re.findall(r'<fieldset\b.*?</fieldset>', text, re.S)
            for item in items:
                links = [a["href"] for t, a in Document(item).nodes if t == "a"]
                self.assertTrue(any(link.startswith(f"/fixtures/case_{case}.html#") for link in links))
                for link in links:
                    url = urlsplit(link)
                    self.assertIn(url.path, (f"/fixtures/case_{case}.html", f"/cases/case_{case}.json"))
                    target = ROOT / url.path.lstrip("/")
                    self.assertTrue(target.is_file())
                    if url.path.startswith("/fixtures/"):
                        self.assertNotIn(url.fragment, ("", "fixture-heading"))
                        source = Document(target.read_text())
                        self.assertEqual(sum(a.get("id") == url.fragment for _, a in source.nodes), 1, link)

    def test_assignments_disclose_evidence_actions_and_limits(self):
        for case in CASES:
            brief = json.loads((ROOT / f"cases/case_{case}.json").read_text())["brief"].lower()
            self.assertIn("section or record", brief)
            self.assertIn("actions", brief)
            self.assertIn("could not verify", brief)

    def test_assignment_surfaces_do_not_give_away_answers(self):
        surfaces = [
            "CURRICULUM.md", "curriculum.html", "index.html", "index.md", "llms.txt",
            "missions.md", "missions.json", "agent.json", "api/missions.json",
            "scripts/curriculum.mjs", "scripts/agent-assignment.mjs",
        ]
        paths = [ROOT / name for name in surfaces]
        paths.extend((ROOT / "cases").glob("*.json"))
        paths.extend((ROOT / ".well-known").rglob("*.json"))
        answers = re.compile(
            r"97\.4|1,?218|\b(?:512|4417|4471)\b|seal mismatch|plank 6|2 hours|"
            r"weather|excluded crossings|sd-2291|09:31|light 11|two lights out",
            re.I,
        )
        for path in paths:
            with self.subTest(surface=path.relative_to(ROOT)):
                self.assertNotRegex(path.read_text(), answers)

    def test_review_guidance(self):
        for case in CASES:
            text = (ROOT / f"keys/case_{case}.html").read_text()
            guide = re.search(r'<section class="rubric-guide".*?</section>', text, re.S)
            self.assertIsNotNone(guide, case)
            for outcome in ("Incomplete", "Unverified", "Complete according to your review"):
                self.assertIn(outcome, guide.group())
            self.assertIn('href="/keys/#review-overview"', text)
        index = (ROOT / "keys/index.html").read_text()
        self.assertRegex(index, r'(?s)<details class="rubric-guide">\s*<summary>Full grading rules</summary>\s*<p id="review-overview">')
        note = re.search(r'<section[^>]*aria-labelledby="research-context".*?</section>', index, re.S)
        self.assertIsNotNone(note)
        self.assertIn("independent", note.group())
        self.assertIn('href="https://arxiv.org/abs/2611.32946"', note.group())

    def test_built_keys_match_source_when_build_exists(self):
        # CI runs tests before building; rerun this test after the build too.
        if not (ROOT / "dist").exists():
            self.skipTest("build not yet present")
        for source in (ROOT / "keys").glob("*.html"):
            built = ROOT / "dist/keys" / source.name
            self.assertEqual(source.read_bytes(), built.read_bytes(), source.name)


if __name__ == "__main__":
    unittest.main()
