import unittest

from domain.models import PetProfile, PetRecord
from infrastructure.policies.missing_record_policy import MissingRecordPolicy
from infrastructure.policies.pattern_analyzer import PatternAnalyzer


class TestContextPolicies(unittest.TestCase):
    def test_pattern_analyzer_creates_insight_when_notice_or_alert_repeats(self):
        pet = PetProfile(id="pet-1", name="초코")
        records = (
            PetRecord(
                id="record-alert",
                pet_id="pet-1",
                category="behavior",
                title="현관 앞 낑낑거림",
                detail="외출 준비를 보자 낑낑거림이 반복됐어요.",
                status="alert",
                recorded_at="2026-05-09T20:00:00Z",
                source="manual",
            ),
            PetRecord(
                id="record-notice",
                pet_id="pet-1",
                category="meal",
                title="아침 식사 감소",
                detail="평소보다 조금 적게 먹었어요.",
                status="notice",
                recorded_at="2026-05-09T08:00:00Z",
                source="manual",
            ),
            PetRecord(
                id="record-normal",
                pet_id="pet-1",
                category="walk",
                title="저녁 산책",
                detail="20분 산책했어요.",
                status="normal",
                recorded_at="2026-05-08T18:00:00Z",
                source="manual",
            ),
        )

        insights = PatternAnalyzer().analyze(pet, records)

        self.assertEqual(len(insights), 1)
        self.assertEqual(insights[0].severity, "alert")
        self.assertIn("반복", insights[0].title)
        self.assertEqual(insights[0].source_record_ids, ("record-alert", "record-notice"))

    def test_pattern_analyzer_returns_empty_for_normal_records(self):
        pet = PetProfile(id="pet-1", name="초코")
        records = (
            PetRecord(
                id="record-normal",
                pet_id="pet-1",
                category="walk",
                title="저녁 산책",
                detail="20분 산책했어요.",
                status="normal",
                recorded_at="2026-05-08T18:00:00Z",
                source="manual",
            ),
        )

        self.assertEqual(PatternAnalyzer().analyze(pet, records), ())

    def test_missing_record_policy_creates_notice_when_records_are_empty(self):
        pet = PetProfile(id="pet-1", name="초코")

        insights = MissingRecordPolicy().detect_missing_records(pet, ())

        self.assertEqual(len(insights), 1)
        self.assertEqual(insights[0].severity, "notice")
        self.assertIn("기록", insights[0].title)
        self.assertEqual(insights[0].source_record_ids, ())

    def test_missing_record_policy_returns_empty_when_records_exist(self):
        pet = PetProfile(id="pet-1", name="초코")
        records = (
            PetRecord(
                id="record-normal",
                pet_id="pet-1",
                category="walk",
                title="저녁 산책",
                detail="20분 산책했어요.",
                status="normal",
                recorded_at="2026-05-08T18:00:00Z",
                source="manual",
            ),
        )

        self.assertEqual(MissingRecordPolicy().detect_missing_records(pet, records), ())


if __name__ == "__main__":
    unittest.main()
