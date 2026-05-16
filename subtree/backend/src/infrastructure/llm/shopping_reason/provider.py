from __future__ import annotations

import json
import os
import re

from domain.models import (
    CareSuggestion,
    PetProfile,
    PetRecord,
    ShoppingCategoryRequest,
    ShoppingRecommendation,
    ShoppingSelectionResult,
)
from infrastructure.llm.base_provider import BaseLLMProvider
from infrastructure.llm.care_answer.mapper import message_content_to_text
from infrastructure.llm.constants import DEFAULT_SHOPPING_REASON_MODEL
from infrastructure.llm.model_factory import LLMModel, ModelFactory, build_chat_model
from infrastructure.llm.provider_config import LLMProviderConfig
from infrastructure.llm.shopping_reason.prompt import (
    build_shopping_category_messages,
    build_shopping_reason_messages,
    build_shopping_selection_messages,
)


class ShoppingReasonProvider(BaseLLMProvider[LLMModel]):
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
        model_factory: ModelFactory[LLMModel] = build_chat_model,
        chat_model: LLMModel | None = None,
    ) -> None:
        super().__init__(
            config=LLMProviderConfig.from_env(
                provider_name="ShoppingReasonProvider",
                model_env="OPENAI_SHOPPING_REASON_MODEL",
                default_model=DEFAULT_SHOPPING_REASON_MODEL,
                fallback_model_env="OPENAI_SHOPPING_REASON_FALLBACK_MODEL",
                api_key=api_key,
                model=model,
                timeout=timeout if timeout is not None else _shopping_timeout(),
            ),
            model_factory=model_factory,
            model=chat_model,
        )

    def category_requests_for(
        self,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
    ) -> tuple[ShoppingCategoryRequest, ...]:
        result = self._invoke_llm(build_shopping_category_messages(pet, text, records, suggestions))
        payload = _json_payload(message_content_to_text(result))
        return _category_requests_from_payload(payload, records)

    def select_recommendation(
        self,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
        query: str,
        candidates: tuple[ShoppingRecommendation, ...],
    ) -> ShoppingSelectionResult:
        result = self._invoke_llm(
            build_shopping_selection_messages(pet, text, records, suggestions, query, candidates)
        )
        payload = _json_payload(message_content_to_text(result))
        product_url = str(payload.get("product_url", "")).strip()
        reason = str(payload.get("reason", "")).strip()
        if not product_url or not reason:
            raise RuntimeError("Shopping selection response did not include product_url and reason.")
        return ShoppingSelectionResult(product_url=product_url, reason=reason)

    def reason_for(
        self,
        pet: PetProfile,
        recommendation: ShoppingRecommendation,
        source_records: tuple[PetRecord, ...],
    ) -> str:
        result = self._invoke_llm(build_shopping_reason_messages(pet, recommendation, source_records))
        text = message_content_to_text(result)
        try:
            payload = _json_payload(text)
        except RuntimeError:
            return text
        reason = str(payload.get("reason", "")).strip()
        if not reason:
            raise RuntimeError("Shopping reason response did not include reason.")
        return reason


def _category_requests_from_payload(
    payload: dict[str, object],
    records: tuple[PetRecord, ...],
) -> tuple[ShoppingCategoryRequest, ...]:
    record_ids = {record.id for record in records}
    queries = payload.get("queries", ())
    if not isinstance(queries, list):
        raise RuntimeError("Shopping category response did not include queries list.")

    requests: list[ShoppingCategoryRequest] = []
    seen_queries: set[str] = set()
    for item in queries[:1]:
        if not isinstance(item, dict):
            continue
        query = str(item.get("query", "")).strip()
        if not query or query in seen_queries:
            continue
        seen_queries.add(query)
        requests.append(
            ShoppingCategoryRequest(
                query=query,
                category=str(item.get("category", "생활 용품")).strip() or "생활 용품",
                reason=str(item.get("reason", "")).strip(),
                source_record_ids=_source_record_ids(item.get("source_record_ids"), record_ids),
            )
        )
    return tuple(requests)


def _source_record_ids(value: object, allowed_record_ids: set[str]) -> tuple[str, ...]:
    if not isinstance(value, list):
        return ()
    source_record_ids = []
    for record_id in value:
        normalized = str(record_id).strip()
        if normalized in allowed_record_ids:
            source_record_ids.append(normalized)
    return tuple(source_record_ids)


def _json_payload(text: str) -> dict[str, object]:
    cleaned = _strip_json_fence(text)
    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise RuntimeError("LLM response was not valid JSON.") from exc
    if not isinstance(payload, dict):
        raise RuntimeError("LLM response JSON must be an object.")
    return payload


def _strip_json_fence(text: str) -> str:
    match = re.fullmatch(r"\s*```(?:json)?\s*(.*?)\s*```\s*", text, flags=re.DOTALL)
    if match is None:
        return text.strip()
    return match.group(1).strip()


def _shopping_timeout() -> float:
    try:
        return max(float(os.environ.get("OPENAI_SHOPPING_REASON_TIMEOUT", "90")), 1.0)
    except ValueError:
        return 90.0
