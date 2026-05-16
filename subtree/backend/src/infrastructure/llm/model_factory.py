from __future__ import annotations

import logging
import os
from collections.abc import Callable, Sequence
from typing import Protocol, TypeVar, cast

from google.api_core.exceptions import DeadlineExceeded, ResourceExhausted, ServiceUnavailable
from openai import APIConnectionError, APITimeoutError, InternalServerError, RateLimitError

from langchain_openai import ChatOpenAI

from infrastructure.llm.local_runtime import (
    ensure_local_gemma_runtime,
    local_gemma_base_url,
    should_autostart_local_gemma,
)
from infrastructure.llm.local_settings import (
    is_local_gemma_model_name,
    local_gemma_api_key,
    local_gemma_model,
    normalize_local_gemma_model,
)

logger = logging.getLogger(__name__)


DEFAULT_GPT_FALLBACK_MODEL = "gpt-5-mini"
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
DEFAULT_LOCAL_GEMMA_MAX_RETRIES = 0

TRANSIENT_LLM_ERRORS: tuple[type[BaseException], ...] = (
    TimeoutError,
    ConnectionError,
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
    ResourceExhausted,
    DeadlineExceeded,
    ServiceUnavailable,
)


class LLMModel(Protocol):
    def invoke(self, messages: list[object]) -> object:
        raise NotImplementedError

    def with_fallbacks(
        self,
        fallbacks: Sequence[object],
        *,
        exceptions_to_handle: tuple[type[BaseException], ...],
        exception_key: str | None = None,
    ) -> LLMModel:
        raise NotImplementedError


ModelT = TypeVar("ModelT", bound=LLMModel)
ModelFactory = Callable[[str, str, float], ModelT]


def is_local_gemma_enabled() -> bool:
    return bool(os.environ.get("GEMMA_BASE_URL") or should_autostart_local_gemma())


def is_gemini_model(model: str) -> bool:
    return model.startswith("gemini-")


def gemini_api_key() -> str:
    return os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")


def gpt_fallback_api_key() -> str:
    return os.environ.get("OPENAI_API_KEY", "")


def require_local_or_gpt_api_key(
    provider_name: str,
    provider_api_key: str = "",
    provider_model: str | None = None,
) -> None:
    if provider_model and _is_local_gemma_model(provider_model, local_gemma_model()):
        _require_local_gemma_enabled_for_model(
            provider_model,
            local_gemma_enabled=is_local_gemma_enabled(),
            local_model=local_gemma_model(),
            model_role="primary model",
        )
        return

    if not provider_api_key and not gpt_fallback_api_key():
        raise RuntimeError(f"OPENAI_API_KEY is required to use {provider_name}.")


def build_chat_gemini_model(model: str, api_key: str, timeout: float) -> LLMModel:
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=api_key or gemini_api_key(),
        request_timeout=timeout,
    )


def build_chat_model(model: str, api_key: str, timeout: float) -> LLMModel:
    if is_gemini_model(model):
        return build_chat_gemini_model(model, api_key, timeout)
    return build_chat_openai_model(model, api_key, timeout)


def build_chat_openai_model(model: str, api_key: str, timeout: float) -> ChatOpenAI:
    normalized_model = normalize_local_gemma_model(model)
    local_gemma_enabled = is_local_gemma_enabled()
    local_model = local_gemma_model()
    is_local_model = _is_local_gemma_model(normalized_model, local_model)
    _require_local_gemma_enabled_for_model(
        model,
        local_gemma_enabled=local_gemma_enabled,
        local_model=local_model,
        model_role="model",
    )
    kwargs: dict[str, object] = {
        "model": normalized_model,
        "api_key": api_key or (local_gemma_api_key() if is_local_model else ""),
        "timeout": timeout,
    }

    if local_gemma_enabled and is_local_model:
        ensure_local_gemma_runtime()
        kwargs["base_url"] = local_gemma_base_url()
        kwargs["max_retries"] = _local_gemma_max_retries()
        kwargs["use_responses_api"] = False
    else:
        kwargs["use_responses_api"] = True

    return ChatOpenAI(**kwargs)


