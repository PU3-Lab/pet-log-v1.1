from __future__ import annotations

from infrastructure.llm.model_factory import LLMModel, build_chat_model, is_gemini_model
from infrastructure.llm.record_structuring.schema import StructuredRecordBatchOutput


DEFAULT_RECORD_STRUCTURING_MODEL = "gpt-5-mini"


def build_record_structuring_model(model: str, api_key: str, timeout: float) -> LLMModel:
    llm = build_chat_model(model, api_key, timeout)
    kwargs: dict[str, object] = {"method": "json_schema"}
    if not is_gemini_model(model):
        kwargs["strict"] = True
    return llm.with_structured_output(StructuredRecordBatchOutput, **kwargs)
