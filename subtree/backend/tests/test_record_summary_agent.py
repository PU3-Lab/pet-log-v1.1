from __future__ import annotations

import unittest

from application.dto import RecordSummaryResult
from application.agents.record_summary import RecordSummaryAgent
from domain.models import ContextAnalysisResult, PetProfile, PetRecord, PlannedReminder
from infrastructure.llm.record_summary.mapper import record_payload


class FakeRecordSummaryProvider:
    def __init__(self, result: RecordSummaryResult) -> None:
        self.result = result
        self.calls: list[
            tuple[
                PetProfile,
                tuple[PetRecord, ...],
                ContextAnalysisResult,
                tuple[PlannedReminder, ...],
            ]
        ] = []

    def summarize(
        self,
        pet: PetProfile,
        records: tuple[PetRecord, ...],
        context: ContextAnalysisResult,
        due_items: tuple[PlannedReminder, ...],
    ) -> RecordSummaryResult:
        self.calls.append((pet, records, context, due_items))
        return self.result


class TestRecordSummaryAgent(unittest.TestCase):
    def test_record_summary_payload_includes_korean_record_labels(self):
        record = PetRecord(
            id="record-1",
            pet_id="pet-1",
            category="stool",
            title="묽은 변",
            detail="묽은 변을 봤습니다.",
            status="alert",
            recorded_at="2026-05-07T01:10:00+09:00",
            source="manual",
        )

        payload = record_payload(record)

        self.assertEqual(payload["category_label"], "배변")
        self.assertEqual(payload["status_label"], "주의")

    def test_summarize_delegates_to_provider(self):
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
        context = ContextAnalysisResult()
        due_items = (PlannedReminder(title="산책", due_date="2026-05-07", reason="저녁 산책 예정"),)
        expected = RecordSummaryResult(
            summary="초코가 새벽에 현관 쪽을 보고 짖은 기록이 있습니다.",
            record_ids=("record-1",),
            highlights=("새벽 짖음",),
        )
        provider = FakeRecordSummaryProvider(expected)

        result = RecordSummaryAgent(provider).summarize(pet, records, context, due_items)

        self.assertEqual(result, expected)
        self.assertEqual(provider.calls, [(pet, records, context, due_items)])


if __name__ == "__main__":
    unittest.main()
