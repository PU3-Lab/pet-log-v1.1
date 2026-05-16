from __future__ import annotations

from domain.models import CareContext
from infrastructure.llm.base_provider import BaseLLMProvider
from infrastructure.llm.constants import DEFAULT_PET_PERSONA_MODEL
from infrastructure.llm.model_factory import LLMModel, ModelFactory, build_chat_model
from infrastructure.llm.pet_persona.mapper import message_content_to_text
from infrastructure.llm.pet_persona.prompt import build_pet_persona_messages
from infrastructure.llm.provider_config import LLMProviderConfig


class PetPersonaResponder(BaseLLMProvider[LLMModel]):
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 35.0,
        model_factory: ModelFactory[LLMModel] = build_chat_model,
        chat_model: LLMModel | None = None,
    ) -> None:
        super().__init__(
            config=LLMProviderConfig.from_env(
                provider_name="PetPersonaResponder",
                model_env="OPENAI_PET_PERSONA_MODEL",
                default_model=DEFAULT_PET_PERSONA_MODEL,
                fallback_model_env="OPENAI_PET_PERSONA_FALLBACK_MODEL",
                api_key=api_key,
                model=model,
                timeout=timeout,
            ),
            model_factory=model_factory,
            model=chat_model,
        )

    def respond(self, context: CareContext, message: str) -> str:
        result = self._invoke_llm(build_pet_persona_messages(context, message))
        return message_content_to_text(result)
