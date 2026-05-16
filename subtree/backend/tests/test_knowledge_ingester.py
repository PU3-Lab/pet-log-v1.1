from __future__ import annotations

import unittest
from typing import Any

from infrastructure.knowledge.ingester import CareKnowledgeIngester, calculate_hash, source_id_for_url
from infrastructure.knowledge.web_evaluator import EvaluatedWebKnowledge


class FakeVectorStore:
    def __init__(self, existing_hashes: set[str] | None = None) -> None:
        self.existing_hashes = existing_hashes or set()
        self.added_texts: list[str] = []
        self.added_metadatas: list[dict[str, object]] = []
        self.added_ids: list[str] = []
        self.get_calls: list[dict[str, Any]] = []

    def add_texts(
        self,
        texts: list[str],
        metadatas: list[dict[str, object]] | None = None,
        ids: list[str] | None = None,
        **kwargs: Any,
    ) -> list[str]:
        self.added_texts.extend(texts)
        self.added_metadatas.extend(metadatas or [])
        self.added_ids.extend(ids or [])
        return ids or []

    def get(self, **kwargs: Any) -> dict[str, Any]:
        self.get_calls.append(kwargs)
        content_hash = kwargs.get("where", {}).get("content_hash")
        if content_hash in self.existing_hashes:
            return {"ids": ["existing-id"]}
        return {"ids": []}


class TestCareKnowledgeIngester(unittest.TestCase):
    def test_requires_explicit_vector_store(self) -> None:
        with self.assertRaisesRegex(TypeError, "vector_store"):
            CareKnowledgeIngester()

    def test_ingests_accepted_evaluation_into_vector_store(self) -> None:
        vector_store = FakeVectorStore()
        ingester = CareKnowledgeIngester(vector_store=vector_store)
        evaluation = EvaluatedWebKnowledge(
            accepted=True,
            title="Puppy vaccination schedule",
            cleaned_text="Puppies commonly begin core vaccinations at six to eight weeks.",
            source_url="https://example.org/vaccines",
            reason="Useful care guidance.",
            confidence=0.88,
            tags=("dog", "vaccination"),
            risk_level="medium",
        )

        report = ingester.ingest_evaluations((evaluation,))

        self.assertEqual(report.accepted_count, 1)
        self.assertEqual(report.inserted_count, 1)
        self.assertEqual(vector_store.added_texts, (["Puppies commonly begin core vaccinations at six to eight weeks."]))
        metadata = vector_store.added_metadatas[0]
        self.assertEqual(metadata["source_id"], source_id_for_url("https://example.org/vaccines"))
        self.assertEqual(metadata["title"], "Puppy vaccination schedule")
        self.assertEqual(metadata["source_url"], "https://example.org/vaccines")
        self.assertEqual(metadata["content_hash"], calculate_hash(vector_store.added_texts[0]))
        self.assertEqual(metadata["tags"], "dog,vaccination")
        self.assertEqual(metadata["risk_level"], "medium")
        self.assertEqual(metadata["evaluation_confidence"], 0.88)

    def test_skips_rejected_and_empty_evaluations(self) -> None:
        vector_store = FakeVectorStore()
        ingester = CareKnowledgeIngester(vector_store=vector_store)

        report = ingester.ingest_evaluations(
            (
                EvaluatedWebKnowledge(
                    accepted=False,
                    title="Ad",
                    cleaned_text="Buy now",
                    source_url="https://example.org/ad",
                    reason="Promotional.",
                    confidence=0.6,
                ),
                EvaluatedWebKnowledge(
                    accepted=True,
                    title="Empty",
                    cleaned_text=" ",
                    source_url="https://example.org/empty",
                    reason="No useful text.",
                    confidence=0.2,
                ),
            )
        )

        self.assertEqual(report.inserted_count, 0)
        self.assertEqual(report.skipped_rejected_count, 1)
        self.assertEqual(report.skipped_empty_count, 1)
        self.assertEqual(vector_store.added_texts, [])

    def test_skips_duplicate_content_hash(self) -> None:
        text = "Existing knowledge chunk."
        vector_store = FakeVectorStore(existing_hashes={calculate_hash(text)})
        ingester = CareKnowledgeIngester(vector_store=vector_store)

        report = ingester.ingest_evaluations(
            (
                EvaluatedWebKnowledge(
                    accepted=True,
                    title="Duplicate",
                    cleaned_text=text,
                    source_url="https://example.org/duplicate",
                    reason="Already stored.",
                    confidence=0.9,
                ),
            )
        )

        self.assertEqual(report.inserted_count, 0)
        self.assertEqual(report.skipped_duplicate_count, 1)
        self.assertEqual(vector_store.added_texts, [])


if __name__ == "__main__":
    unittest.main()
