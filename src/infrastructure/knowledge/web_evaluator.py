from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field

from infrastructure.knowledge.web_search import WebSearchResult
from infrastructure.llm.base_provider import BaseLLMProvider
from infrastructure.llm.model_factory import LLMModel, ModelFactory, build_chat_openai_model
from infrastructure.llm.provider_config import LLMProviderConfig


DEFAULT_WEB_KNOWLEDGE_EVALUATOR_MODEL = "gpt-5-mini"


class WebKnowledgeEvaluationOutput(BaseModel):
    accepted: bool = Field(
        description="Whether this web result is reliable and useful enough to add to the care knowledge base."
    )
    title: str = Field(description="Concise title for the vetted knowledge.")
    cleaned_text: str = Field(
        description="Factual, citation-friendly care knowledge extracted from the source. Exclude ads and speculation."
    )
    reason: str = Field(description="Brief reason for accepting or rejecting this result.")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in this evaluation.")
    tags: list[str] = Field(description="Short topical tags such as dog, cat, vaccination, nutrition, behavior.")
    risk_level: Literal["low", "medium", "high"] = Field(
        description="Risk if this information is wrong or misused."
    )


def build_web_knowledge_evaluator_model(model: str, api_key: str, timeout: float) -> LLMModel:
    llm = build_chat_openai_model(model, api_key, timeout)
    return llm.with_structured_output(
        WebKnowledgeEvaluationOutput,
        method="json_schema",
        strict=True,
    )


@dataclass(frozen=True)
class EvaluatedWebKnowledge:
    accepted: bool
    title: str
    cleaned_text: str
    source_url: str
    reason: str
    confidence: float
    tags: tuple[str, ...] = ()
    risk_level: str = "medium"


class WebKnowledgeEvaluator(BaseLLMProvider[LLMModel]):
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 30.0,
        model_factory: ModelFactory[LLMModel] = build_web_knowledge_evaluator_model,
        structured_model: LLMModel | None = None,
    ) -> None:
        super().__init__(
            config=LLMProviderConfig.from_env(
                provider_name="WebKnowledgeEvaluator",
                model_env="OPENAI_WEB_KNOWLEDGE_EVALUATOR_MODEL",
                default_model=DEFAULT_WEB_KNOWLEDGE_EVALUATOR_MODEL,
                fallback_model_env="OPENAI_WEB_KNOWLEDGE_EVALUATOR_FALLBACK_MODEL",
                api_key=api_key,
                model=model,
                timeout=timeout,
            ),
            model_factory=model_factory,
            model=structured_model,
        )

    def evaluate(self, result: WebSearchResult) -> EvaluatedWebKnowledge:
        output = to_web_knowledge_evaluation(
            self._invoke_llm(build_web_knowledge_evaluation_messages(result)),
            source_url=result.url,
            fallback_title=result.title,
        )
        if not output.accepted:
            return output
        if not output.cleaned_text.strip():
            return EvaluatedWebKnowledge(
                accepted=False,
                title=output.title,
                cleaned_text="",
                source_url=output.source_url,
                reason="Accepted evaluation did not include cleaned_text.",
                confidence=0.0,
                tags=output.tags,
                risk_level=output.risk_level,
            )
        return output

    def evaluate_many(self, results: tuple[WebSearchResult, ...]) -> tuple[EvaluatedWebKnowledge, ...]:
        return tuple(self.evaluate(result) for result in results)


def build_web_knowledge_evaluation_messages(result: WebSearchResult) -> list[tuple[str, str]]:
    system_prompt = (
        "You evaluate web search results for a pet care RAG knowledge base. "
        "Accept only reliable, factual, non-promotional information that can help answer pet care questions. "
        "Reject thin content, ads, unsafe medical claims, unclear sourcing, or unrelated pages. "
        "Do not diagnose. Prefer cautious wording and preserve source-specific facts."
    )
    user_prompt = (
        "Evaluate this web result.\n"
        f"title: {result.title}\n"
        f"url: {result.url}\n"
        f"search_score: {result.score}\n"
        f"content:\n{result.content}"
    )
    return [("system", system_prompt), ("user", user_prompt)]


def to_web_knowledge_evaluation(
    value: object,
    *,
    source_url: str,
    fallback_title: str,
) -> EvaluatedWebKnowledge:
    if isinstance(value, BaseModel):
        parsed = value.model_dump()
    elif isinstance(value, dict):
        parsed = value
    else:
        raise RuntimeError("Web knowledge evaluator output had an invalid shape.")

    accepted = bool(parsed.get("accepted", False))
    title = str(parsed.get("title") or fallback_title).strip()
    cleaned_text = str(parsed.get("cleaned_text") or "").strip()
    reason = str(parsed.get("reason") or "").strip()
    confidence = float(parsed.get("confidence", 0.0))
    tags = tuple(str(tag).strip() for tag in parsed.get("tags", []) if str(tag).strip())
    risk_level = str(parsed.get("risk_level") or "medium").strip()

    if risk_level not in {"low", "medium", "high"}:
        raise RuntimeError("Web knowledge evaluator output had an invalid risk_level.")

    return EvaluatedWebKnowledge(
        accepted=accepted,
        title=title,
        cleaned_text=cleaned_text,
        source_url=source_url,
        reason=reason,
        confidence=max(0.0, min(confidence, 1.0)),
        tags=tags,
        risk_level=risk_level,
    )