def _local_gemma_max_retries() -> int:
    raw_value = os.environ.get("GEMMA_MAX_RETRIES")
    if raw_value is None:
        return DEFAULT_LOCAL_GEMMA_MAX_RETRIES

    try:
        return max(0, int(raw_value))
    except ValueError:
        logger.warning(
            "Ignoring invalid GEMMA_MAX_RETRIES value %r; using %s.",
            raw_value,
            DEFAULT_LOCAL_GEMMA_MAX_RETRIES,
        )
        return DEFAULT_LOCAL_GEMMA_MAX_RETRIES


def _require_local_gemma_enabled_for_model(
    model: str,
    *,
    local_gemma_enabled: bool,
    local_model: str,
    model_role: str,
) -> None:
    normalized_model = normalize_local_gemma_model(model)
    if local_gemma_enabled or not _is_local_gemma_model(normalized_model, local_model):
        return

    raise RuntimeError(
        f"{model_role} `{model}` resolves to local Gemma model `{normalized_model}`, "
        "but local Gemma is disabled. Set GEMMA_BASE_URL or LOCAL_LLM_AUTOSTART."
    )


def _is_local_gemma_model(model: str, local_model: str) -> bool:
    return is_local_gemma_model_name(model, configured_model=local_model)


def _api_key_for_model(
    model: str,
    api_key: str,
    *,
    local_gemma_enabled: bool,
    local_model: str,
) -> str:
    normalized_model = normalize_local_gemma_model(model)
    if local_gemma_enabled and _is_local_gemma_model(normalized_model, local_model):
        return local_gemma_api_key()
    return api_key


def build_primary_with_gpt_fallback(
    *,
    provider_model: str,
    provider_api_key: str,
    fallback_model: str | None,
    timeout: float,
    model_factory: ModelFactory[ModelT],
) -> ModelT:
    # Fallback chain: GPT → Gemini → Gemma4
    local_gemma_enabled = is_local_gemma_enabled()
    local_model = local_gemma_model()
    _require_local_gemma_enabled_for_model(
        provider_model,
        local_gemma_enabled=local_gemma_enabled,
        local_model=local_model,
        model_role="primary model",
    )
    if fallback_model:
        _require_local_gemma_enabled_for_model(
            fallback_model,
            local_gemma_enabled=local_gemma_enabled,
            local_model=local_model,
            model_role="fallback model",
        )

    primary_model = normalize_local_gemma_model(provider_model)
    primary_api_key = _api_key_for_model(
        primary_model,
        provider_api_key,
        local_gemma_enabled=local_gemma_enabled,
        local_model=local_model,
    )
    primary = model_factory(primary_model, primary_api_key, timeout)
    fallbacks: list[ModelT] = []
    fallback_chain_names: list[str] = []
    added_fallback_models: set[str] = set()

    def add_fallback(model: str, api_key: str) -> None:
        normalized_model = normalize_local_gemma_model(model)
        _require_local_gemma_enabled_for_model(
            model,
            local_gemma_enabled=local_gemma_enabled,
            local_model=local_model,
            model_role="fallback model",
        )
        if normalized_model == primary_model or normalized_model in added_fallback_models:
            return

        fallback_api_key = _api_key_for_model(
            normalized_model,
            api_key,
            local_gemma_enabled=local_gemma_enabled,
            local_model=local_model,
        )
        fallbacks.append(model_factory(normalized_model, fallback_api_key, timeout))
        fallback_chain_names.append(normalized_model)
        added_fallback_models.add(normalized_model)

    # Explicit GPT-tier fallback (skip local Gemma duplicates only when the local fallback is active)
    if fallback_model and not (
        local_gemma_enabled and normalize_local_gemma_model(fallback_model) == local_model
    ):
        add_fallback(fallback_model, provider_api_key)

    # Gemini fallback (auto-added when GEMINI_API_KEY or GOOGLE_API_KEY is set)
    _gemini_key = gemini_api_key()
    if _gemini_key:
        add_fallback(DEFAULT_GEMINI_MODEL, _gemini_key)

    # Local Gemma fallback (auto-added when GEMMA_BASE_URL or LOCAL_LLM_AUTOSTART is set)
    if local_gemma_enabled:
        ensure_local_gemma_runtime()
        add_fallback(local_model, local_gemma_api_key())

    logger.info("LLM chain: %s", " → ".join([primary_model, *fallback_chain_names]))

    if not fallbacks:
        return primary
    return cast(ModelT, primary.with_fallbacks(fallbacks, exceptions_to_handle=TRANSIENT_LLM_ERRORS))
