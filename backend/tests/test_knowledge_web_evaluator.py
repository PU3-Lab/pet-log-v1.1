from __future__ import annotations

import unittest

from infrastructure.knowledge.web_evaluator import WebKnowledgeEvaluator
from infrastructure.knowledge.web_search import WebSearchResult


class FakeStructuredModel:
    def __init__(self, response: dict[str, object]) -> None:
        self.response = response
        self.calls: list[list[tuple[str, str]]] = []

    def invoke(self, messages: list[tuple[str, str]], config: dict[str, object] | None = None) -> dict[str, object]:
        self.calls.append(messages)
        return self.response


class TestWebKnowledgeEvaluator(unittest.TestCase):
    def test_evaluate_maps_accepted_structured_output(self) -> None:
        model = FakeStructuredModel(
            {
                "accepted": True,
                "title": "Puppy vaccination schedule",
                "cleaned_text": "Puppies commonly begin core vaccinations at six to eight weeks.",
                "reason": "Specific veterinary care guidance with no promotional content.",
                "confidence": 0.88,
                "tags": ["dog", "vaccination"],
                "risk_level": "medium",
            }
        )
        evaluator = WebKnowledgeEvaluator(
            api_key="test-key",
            model="test-model",
            structured_model=model,
        )
        result = WebSearchResult(
            title="Raw title",
            url="https://example.org/vaccines",
            content="Raw content about puppy vaccines.",
            score=0.91,
        )

        evaluation = evaluator.evaluate(result)

        self.assertTrue(evaluation.accepted)
        self.assertEqual(evaluation.title, "Puppy vaccination schedule")
        self.assertEqual(evaluation.source_url, "https://example.org/vaccines")
        self.assertEqual(evaluation.tags, ("dog", "vaccination"))
        self.assertEqual(evaluation.confidence, 0.88)
        self.assertEqual(evaluation.risk_level, "medium")
        self.assertEqual(len(model.calls), 1)
        self.assertEqual(model.calls[0][0][0], "system")
        self.assertIn("pet care RAG knowledge base", model.calls[0][0][1])
        self.assertIn("Raw content about puppy vaccines.", model.calls[0][1][1])

    def test_evaluate_keeps_rejected_result_without_cleaned_text(self) -> None:
        model = FakeStructuredModel(
            {
                "accepted": False,
                "title": "",
                "cleaned_text": "",
                "reason": "Promotional shopping content.",
                "confidence": 0.74,
                "tags": ["shopping"],
                "risk_level": "low",
            }
        )
        evaluator = WebKnowledgeEvaluator(api_key="test-key", structured_model=model)

        evaluation = evaluator.evaluate(
            WebSearchResult(
                title="Buy food now",
                url="https://example.org/shop",
                content="Discount pet food advertisement.",
            )
        )

        self.assertFalse(evaluation.accepted)
        self.assertEqual(evaluation.title, "Buy food now")
        self.assertEqual(evaluation.cleaned_text, "")
        self.assertEqual(evaluation.reason, "Promotional shopping content.")

    def test_evaluate_rejects_accepted_output_without_cleaned_text(self) -> None:
        model = FakeStructuredModel(
            {
                "accepted": True,
                "title": "Thin care page",
                "cleaned_text": "",
                "reason": "Looks relevant.",
                "confidence": 0.6,
                "tags": [],
                "risk_level": "low",
            }
        )
        evaluator = WebKnowledgeEvaluator(api_key="test-key", structured_model=model)

        evaluation = evaluator.evaluate(
            WebSearchResult(
                title="Thin care page",
                url="https://example.org/thin",
                content="Dog care.",
            )
        )

        self.assertFalse(evaluation.accepted)
        self.assertEqual(evaluation.confidence, 0.0)
        self.assertIn("cleaned_text", evaluation.reason)

    def test_evaluate_requires_api_key(self) -> None:
        evaluator = WebKnowledgeEvaluator(api_key="")

        with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
            evaluator.evaluate(WebSearchResult(title="Title", url="https://example.org", content="Content"))


if __name__ == "__main__":
    unittest.main()
