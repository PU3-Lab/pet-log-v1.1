from __future__ import annotations

import unittest

from domain.models import ContextAnalysisResult, PetProfile, PetRecord, PlannedReminder
from infrastructure.llm.record_summary import RecordSummaryProvider


class FakeStructuredModel:
    def __init__(self, response: dict[str, object]) -> None:
        self.response = response
        self.calls: list[list[tuple[str, str]]] = []

    def invoke(self, messages: list[tuple[str, str]]) -> dict[str, object]:
        self.calls.append(messages)
        return self.response


class TestRecordSummaryProvider(unittest.TestCase):
    def test_summarize_invokes_structured_model_and_maps_response(self):
        model_output = {
            "summary": "초코의 새벽 짖음 기록이 반복되는지 지켜볼 필요가 있습니다.",
            "record_ids": ["record-1"],
            "highlights": ["새벽 짖음"],
            "behavior_patterns": ["현관 쪽 반응"],
            "missing_record_notes": ["짖음 이후 안정 여부 기록이 있으면 좋습니다."],
            "safety_notice": None,
        }
        structured_model = FakeStructuredModel(model_output)
        provider = RecordSummaryProvider(
            api_key="test-key",
            model="test-model",
            structured_model=structured_model,
        )
        pet = PetProfile(id="pet-1", name="초코")
        records = (
            PetRecord(
                id="record-1",
                pet_id="pet-1",
                category="behavior",
                title="밤에 짖음",
                detail="새벽에 현관 쪽을 보고 10분 정도 짖었다.",
                status="notice",
                recorded_at="2026-05-07T01:10:00+09:00",
                source="manual",
            ),
        )
        due_items = (PlannedReminder(title="산책", due_date="2026-05-07", reason="저녁 산책 예정"),)

        result = provider.summarize(pet, records, ContextAnalysisResult(), due_items)

        self.assertEqual(result.summary, model_output["summary"])
        self.assertEqual(result.record_ids, ("record-1",))
        self.assertEqual(result.highlights, ("새벽 짖음",))
        self.assertEqual(result.behavior_patterns, ("현관 쪽 반응",))
        self.assertEqual(result.missing_record_notes, ("짖음 이후 안정 여부 기록이 있으면 좋습니다.",))
        self.assertEqual(len(structured_model.calls), 1)

        messages = structured_model.calls[0]
        self.assertEqual(messages[0][0], "system")
        self.assertEqual(messages[1][0], "user")
        self.assertIn("진단을 단정하지 마세요", messages[0][1])
        self.assertIn("밤에 짖음", messages[1][1])

    def test_builds_structured_model_with_configured_model(self):
        created: list[dict[str, object]] = []
        structured_model = FakeStructuredModel(
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

        provider = RecordSummaryProvider(
            api_key="test-key",
            model="test-model",
            timeout=12.0,
            model_factory=fake_model_factory,
        )

        provider.summarize(PetProfile(id="pet-1", name="초코"), (), ContextAnalysisResult(), ())

        self.assertEqual(created, [{"model": "test-model", "api_key": "test-key", "timeout": 12.0}])

    def test_summarize_requires_api_key(self):
        provider = RecordSummaryProvider(api_key="")

        with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
            provider.summarize(PetProfile(id="pet-1", name="초코"), (), ContextAnalysisResult(), ())


if __name__ == "__main__":
    unittest.main()
