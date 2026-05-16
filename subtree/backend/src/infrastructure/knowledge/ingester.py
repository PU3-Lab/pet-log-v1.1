from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any, Protocol

from langchain_text_splitters import RecursiveCharacterTextSplitter

from infrastructure.knowledge.web_evaluator import EvaluatedWebKnowledge


class KnowledgeVectorStore(Protocol):
    def add_texts(
        self,
        texts: list[str],
        metadatas: list[dict[str, object]] | None = None,
        ids: list[str] | None = None,
        **kwargs: Any,
    ) -> list[str]:
        pass

    def get(self, **kwargs: Any) -> dict[str, Any]:
        pass


@dataclass(frozen=True)
class KnowledgeIngestionReport:
    accepted_count: int
    inserted_count: int
    skipped_rejected_count: int
    skipped_duplicate_count: int
    skipped_empty_count: int


class CareKnowledgeIngester:
    def __init__(
        self,
        *,
        vector_store: KnowledgeVectorStore,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ) -> None:
        self._vector_store = vector_store
        self._text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", " ", ""],
        )

    def ingest_evaluations(
        self,
        evaluations: tuple[EvaluatedWebKnowledge, ...],
    ) -> KnowledgeIngestionReport:
        accepted_count = 0
        inserted_count = 0
        skipped_rejected_count = 0
        skipped_duplicate_count = 0
        skipped_empty_count = 0

        texts: list[str] = []
        metadatas: list[dict[str, object]] = []
        ids: list[str] = []

        for evaluation in evaluations:
            if not evaluation.accepted:
                skipped_rejected_count += 1
                continue

            accepted_count += 1
            chunks = tuple(chunk.strip() for chunk in self._text_splitter.split_text(evaluation.cleaned_text))
            chunks = tuple(chunk for chunk in chunks if chunk)
            if not chunks:
                skipped_empty_count += 1
                continue

            source_id = source_id_for_url(evaluation.source_url)
            for index, chunk in enumerate(chunks):
                content_hash = calculate_hash(chunk)
                if self._has_content_hash(content_hash):
                    skipped_duplicate_count += 1
                    continue

                texts.append(chunk)
                ids.append(f"{source_id}_{content_hash[:12]}")
                metadatas.append(
                    {
                        "source_id": source_id,
                        "title": evaluation.title,
                        "source_url": evaluation.source_url,
                        "content_hash": content_hash,
                        "chunk_index": index,
                        "tags": ",".join(evaluation.tags),
                        "risk_level": evaluation.risk_level,
                        "evaluation_confidence": evaluation.confidence,
                    }
                )

        if texts:
            inserted_ids = self._vector_store.add_texts(texts=texts, metadatas=metadatas, ids=ids)
            inserted_count = len(inserted_ids)

        return KnowledgeIngestionReport(
            accepted_count=accepted_count,
            inserted_count=inserted_count,
            skipped_rejected_count=skipped_rejected_count,
            skipped_duplicate_count=skipped_duplicate_count,
            skipped_empty_count=skipped_empty_count,
        )

    def _has_content_hash(self, content_hash: str) -> bool:
        result = self._vector_store.get(where={"content_hash": content_hash}, limit=1)
        return bool(result.get("ids"))


def calculate_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def source_id_for_url(url: str) -> str:
    return f"web_{calculate_hash(url)[:12]}"
