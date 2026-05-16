from __future__ import annotations

import unittest
import warnings

from application.dto import PetLogAgentInput
from domain.models import PetProfile
from infrastructure.llm.record_structuring import RecordStructurer
from infrastructure.llm.record_structuring.mapper import to_structured_record_batch
from infrastructure.llm.record_structuring.schema import StructuredRecordBatchOutput


class NoisyStructuredRecordBatchOutput(StructuredRecordBatchOutput):
    def model_dump(self, *args, **kwargs):
        warnings.warn("model_dump called", UserWarning, stacklevel=2)
        return super().model_dump(*args, **kwargs)


class FakeStructuredModel:
    def __init__(self, response: dict[str, object]) -> None:
        self.response = response
        self.calls: list[list[tuple[str, str]]] = []

    def invoke(self, messages: list[tuple[str, str]], **_kwargs: object) -> dict[str, object]:
        self.calls.append(messages)
        return self.response


class FakeFallbackCapableStructuredModel(FakeStructuredModel):
    def __init__(self, response: dict[str, object], error: BaseException | None = None) -> None:
        super().__init__(response)
        self.error = error
        self.fallbacks: tuple[FakeStructuredModel, ...] = ()
        self.exceptions_to_handle: tuple[type[BaseException], ...] = ()

    def invoke(self, messages: list[tuple[str, str]], **_kwargs: object) -> dict[str, object]:
        self.calls.append(messages)
        if self.error is not None:
            raise self.error
        return self.response

    def with_fallbacks(
        self,
        fallbacks: list[FakeStructuredModel],
        *,
        exceptions_to_handle: tuple[type[BaseException], ...],
    ) -> FakeStructuredModel:
        self.fallbacks = tuple(fallbacks)
        self.exceptions_to_handle = exceptions_to_handle
        return FakeFallbackStructuredModel(self, self.fallbacks, exceptions_to_handle)


class FakeFallbackStructuredModel:
    def __init__(
        self,
        primary: FakeFallbackCapableStructuredModel,
        fallbacks: tuple[FakeStructuredModel, ...],
        exceptions_to_handle: tuple[type[BaseException], ...],
    ) -> None:
        self.primary = primary
        self.fallbacks = fallbacks
        self.exceptions_to_handle = exceptions_to_handle

    def invoke(self, messages: list[tuple[str, str]], **kwargs: object) -> dict[str, object]:
        try:
            return self.primary.invoke(messages, **kwargs)
        except self.exceptions_to_handle:
            return self.fallbacks[0].invoke(messages, **kwargs)


