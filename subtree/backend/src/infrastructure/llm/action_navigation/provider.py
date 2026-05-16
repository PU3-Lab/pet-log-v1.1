from __future__ import annotations

from domain.models import CareInsight, PetProfile, PetRecord, PlannedReminder
from infrastructure.llm.action_navigation.mapper import to_action_routes
from infrastructure.llm.action_navigation.model import (
    DEFAULT_ACTION_NAVIGATION_MODEL,
    build_action_navigation_model,
)
from infrastructure.llm.action_navigation.prompt import build_action_navigation_messages
from infrastructure.llm.base_provider import BaseLLMProvider
from infrastructure.llm.model_factory import LLMModel, ModelFactory
from infrastructure.llm.provider_config import LLMProviderConfig


class ActionNavigationProvider(BaseLLMProvider[LLMModel]):
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 35.0,
        model_factory: ModelFactory[LLMModel] = build_action_navigation_model,
        structured_model: LLMModel | None = None,
    ) -> None:
        super().__init__(
            config=LLMProviderConfig.from_env(
                provider_name="ActionNavigationProvider",
                model_env="OPENAI_ACTION_NAVIGATION_MODEL",
                default_model=DEFAULT_ACTION_NAVIGATION_MODEL,
                fallback_model_env="OPENAI_ACTION_NAVIGATION_FALLBACK_MODEL",
                api_key=api_key,
                model=model,
                timeout=timeout,
            ),
            model_factory=model_factory,
            model=structured_model,
        )

    def decide_routes(
        self,
        *,
        pet: PetProfile,
        insights: tuple[CareInsight, ...],
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
        fallback: str,
    ) -> tuple[str | None, ...]:
        result = self._invoke_llm(
            build_action_navigation_messages(
                pet=pet,
                insights=insights,
                records=records,
                due_items=due_items,
                fallback=fallback,
            )
        )
        return to_action_routes(result, count=len(insights))
