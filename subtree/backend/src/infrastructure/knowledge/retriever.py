from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Protocol

from domain.models import CareKnowledgeChunk, CareKnowledgeHit


CARE_KNOWLEDGE_COLLECTION = "care_knowledge"
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_MAX_DISTANCE = 2.0


class SimilarityVectorStore(Protocol):
    def similarity_search_with_score(
        self,
        query: str,
        k: int = 3,
        **kwargs: Any,
    ) -> list[tuple[object, float]]:
        pass


class CareKnowledgeRetriever:
    def __init__(
        self,
        persist_directory: str | None = None,
        *,
        vector_store: SimilarityVectorStore | None = None,
        max_distance: float = DEFAULT_MAX_DISTANCE,
        relevance_threshold: float | None = None,
        embedding_model: str | None = None,
    ) -> None:
        self._persist_directory = persist_directory or default_persist_directory()
        self._vector_store = vector_store
        self._max_distance = max_distance if relevance_threshold is None else _max_distance_for_relevance(relevance_threshold)
        self._embedding_model = embedding_model or os.environ.get(
            "OPENAI_CARE_KNOWLEDGE_EMBEDDING_MODEL",
            DEFAULT_EMBEDDING_MODEL,
        )

    def search(self, question: str, limit: int = 3) -> tuple[CareKnowledgeHit, ...]:
        results = self._get_vector_store().similarity_search_with_score(
            query=question,
            k=limit,
        )

        hits: list[CareKnowledgeHit] = []
        for document, distance in results:
            if distance > self._max_distance:
                continue

            metadata = getattr(document, "metadata", {}) or {}
            page_content = getattr(document, "page_content", "")
            content_hash = str(metadata.get("content_hash", ""))
            chunk = CareKnowledgeChunk(
                id=str(metadata.get("id") or content_hash or metadata.get("source_id") or "unknown"),
                source_id=str(metadata.get("source_id", "unknown")),
                title=str(metadata.get("title", "Unknown Source")),
                text=str(page_content),
                source_url=str(metadata.get("source_url", "")),
                content_hash=content_hash,
            )
            hits.append(CareKnowledgeHit(chunk=chunk, score=_similarity_score(float(distance))))

        return tuple(hits)

    def _get_vector_store(self) -> SimilarityVectorStore:
        if self._vector_store is None:
            self._vector_store = build_chroma_vector_store(
                persist_directory=self._persist_directory,
                embedding_model=self._embedding_model,
            )
        return self._vector_store


def default_persist_directory() -> str:
    backend_root = Path(__file__).resolve().parents[3]
    return str(backend_root / ".chroma_db")


def build_chroma_vector_store(*, persist_directory: str, embedding_model: str) -> SimilarityVectorStore:
    from langchain_chroma import Chroma
    from langchain_openai import OpenAIEmbeddings

    embeddings = OpenAIEmbeddings(model=embedding_model)
    return Chroma(
        collection_name=CARE_KNOWLEDGE_COLLECTION,
        embedding_function=embeddings,
        persist_directory=persist_directory,
    )


def _similarity_score(distance: float) -> float:
    if distance < 0:
        return 1.0
    return 1.0 / (1.0 + distance)


def _max_distance_for_relevance(relevance_threshold: float) -> float:
    if relevance_threshold <= 0:
        return float("inf")
    return (1.0 / relevance_threshold) - 1.0
