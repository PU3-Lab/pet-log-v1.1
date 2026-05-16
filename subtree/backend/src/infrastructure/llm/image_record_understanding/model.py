from __future__ import annotations

from infrastructure.llm.model_factory import LLMModel, build_chat_model, is_gemini_model
from infrastructure.llm.image_record_understanding.schema import ImageRecordUnderstandingOutput


DEFAULT_IMAGE_RECORD_UNDERSTANDING_MODEL = "gpt-5-mini"


def build_image_record_understanding_model(
    model: str,
    api_key: str,
    timeout: float,
) -> LLMModel:
    llm = build_chat_model(model, api_key, timeout)
    kwargs: dict[str, object] = {"method": "json_schema"}
    if not is_gemini_model(model):
        kwargs["strict"] = True
    return llm.with_structured_output(ImageRecordUnderstandingOutput, **kwargs)
