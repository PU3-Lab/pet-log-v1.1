from __future__ import annotations

import unittest

from infrastructure.knowledge.ingester import KnowledgeIngestionReport
from infrastructure.knowledge.pipeline import WebKnowledgeIngestionPipeline
from infrastructure.knowledge.web_evaluator import EvaluatedWebKnowledge
from infrastructure.knowledge.web_search import WebSearchResult


class FakeSearcher:
    def __init__(self, results: tuple[WebSearchResult, ...]) -> None:
        self.results = results
        self.calls: list[tuple[str, int]] = []

    def search(self, query: str, limit: int = 5) -> tuple[WebSearchResult, ...]:
        self.calls.append((query, limit))
        return self.results


class FakeEvaluator:
    def __init__(self, evaluations: tuple[EvaluatedWebKnowledge, ...]) -> None:
        self.evaluations = evaluations
        self.calls: list[tuple[WebSearchResult, ...]] = []

    def evaluate_many(self, results: tuple[WebSearchResult, ...]) -> tuple[EvaluatedWebKnowledge, ...]:
        self.calls.append(results)
        return self.evaluations


class FakeIngester:
    def __init__(self, report: KnowledgeIngestionReport) -> None:
        self.report = report
        self.calls: list[tuple[EvaluatedWebKnowledge, ...]] = []

    def ingest_evaluations(self, evaluations: tuple[EvaluatedWebKnowledge, ...]) -> KnowledgeIngestionReport:
        self.calls.append(evaluations)
        return self.report


class TestWebKnowledgeIngestionPipeline(unittest.TestCase):
    def test_requires_explicit_ingester(self) -> None:
        with self.assertRaisesRegex(ValueError, "Knowledge ingester"):
            WebKnowledgeIngestionPipeline(
                searcher=FakeSearcher(()),
                evaluator=FakeEvaluator(()),
            )

    def test_ingest_query_runs_search_evaluate_and_ingest(self) -> None:
        search_results = (
            WebSearchResult(
                title="Dog vaccines",
                url="https://example.org/vaccines",
                content="Puppy vaccine content.",
            ),
        )
        evaluations = (
            EvaluatedWebKnowledge(
                accepted=True,
                title="Dog vaccines",
                cleaned_text="Puppies commonly begin core vaccinations at six to eight weeks.",
                source_url="https://example.org/vaccines",
                reason="Useful.",
                confidence=0.9,
            ),
        )
        ingestion_report = KnowledgeIngestionReport(
            accepted_count=1,
            inserted_count=1,
            skipped_rejected_count=0,
            skipped_duplicate_count=0,
            skipped_empty_count=0,
        )
        searcher = FakeSearcher(search_results)
        evaluator = FakeEvaluator(evaluations)
        ingester = FakeIngester(ingestion_report)
        pipeline = WebKnowledgeIngestionPipeline(
            searcher=searcher,
            evaluator=evaluator,
            ingester=ingester,
        )

        report = pipeline.ingest_query("dog vaccination", limit=3)

        self.assertEqual(searcher.calls, [("dog vaccination", 3)])
        self.assertEqual(evaluator.calls, [search_results])
        self.assertEqual(ingester.calls, [evaluations])
        self.assertEqual(report.query, "dog vaccination")
        self.assertEqual(report.searched_count, 1)
        self.assertEqual(report.evaluated_count, 1)
        self.assertEqual(report.accepted_count, 1)
        self.assertEqual(report.inserted_count, 1)


if __name__ == "__main__":
    unittest.main()
