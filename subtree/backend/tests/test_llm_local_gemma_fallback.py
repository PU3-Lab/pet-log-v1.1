from __future__ import annotations

import unittest
from unittest.mock import patch

from domain.models import ContextAnalysisResult, PetProfile
from infrastructure.llm.model_factory import build_chat_openai_model
from infrastructure.llm.record_summary import RecordSummaryProvider


class FakeChatOpenAI:
    calls: list[dict[str, object]] = []

    def __init__(self, **kwargs: object) -> None:
        self.kwargs = kwargs
        FakeChatOpenAI.calls.append(kwargs)


class FakeFallbackCapableModel:
    def __init__(self, response: dict[str, object], error: BaseException | None = None) -> None:
        self.response = response
        self.error = error
        self.calls: list[list[tuple[str, str]]] = []
        self.fallbacks: tuple[FakeFallbackModel, ...] = ()
        self.exceptions_to_handle: tuple[type[BaseException], ...] = ()

    def invoke(self, messages: list[tuple[str, str]], **kwargs: object) -> dict[str, object]:
        self.calls.append(messages)
        if self.error is not None:
            raise self.error
        return self.response

    def with_fallbacks(
        self,
        fallbacks: list[FakeFallbackModel],
        *,
        exceptions_to_handle: tuple[type[BaseException], ...],
    ) -> FakeFallbackModel:
        self.fallbacks = tuple(fallbacks)
        self.exceptions_to_handle = exceptions_to_handle
        return FakeFallbackModel(self, self.fallbacks, exceptions_to_handle)


class FakeFallbackModel:
    def __init__(
        self,
        primary: FakeFallbackCapableModel | None,
        fallbacks: tuple[FakeFallbackModel, ...],
        exceptions_to_handle: tuple[type[BaseException], ...],
        response: dict[str, object] | None = None,
    ) -> None:
        self.primary = primary
        self.fallbacks = fallbacks
        self.exceptions_to_handle = exceptions_to_handle
        self.response = response or {}
        self.calls: list[list[tuple[str, str]]] = []

    def invoke(self, messages: list[tuple[str, str]], **kwargs: object) -> dict[str, object]:
        self.calls.append(messages)
        if self.primary is None:
            return self.response

        try:
            return self.primary.invoke(messages)
        except self.exceptions_to_handle:
            last_exc: BaseException = RuntimeError("no fallbacks")
            for fallback in self.fallbacks:
                try:
                    return fallback.invoke(messages)
                except self.exceptions_to_handle as exc:
                    last_exc = exc
            raise last_exc


