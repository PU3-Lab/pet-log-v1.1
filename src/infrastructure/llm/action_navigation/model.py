from __future__ import annotations

from infrastructure.llm.action_navigation.schema import ActionNavigationOutput
from infrastructure.llm.model_factory import LLMModel, build_chat_model, is_gemini_model


DEFAULT_ACTION_NAVIGATION_MODEL = "gpt-5-mini"


def build_action_navigation_model(model: str, api_key: str, timeout: float) -> LLMModel:
    llm = build_chat_model(model, api_key, timeout)
    kwargs: dict[str, object] = {"method": "json_schema"}
    if not is_gemini_model(model):
        kwargs["strict"] = True
    return llm.with_structured_output(ActionNavigationOutput, **kwargs)
