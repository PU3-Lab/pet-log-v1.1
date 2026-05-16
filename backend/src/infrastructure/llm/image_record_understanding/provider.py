from __future__ import annotations

from domain.models import PetProfile, StructuredRecordCandidate
from infrastructure.llm.base_provider import BaseLLMProvider
from infrastructure.llm.image_record_understanding.mapper import to_structured_record_candidate
from infrastructure.llm.image_record_understanding.model import (
    DEFAULT_IMAGE_RECORD_UNDERSTANDING_MODEL,
    build_image_record_understanding_model,
)
from infrastructure.llm.image_record_understanding.prompt import build_image_record_understanding_messages
from infrastructure.llm.model_factory import LLMModel, ModelFactory
from infrastructure.llm.provider_config import LLMProviderConfig


class ImageRecordUnderstandingProvider(BaseLLMProvider[LLMModel]):
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 35.0,
        model_factory: ModelFactory[LLMModel] = build_image_record_understanding_model,
        structured_model: LLMModel | None = None,
    ) -> None:
        super().__init__(
            config=LLMProviderConfig.from_env(
                provider_name="ImageRecordUnderstandingProvider",
                model_env="OPENAI_IMAGE_RECORD_UNDERSTANDING_MODEL",
                default_model=DEFAULT_IMAGE_RECORD_UNDERSTANDING_MODEL,
                fallback_model_env="OPENAI_IMAGE_RECORD_UNDERSTANDING_FALLBACK_MODEL",
                api_key=api_key,
                model=model,
                timeout=timeout,
            ),
            model_factory=model_factory,
            model=structured_model,
        )

    def understand(
        self,
        pet: PetProfile,
        image: bytes,
        content_type: str,
        user_note: str | None = None,
    ) -> StructuredRecordCandidate:
        result = self._invoke_llm(build_image_record_understanding_messages(pet, image, content_type, user_note))
        return to_structured_record_candidate(result)
