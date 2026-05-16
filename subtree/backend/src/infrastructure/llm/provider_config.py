from __future__ import annotations

import os
from collections.abc import Callable
from dataclasses import dataclass

from infrastructure.llm.model_factory import ModelT, build_primary_with_gpt_fallback, require_local_or_gpt_api_key


@dataclass(frozen=True)
class LLMProviderConfig:
    provider_name: str
    api_key: str
    model: str
    fallback_model: str | None
    timeout: float

    @classmethod
    def from_env(
        cls,
        *,
        provider_name: str,
        model_env: str,
        default_model: str,
        fallback_model_env: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        fallback_model: str | None = None,
        timeout: float = 35.0,
    ) -> LLMProviderConfig:
        configured_fallback = fallback_model
        if configured_fallback is None and fallback_model_env is not None:
            configured_fallback = os.environ.get(fallback_model_env) or None

        return cls(
            provider_name=provider_name,
            api_key=api_key if api_key is not None else os.environ.get("OPENAI_API_KEY", ""),
            model=model or os.environ.get(model_env, default_model),
            fallback_model=configured_fallback,
            timeout=timeout,
        )

    def require_credentials(self) -> None:
        require_local_or_gpt_api_key(self.provider_name, self.api_key, self.model)

    def build_model(self, model_factory: Callable[[str, str, float], ModelT]) -> ModelT:
        return build_primary_with_gpt_fallback(
            provider_model=self.model,
            provider_api_key=self.api_key,
            fallback_model=self.fallback_model,
            timeout=self.timeout,
            model_factory=model_factory,
        )
