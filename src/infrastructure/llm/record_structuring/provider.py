from __future__ import annotations

from application.dto import PetLogAgentInput
from domain.models import StructuredRecordBatch
from infrastructure.llm.base_provider import BaseLLMProvider
from infrastructure.llm.model_factory import LLMModel, ModelFactory, TRANSIENT_LLM_ERRORS
from infrastructure.llm.provider_config import LLMProviderConfig
from infrastructure.llm.record_structuring.mapper import to_structured_record_batch
from infrastructure.llm.record_structuring.model import (
    DEFAULT_RECORD_STRUCTURING_MODEL,
    build_record_structuring_model,
)
from infrastructure.llm.record_structuring.prompt import build_record_structuring_messages


TRANSIENT_RECORD_STRUCTURING_ERRORS = TRANSIENT_LLM_ERRORS


class RecordStructurer(BaseLLMProvider[LLMModel]):
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        fallback_model: str | None = None,
        timeout: float = 35.0,
        model_factory: ModelFactory[LLMModel] = build_record_structuring_model,
        structured_model: LLMModel | None = None,
    ) -> None:
        super().__init__(
            config=LLMProviderConfig.from_env(
                provider_name="RecordStructurer",
                model_env="OPENAI_RECORD_STRUCTURING_MODEL",
                default_model=DEFAULT_RECORD_STRUCTURING_MODEL,
                fallback_model_env="OPENAI_RECORD_STRUCTURING_FALLBACK_MODEL",
                api_key=api_key,
                model=model,
                fallback_model=fallback_model,
                timeout=timeout,
            ),
            model_factory=model_factory,
            model=structured_model,
        )

    def structure(self, input: PetLogAgentInput) -> StructuredRecordBatch:
        result = self._invoke_llm(build_record_structuring_messages(input))
        return to_structured_record_batch(result)
