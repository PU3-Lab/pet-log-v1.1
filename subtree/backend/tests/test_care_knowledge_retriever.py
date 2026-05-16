from __future__ import annotations

import unittest

from infrastructure.knowledge.retriever import CareKnowledgeRetriever


class FakeDocument:
    def __init__(self, page_content: str, metadata: dict[str, object]) -> None:
        self.page_content = page_content
        self.metadata = metadata


class FakeVectorStore:
    def __init__(self, results: list[tuple[FakeDocument, float]]) -> None:
        self.results = results
        self.calls: list[tuple[str, int]] = []

    def similarity_search_with_score(
        self,
        query: str,
        k: int = 3,
        **kwargs: object,
    ) -> list[tuple[FakeDocument, float]]:
        self.calls.append((query, k))
        return self.results


class TestCareKnowledgeRetriever(unittest.TestCase):
    def test_maps_vector_store_results_to_care_knowledge_hits(self) -> None:
        document = FakeDocument(
            page_content="Dogs with reduced appetite should be monitored.",
            metadata={
                "source_id": "pdf_vaccination",
                "title": "Dog care guide",
                "source_url": "file://dog-care.pdf",
                "content_hash": "hash-1",
            },
        )
        vector_store = FakeVectorStore([(document, 0.82)])
        retriever = CareKnowledgeRetriever(vector_store=vector_store)

        hits = retriever.search("강아지가 밥을 안 먹어", limit=2)

        self.assertEqual(vector_store.calls, [("강아지가 밥을 안 먹어", 2)])
        self.assertEqual(len(hits), 1)
        self.assertAlmostEqual(hits[0].score, 0.5494505494505495)
        self.assertEqual(hits[0].chunk.id, "hash-1")
        self.assertEqual(hits[0].chunk.source_id, "pdf_vaccination")
        self.assertEqual(hits[0].chunk.title, "Dog care guide")
        self.assertEqual(hits[0].chunk.text, "Dogs with reduced appetite should be monitored.")
        self.assertEqual(hits[0].chunk.source_url, "file://dog-care.pdf")
        self.assertEqual(hits[0].chunk.content_hash, "hash-1")

    def test_filters_low_relevance_results(self) -> None:
        document = FakeDocument(
            page_content="Unrelated text.",
            metadata={"content_hash": "hash-low"},
        )
        vector_store = FakeVectorStore([(document, 2.01)])
        retriever = CareKnowledgeRetriever(vector_store=vector_store, max_distance=2.0)

        self.assertEqual(retriever.search("질문"), ())


if __name__ == "__main__":
    unittest.main()
