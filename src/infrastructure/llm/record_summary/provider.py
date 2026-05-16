from __future__ import annotations

from application.dto import RecordSummaryResult
from domain.models import ContextAnalysisResult, PetProfile, PetRecord, PlannedReminder
from infrastructure.llm.base_provider import BaseLLMProvider
from infrastructure.llm.provider_config import LLMProviderConfig
from infrastructure.llm.record_summary.mapper import to_record_summary_result
from infrastructure.llm.record_summary.model import (
    DEFAULT_RECORD_SUMMARY_MODEL,
    build_record_summary_model,
)
from infrastructure.llm.model_factory import LLMModel, ModelFactory
from infrastructure.llm.record_summary.prompt import build_record_summary_messages


class RecordSummaryProvider(BaseLLMProvider[LLMModel]):
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 35.0,
        model_factory: ModelFactory[LLMModel] = build_record_summary_model,
        structured_model: LLMModel | None = None,
    ) -> None:
        super().__init__(
            config=LLMProviderConfig.from_env(
                provider_name="RecordSummaryProvider",
                model_env="OPENAI_RECORD_SUMMARY_MODEL",
                default_model=DEFAULT_RECORD_SUMMARY_MODEL,
                fallback_model_env="OPENAI_RECORD_SUMMARY_FALLBACK_MODEL",
                api_key=api_key,
                model=model,
                timeout=timeout,
            ),
            model_factory=model_factory,
            model=structured_model,
        )

    def summarize(
        self,
        pet: PetProfile,
        records: tuple[PetRecord, ...],
        context: ContextAnalysisResult,
        due_items: tuple[PlannedReminder, ...],
    ) -> RecordSummaryResult:
        result = self._invoke_llm(build_record_summary_messages(pet, records, context, due_items))
        return to_record_summary_result(result)