class TestLocalGemmaFallback(unittest.TestCase):
    def setUp(self) -> None:
        FakeChatOpenAI.calls = []

    def test_chat_model_builder_uses_local_gemma_endpoint(self):
        env = {
            "GEMMA_BASE_URL": "http://127.0.0.1:1234/v1",
            "GEMMA_MODEL": "gemma4:e4b",
        }

        with patch.dict("os.environ", env, clear=True), patch(
            "infrastructure.llm.model_factory.ChatOpenAI",
            FakeChatOpenAI,
        ):
            model = build_chat_openai_model("gemma4:e4b", "local-key", 9.0)

        self.assertIsInstance(model, FakeChatOpenAI)
        self.assertEqual(
            FakeChatOpenAI.calls,
            [
                {
                    "model": "gemma4:e4b",
                    "api_key": "local-key",
                    "timeout": 9.0,
                    "base_url": "http://127.0.0.1:1234/v1",
                    "max_retries": 0,
                    "use_responses_api": False,
                }
            ],
        )

    def test_chat_model_builder_allows_local_gemma_retry_override(self):
        env = {
            "GEMMA_BASE_URL": "http://127.0.0.1:1234/v1",
            "GEMMA_MAX_RETRIES": "2",
            "GEMMA_MODEL": "gemma4:e4b",
        }

        with patch.dict("os.environ", env, clear=True), patch(
            "infrastructure.llm.model_factory.ChatOpenAI",
            FakeChatOpenAI,
        ):
            build_chat_openai_model("gemma4:e4b", "local-key", 9.0)

        self.assertEqual(FakeChatOpenAI.calls[0]["max_retries"], 2)

    def test_chat_model_builder_rejects_local_gemma_when_local_runtime_disabled(self):
        env = {
            "GEMMA_MODEL": "google/gemma-4-E4B-it",
        }

        with patch.dict("os.environ", env, clear=True), patch(
            "infrastructure.llm.model_factory.ChatOpenAI",
            FakeChatOpenAI,
        ):
            with self.assertRaisesRegex(RuntimeError, "local Gemma is disabled"):
                build_chat_openai_model("google/gemma-4-E4B-it", "gpt-key", 9.0)

        self.assertEqual(FakeChatOpenAI.calls, [])

    def test_chat_model_builder_rejects_any_known_gemma_alias_when_local_runtime_disabled(self):
        with patch.dict("os.environ", {}, clear=True), patch(
            "infrastructure.llm.model_factory.ChatOpenAI",
            FakeChatOpenAI,
        ):
            with self.assertRaisesRegex(RuntimeError, "gemma4:e2b"):
                build_chat_openai_model("google/gemma-4-E2B-it", "gpt-key", 9.0)

        self.assertEqual(FakeChatOpenAI.calls, [])

    def test_chat_model_builder_treats_autostart_false_as_local_runtime_disabled(self):
        env = {
            "LOCAL_LLM_AUTOSTART": "false",
            "GEMMA_MODEL": "gemma4:e4b",
        }

        with patch.dict("os.environ", env, clear=True), patch(
            "infrastructure.llm.model_factory.ChatOpenAI",
            FakeChatOpenAI,
        ):
            with self.assertRaisesRegex(RuntimeError, "local Gemma is disabled"):
                build_chat_openai_model("gemma4:e4b", "local-key", 9.0)

        self.assertEqual(FakeChatOpenAI.calls, [])

    def test_chat_model_builder_keeps_gpt_on_openai_responses_api(self):
        with patch.dict("os.environ", {}, clear=True), patch(
            "infrastructure.llm.model_factory.ChatOpenAI",
            FakeChatOpenAI,
        ):
            model = build_chat_openai_model("gpt-5-mini", "openai-key", 8.0)

        self.assertIsInstance(model, FakeChatOpenAI)
        self.assertEqual(
            FakeChatOpenAI.calls,
            [
                {
                    "model": "gpt-5-mini",
                    "api_key": "openai-key",
                    "timeout": 8.0,
                    "use_responses_api": True,
                }
            ],
        )

    def test_record_summary_allows_local_gemma_primary_without_openai_key(self):
        created: list[dict[str, object]] = []
        local_primary = FakeFallbackCapableModel(
            {
                "summary": "Local Gemma primary 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            }
        )

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            if model == "gemma4:e4b":
                return local_primary
            raise AssertionError(f"Unexpected model: {model}")

        env = {
            "GEMMA_BASE_URL": "http://127.0.0.1:1234/v1",
            "GEMMA_API_KEY": "local-key",
            "OPENAI_RECORD_SUMMARY_MODEL": "gemma4:e4b",
        }
        with patch.dict("os.environ", env, clear=True):
            provider = RecordSummaryProvider(timeout=11.0, model_factory=fake_model_factory)
            result = provider.summarize(PetProfile(id="pet-1", name="초코"), (), ContextAnalysisResult(), ())

        self.assertEqual(result.summary, "Local Gemma primary 요약입니다.")
        self.assertEqual(
            created,
            [{"model": "gemma4:e4b", "api_key": "local-key", "timeout": 11.0}],
        )

    def test_record_summary_uses_gpt_primary_and_gemma_fallback(self):
        created: list[dict[str, object]] = []
        gpt_primary = FakeFallbackCapableModel(
            {},
            error=TimeoutError("gpt timed out"),
        )
        gemma_fallback = FakeFallbackModel(
            None,
            (),
            (),
            response={
                "summary": "Gemma fallback 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            },
        )

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            if model == "gpt-5-mini":
                return gpt_primary
            if model == "gemma4:e4b":
                return gemma_fallback
            raise AssertionError(f"Unexpected model: {model}")

        env = {
            "GEMMA_BASE_URL": "http://127.0.0.1:1234/v1",
            "GEMMA_MODEL": "gemma4:e4b",
            "GEMMA_API_KEY": "local-key",
            "OPENAI_API_KEY": "gpt-key",
            "OPENAI_RECORD_SUMMARY_MODEL": "gpt-5-mini",
        }
        with patch.dict("os.environ", env, clear=True):
            provider = RecordSummaryProvider(timeout=11.0, model_factory=fake_model_factory)
            result = provider.summarize(PetProfile(id="pet-1", name="초코"), (), ContextAnalysisResult(), ())

        self.assertEqual(result.summary, "Gemma fallback 요약입니다.")
        self.assertEqual(
            created,
            [
                {"model": "gpt-5-mini", "api_key": "gpt-key", "timeout": 11.0},
                {"model": "gemma4:e4b", "api_key": "local-key", "timeout": 11.0},
            ],
        )
        self.assertEqual(len(gpt_primary.calls), 1)
        self.assertEqual(len(gemma_fallback.calls), 1)
        self.assertIn(TimeoutError, gpt_primary.exceptions_to_handle)

    def test_record_summary_uses_gpt_gemini_gemma_chain(self):
        created: list[dict[str, object]] = []
        gpt_primary = FakeFallbackCapableModel({}, error=TimeoutError("gpt timed out"))
        gemini_fallback = FakeFallbackModel(
            None,
            (),
            (),
            response={
                "summary": "Gemini fallback 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            },
        )
        gemma_fallback = FakeFallbackModel(
            None,
            (),
            (),
            response={
                "summary": "Gemma fallback 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            },
        )

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            if model == "gpt-5-mini":
                return gpt_primary
            if model == "gemini-2.0-flash":
                return gemini_fallback
            if model == "gemma4:e4b":
                return gemma_fallback
            raise AssertionError(f"Unexpected model: {model}")

        env = {
            "GEMMA_BASE_URL": "http://127.0.0.1:1234/v1",
            "GEMMA_MODEL": "gemma4:e4b",
            "GEMMA_API_KEY": "local-key",
            "OPENAI_API_KEY": "gpt-key",
            "GEMINI_API_KEY": "gemini-key",
            "OPENAI_RECORD_SUMMARY_MODEL": "gpt-5-mini",
        }
        with patch.dict("os.environ", env, clear=True):
            provider = RecordSummaryProvider(timeout=11.0, model_factory=fake_model_factory)
            result = provider.summarize(PetProfile(id="pet-1", name="초코"), (), ContextAnalysisResult(), ())

        self.assertEqual(result.summary, "Gemini fallback 요약입니다.")
        self.assertEqual(
            created,
            [
                {"model": "gpt-5-mini", "api_key": "gpt-key", "timeout": 11.0},
                {"model": "gemini-2.0-flash", "api_key": "gemini-key", "timeout": 11.0},
                {"model": "gemma4:e4b", "api_key": "local-key", "timeout": 11.0},
            ],
        )

    def test_explicit_fallback_model_matching_gemma_is_deduplicated(self):
        created: list[dict[str, object]] = []
        gpt_primary = FakeFallbackCapableModel(
            {
                "summary": "GPT primary 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            }
        )
        gemma_fallback = FakeFallbackModel(
            None,
            (),
            (),
            response={
                "summary": "Gemma fallback 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            },
        )

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            if model == "gpt-5-mini":
                return gpt_primary
            if model == "gemma4:e4b":
                return gemma_fallback
            raise AssertionError(f"Unexpected model: {model}")

        env = {
            "LOCAL_LLM_AUTOSTART": "1",
            "GEMMA_MODEL": "gemma4:e4b",
            "GEMMA_API_KEY": "local-key",
            "OPENAI_API_KEY": "gpt-key",
            "OPENAI_RECORD_SUMMARY_MODEL": "gpt-5-mini",
            "OPENAI_RECORD_SUMMARY_FALLBACK_MODEL": "gemma4:e4b",
        }
        with patch.dict("os.environ", env, clear=True):
            provider = RecordSummaryProvider(timeout=11.0, model_factory=fake_model_factory)
            result = provider.summarize(PetProfile(id="pet-1", name="초코"), (), ContextAnalysisResult(), ())

        self.assertEqual(result.summary, "GPT primary 요약입니다.")
        # gemma4:e4b appears only once (explicit fallback_model deduplicated, added via local Gemma path)
        self.assertEqual(
            created,
            [
                {"model": "gpt-5-mini", "api_key": "gpt-key", "timeout": 11.0},
                {"model": "gemma4:e4b", "api_key": "local-key", "timeout": 11.0},
            ],
        )

    def test_explicit_huggingface_gemma_fallback_alias_is_deduplicated(self):
        created: list[dict[str, object]] = []
        gpt_primary = FakeFallbackCapableModel(
            {
                "summary": "GPT primary 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            }
        )
        gemma_fallback = FakeFallbackModel(
            None,
            (),
            (),
            response={
                "summary": "Gemma fallback 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            },
        )

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            if model == "gpt-5-mini":
                return gpt_primary
            if model == "gemma4:e4b":
                return gemma_fallback
            raise AssertionError(f"Unexpected model: {model}")

        env = {
            "LOCAL_LLM_AUTOSTART": "1",
            "GEMMA_MODEL": "google/gemma-4-E4B-it",
            "GEMMA_API_KEY": "local-key",
            "OPENAI_API_KEY": "gpt-key",
            "OPENAI_RECORD_SUMMARY_MODEL": "gpt-5-mini",
            "OPENAI_RECORD_SUMMARY_FALLBACK_MODEL": "google/gemma-4-E4B-it",
        }
        with patch.dict("os.environ", env, clear=True):
            provider = RecordSummaryProvider(timeout=11.0, model_factory=fake_model_factory)
            result = provider.summarize(PetProfile(id="pet-1", name="초코"), (), ContextAnalysisResult(), ())

        self.assertEqual(result.summary, "GPT primary 요약입니다.")
        self.assertEqual(
            created,
            [
                {"model": "gpt-5-mini", "api_key": "gpt-key", "timeout": 11.0},
                {"model": "gemma4:e4b", "api_key": "local-key", "timeout": 11.0},
            ],
        )

    def test_explicit_huggingface_gemma_fallback_uses_local_api_key(self):
        created: list[dict[str, object]] = []
        gpt_primary = FakeFallbackCapableModel(
            {
                "summary": "GPT primary 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            }
        )
        gemma_e2b_fallback = FakeFallbackModel(
            None,
            (),
            (),
            response={
                "summary": "Gemma E2B fallback 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            },
        )
        gemma_e4b_fallback = FakeFallbackModel(
            None,
            (),
            (),
            response={
                "summary": "Gemma E4B fallback 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            },
        )

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            if model == "gpt-5-mini":
                return gpt_primary
            if model == "gemma4:e2b":
                return gemma_e2b_fallback
            if model == "gemma4:e4b":
                return gemma_e4b_fallback
            raise AssertionError(f"Unexpected model: {model}")

        env = {
            "LOCAL_LLM_AUTOSTART": "1",
            "GEMMA_MODEL": "gemma4:e4b",
            "GEMMA_API_KEY": "local-key",
            "OPENAI_API_KEY": "gpt-key",
            "OPENAI_RECORD_SUMMARY_MODEL": "gpt-5-mini",
            "OPENAI_RECORD_SUMMARY_FALLBACK_MODEL": "google/gemma-4-E2B-it",
        }
        with patch.dict("os.environ", env, clear=True):
            provider = RecordSummaryProvider(timeout=11.0, model_factory=fake_model_factory)
            result = provider.summarize(PetProfile(id="pet-1", name="초코"), (), ContextAnalysisResult(), ())

        self.assertEqual(result.summary, "GPT primary 요약입니다.")
        self.assertEqual(
            created,
            [
                {"model": "gpt-5-mini", "api_key": "gpt-key", "timeout": 11.0},
                {"model": "gemma4:e2b", "api_key": "local-key", "timeout": 11.0},
                {"model": "gemma4:e4b", "api_key": "local-key", "timeout": 11.0},
            ],
        )

    def test_explicit_huggingface_gemma_fallback_alias_requires_local_runtime(self):
        created: list[dict[str, object]] = []
        gpt_primary = FakeFallbackCapableModel(
            {
                "summary": "GPT primary 요약입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            }
        )

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            if model == "gpt-5-mini":
                return gpt_primary
            raise AssertionError(f"Unexpected model: {model}")

        env = {
            "GEMMA_MODEL": "google/gemma-4-E4B-it",
            "OPENAI_API_KEY": "gpt-key",
            "OPENAI_RECORD_SUMMARY_MODEL": "gpt-5-mini",
            "OPENAI_RECORD_SUMMARY_FALLBACK_MODEL": "google/gemma-4-E4B-it",
        }
        with patch.dict("os.environ", env, clear=True):
            provider = RecordSummaryProvider(timeout=11.0, model_factory=fake_model_factory)
            with self.assertRaisesRegex(RuntimeError, "local Gemma is disabled"):
                provider.summarize(PetProfile(id="pet-1", name="초코"), (), ContextAnalysisResult(), ())

        self.assertEqual(
            created,
            [],
        )

    def test_three_tier_fallback_gpt_and_gemini_fail_gemma_responds(self):
        created: list[dict[str, object]] = []
        gpt_primary = FakeFallbackCapableModel({}, error=TimeoutError("gpt timed out"))
        gemini_fallback_with_error = FakeFallbackCapableModel(
            {}, error=TimeoutError("gemini timed out")
        )
        gemma_fallback = FakeFallbackModel(
            None,
            (),
            (),
            response={
                "summary": "Gemma 최종 응답입니다.",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            },
        )

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            if model == "gpt-5-mini":
                return gpt_primary
            if model == "gemini-2.0-flash":
                return gemini_fallback_with_error
            if model == "gemma4:e4b":
                return gemma_fallback
            raise AssertionError(f"Unexpected model: {model}")

        env = {
            "GEMMA_BASE_URL": "http://127.0.0.1:1234/v1",
            "GEMMA_MODEL": "gemma4:e4b",
            "GEMMA_API_KEY": "local-key",
            "OPENAI_API_KEY": "gpt-key",
            "GEMINI_API_KEY": "gemini-key",
            "OPENAI_RECORD_SUMMARY_MODEL": "gpt-5-mini",
        }
        with patch.dict("os.environ", env, clear=True):
            provider = RecordSummaryProvider(timeout=11.0, model_factory=fake_model_factory)
            result = provider.summarize(PetProfile(id="pet-1", name="초코"), (), ContextAnalysisResult(), ())

        self.assertEqual(result.summary, "Gemma 최종 응답입니다.")
        self.assertEqual(
            created,
            [
                {"model": "gpt-5-mini", "api_key": "gpt-key", "timeout": 11.0},
                {"model": "gemini-2.0-flash", "api_key": "gemini-key", "timeout": 11.0},
                {"model": "gemma4:e4b", "api_key": "local-key", "timeout": 11.0},
            ],
        )

    def test_provider_eager_load_builds_model_during_initialization(self):
        created: list[dict[str, object]] = []
        structured_model = FakeFallbackCapableModel(
            {
                "summary": "요약",
                "record_ids": [],
                "highlights": [],
                "behavior_patterns": [],
                "missing_record_notes": [],
                "safety_notice": None,
            }
        )

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            return structured_model

        with patch.dict("os.environ", {"LLM_EAGER_LOAD": "1"}, clear=True):
            RecordSummaryProvider(
                api_key="test-key",
                model="test-model",
                timeout=3.0,
                model_factory=fake_model_factory,
            )

        self.assertEqual(created, [{"model": "test-model", "api_key": "test-key", "timeout": 3.0}])


if __name__ == "__main__":
    unittest.main()
