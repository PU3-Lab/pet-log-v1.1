from __future__ import annotations

import unittest
from pathlib import Path

from domain.models import CareKnowledgeChunk, CareKnowledgeHit, CareKnowledgeSource
from infrastructure.knowledge.retriever import CareKnowledgeRetriever


class TestCareKnowledgeRagSkeleton(unittest.TestCase):
    def test_domain_models_capture_external_knowledge_metadata(self) -> None:
        source = CareKnowledgeSource(
            id="source-1",
            url="https://example.org/care/feeding",
            title="Feeding guide",
            allowed_domain="example.org",
        )
        chunk = CareKnowledgeChunk(
            id="chunk-1",
            source_id=source.id,
            title=source.title,
            text="Feed transitions should be gradual.",
            source_url=source.url,
            content_hash="hash-1",
        )
        hit = CareKnowledgeHit(chunk=chunk, score=0.91)

        self.assertTrue(source.enabled)
        self.assertEqual(hit.chunk.source_url, source.url)
        self.assertEqual(hit.score, 0.91)

    def test_retriever_concrete_skeleton_has_search_method(self) -> None:
        retriever = CareKnowledgeRetriever()

        self.assertEqual(retriever.search("밥을 갑자기 안 먹어요"), ())

    def test_design_doc_and_sprint_card_exist(self) -> None:
        repo_root = Path(__file__).resolve().parents[1]
        design_doc = repo_root / "docs/superpowers/designs/pet-log-pipeline/13-care-answer-rag.md"
        sprint_card = (
            repo_root
            / "docs/superpowers/plans/pet-log-agent-sprints/cards/sprint-06/6-18-care-knowledge-rag-skeleton.md"
        )

        self.assertIn("CareAnswerProvider", design_doc.read_text())
        self.assertIn("OpenAI embedding", design_doc.read_text())
        self.assertIn("구현 세부사항은 backlog 문서에만 둔다", sprint_card.read_text())


if __name__ == "__main__":
    unittest.main()
