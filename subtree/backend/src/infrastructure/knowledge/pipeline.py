from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from infrastructure.knowledge.ingester import KnowledgeIngestionReport
from infrastructure.knowledge.web_evaluator import EvaluatedWebKnowledge, WebKnowledgeEvaluator
from infrastructure.knowledge.web_search import TavilyWebSearcher, WebSearchResult


class WebSearcher(Protocol):
    def search(self, query: str, limit: int = 5) -> tuple[WebSearchResult, ...]:
        pass


class KnowledgeEvaluator(Protocol):
    def evaluate_many(self, results: tuple[WebSearchResult, ...]) -> tuple[EvaluatedWebKnowledge, ...]:
        pass


class KnowledgeIngester(Protocol):
    def ingest_evaluations(self, evaluations: tuple[EvaluatedWebKnowledge, ...]) -> KnowledgeIngestionReport:
        pass


@dataclass(frozen=True)
class WebKnowledgeIngestionReport:
    query: str
    searched_count: int
    evaluated_count: int
    accepted_count: int
    inserted_count: int
    skipped_rejected_count: int
    skipped_duplicate_count: int
    skipped_empty_count: int


class WebKnowledgeIngestionPipeline:
    def __init__(
        self,
        *,
        searcher: WebSearcher | None = None,
        evaluator: KnowledgeEvaluator | None = None,
        ingester: KnowledgeIngester | None = None,
    ) -> None:
        if ingester is None:
            raise ValueError("Knowledge ingester must be configured explicitly.")

        self._searcher = searcher or TavilyWebSearcher()
        self._evaluator = evaluator or WebKnowledgeEvaluator()
        self._ingester = ingester

    def ingest_query(self, query: str, limit: int = 5) -> WebKnowledgeIngestionReport:
        results = self._searcher.search(query, limit=limit)
        evaluations = self._evaluator.evaluate_many(results)
        ingestion_report = self._ingester.ingest_evaluations(evaluations)

        return WebKnowledgeIngestionReport(
            query=query,
            searched_count=len(results),
            evaluated_count=len(evaluations),
            accepted_count=ingestion_report.accepted_count,
            inserted_count=ingestion_report.inserted_count,
            skipped_rejected_count=ingestion_report.skipped_rejected_count,
            skipped_duplicate_count=ingestion_report.skipped_duplicate_count,
            skipped_empty_count=ingestion_report.skipped_empty_count,
        )