class TestRecordStructurer(unittest.TestCase):
    def test_maps_pydantic_structured_output_without_serialization_warnings(self):
        model_output = NoisyStructuredRecordBatchOutput(
            candidates=[
                {
                    "title": "식사",
                    "detail": "사료를 조금 남김",
                    "category": "meal",
                    "status": "notice",
                    "confidence": 0.91,
                    "needs_confirmation": False,
                    "measurements": ["사료 조금 남김"],
                }
            ]
        )

        with warnings.catch_warnings(record=True) as captured:
            warnings.simplefilter("always")
            batch = to_structured_record_batch(model_output)

        self.assertEqual(tuple(candidate.title for candidate in batch.candidates), ("식사",))
        self.assertEqual(captured, [])

    def test_structure_invokes_model_and_maps_batch(self):
        model_output = {
            "candidates": [
                {
                    "title": "식사",
                    "detail": "오전 8시에 사료 40g 중 15g만 먹음",
                    "category": "meal",
                    "status": "notice",
                    "confidence": 0.92,
                    "needs_confirmation": False,
                    "measurements": ["오전 8시", "사료 40g", "섭취 15g"],
                },
                {
                    "title": "산책",
                    "detail": "저녁 산책을 12분만 함",
                    "category": "walk",
                    "status": "notice",
                    "confidence": 0.9,
                    "needs_confirmation": False,
                    "measurements": ["12분"],
                },
                {
                    "title": "귀 긁음",
                    "detail": "오른쪽 귀를 5번 긁음",
                    "category": "medical",
                    "status": "notice",
                    "confidence": 0.82,
                    "needs_confirmation": True,
                    "measurements": ["오른쪽 귀", "5번"],
                },
            ],
        }
        structured_model = FakeStructuredModel(model_output)
        structurer = RecordStructurer(
            api_key="test-key",
            model="test-model",
            structured_model=structured_model,
        )
        input = PetLogAgentInput(
            pet=PetProfile(id="pet-1", name="초코", species="companion"),
            text="오늘 오전 8시에 초코가 사료 40g 중 15g만 먹고, 저녁 산책은 12분만 했고, 오른쪽 귀를 5번 긁었어.",
            source="manual",
        )

        batch = structurer.structure(input)

        self.assertEqual(len(batch.candidates), 3)
        self.assertEqual(tuple(candidate.category for candidate in batch.candidates), ("meal", "walk", "medical"))
        self.assertEqual(tuple(candidate.title for candidate in batch.candidates), ("식사", "산책", "귀 긁음"))
        self.assertEqual(
            tuple(candidate.measurements for candidate in batch.candidates),
            (("오전 8시", "사료 40g", "섭취 15g"), ("12분",), ("오른쪽 귀", "5번")),
        )
        self.assertEqual(tuple(candidate.needs_confirmation for candidate in batch.candidates), (False, False, True))
        self.assertTrue(batch.needs_confirmation)
        self.assertEqual(len(structured_model.calls), 1)

        messages = structured_model.calls[0]
        self.assertEqual(messages[0][0], "system")
        self.assertEqual(messages[1][0], "user")
        self.assertIn("여러 사건이 섞이면 후보를 나누세요", messages[0][1])
        self.assertIn("사료 40g 중 15g", messages[1][1])
        self.assertIn("meal", messages[1][1])
        self.assertIn("walk", messages[1][1])
        self.assertIn("medical", messages[1][1])

    def test_prompt_delegates_korean_count_measurements_to_agent(self):
        structured_model = FakeStructuredModel({"candidates": []})
        structurer = RecordStructurer(
            api_key="test-key",
            model="test-model",
            structured_model=structured_model,
        )

        structurer.structure(
            PetLogAgentInput(
                pet=PetProfile(id="pet-1", name="꾸꾸", species="companion"),
                text="오늘 꾸꾸가 10분 정도 산책하고, 배변은 세 번 했고, 사료는 10g씩 세 번 먹었어.",
                source="ai_preview",
            )
        )

        user_prompt = structured_model.calls[0][1][1]
        self.assertIn("한국어 수량 표현", user_prompt)
        self.assertIn("세 번", user_prompt)
        self.assertIn("10g씩 3회", user_prompt)

    def test_prompt_requires_exact_behavior_word_in_measurements(self):
        structured_model = FakeStructuredModel({"candidates": []})
        structurer = RecordStructurer(
            api_key="test-key",
            model="test-model",
            structured_model=structured_model,
        )

        structurer.structure(
            PetLogAgentInput(
                pet=PetProfile(id="pet-1", name="꾸꾸", species="companion"),
                text="초인종 소리에 꾸꾸가 계속 짖었어.",
                source="ai_preview",
            )
        )

        user_prompt = structured_model.calls[0][1][1]
        self.assertIn("행동 카테고리", user_prompt)
        self.assertIn("정확한 행동 단어", user_prompt)
        self.assertIn("행동이라고만 쓰지 말고", user_prompt)
        self.assertIn("짖음", user_prompt)

    def test_prompt_prevents_behavior_context_from_becoming_stool_candidate(self):
        structured_model = FakeStructuredModel({"candidates": []})
        structurer = RecordStructurer(
            api_key="test-key",
            model="test-model",
            structured_model=structured_model,
        )

        structurer.structure(
            PetLogAgentInput(
                pet=PetProfile(id="pet-1", name="꾸꾸", species="companion"),
                text="배변 패드 주변을 맴돌고 낑낑댔어.",
                source="ai_preview",
            )
        )

        user_prompt = structured_model.calls[0][1][1]
        self.assertIn("배변 단어가 행동의 배경", user_prompt)
        self.assertIn("별도 stool 후보", user_prompt)
        self.assertIn("배변 패드 주변을 맴돌고 낑낑댐", user_prompt)

    def test_builds_structured_model_with_configured_model(self):
        created: list[dict[str, object]] = []
        structured_model = FakeStructuredModel({"candidates": []})

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            return structured_model

        structurer = RecordStructurer(
            api_key="test-key",
            model="test-model",
            timeout=12.0,
            model_factory=fake_model_factory,
        )

        structurer.structure(
            PetLogAgentInput(
                pet=PetProfile(id="pet-1", name="초코"),
                text="오늘 밥을 먹었어",
                source="manual",
            )
        )

        self.assertEqual(created, [{"model": "test-model", "api_key": "test-key", "timeout": 12.0}])

    def test_structure_uses_fallback_model_when_primary_model_fails(self):
        created: list[str] = []
        primary_model = FakeFallbackCapableStructuredModel({"candidates": []}, error=TimeoutError("timed out"))
        fallback_model = FakeStructuredModel(
            {
                "candidates": [
                    {
                        "title": "식사",
                        "detail": "사료를 조금 먹음",
                        "category": "meal",
                        "status": "notice",
                        "confidence": 0.88,
                        "needs_confirmation": False,
                        "measurements": [],
                    }
                ],
            }
        )

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append(model)
            if model == "primary-model":
                return primary_model
            if model == "fallback-model":
                return fallback_model
            raise AssertionError(f"Unexpected model: {model}")

        structurer = RecordStructurer(
            api_key="test-key",
            model="primary-model",
            fallback_model="fallback-model",
            model_factory=fake_model_factory,
        )

        batch = structurer.structure(
            PetLogAgentInput(
                pet=PetProfile(id="pet-1", name="초코"),
                text="오늘 밥을 조금 먹었어",
                source="manual",
            )
        )

        self.assertEqual(created, ["primary-model", "fallback-model"])
        self.assertEqual(tuple(candidate.title for candidate in batch.candidates), ("식사",))
        self.assertEqual(len(primary_model.calls), 1)
        self.assertEqual(len(fallback_model.calls), 1)
        self.assertEqual(fallback_model.calls[0], primary_model.calls[0])
        self.assertIn(TimeoutError, primary_model.exceptions_to_handle)

    def test_structure_requires_api_key(self):
        structurer = RecordStructurer(api_key="")

        with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
            structurer.structure(
                PetLogAgentInput(
                    pet=PetProfile(id="pet-1", name="초코"),
                    text="오늘 밥을 먹었어",
                    source="manual",
                )
            )


if __name__ == "__main__":
    unittest.main()
