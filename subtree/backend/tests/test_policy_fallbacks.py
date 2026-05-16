import unittest

from domain.models import CareInsight, PetProfile, PetRecord, PlannedReminder
from infrastructure.policies.missing_record_policy import MissingRecordPolicy
from infrastructure.policies.pattern_analyzer import PatternAnalyzer
from infrastructure.policies.reminder_planner import ReminderPlanner
from infrastructure.policies.risk_signal_policy import RiskSignalPolicy
from infrastructure.policies.suggestion_composer import SuggestionComposer


class TestPolicyFallbacks(unittest.TestCase):
    def test_real_policy_classes_return_safe_empty_results_for_api_pipeline(self):
        pet = PetProfile(id="pet-1", name="초코")
        records = (
            PetRecord(
                id="record-1",
                pet_id="pet-1",
                category="walk",
                title="산책",
                detail="저녁 산책 20분",
                status="normal",
                recorded_at="2026-05-09T10:00:00Z",
                source="manual",
            ),
        )

        self.assertEqual(PatternAnalyzer().analyze(pet, records), ())
        self.assertEqual(MissingRecordPolicy().detect_missing_records(pet, records), ())
        self.assertEqual(RiskSignalPolicy().detect_risks("저녁 산책 20분", records), ())
        self.assertEqual(SuggestionComposer().compose(pet, ()), ())

    def test_reminder_planner_keeps_existing_due_items_without_creating_new_ones(self):
        pet = PetProfile(id="pet-1", name="초코")
        due_item = PlannedReminder(title="정기 검진", due_date="2026-05-15", reason="예정된 일정")

        self.assertEqual(ReminderPlanner().plan(pet, (), (due_item,)), (due_item,))

    def test_suggestion_composer_maps_insights_to_basic_suggestions(self):
        pet = PetProfile(id="pet-1", name="초코")
        insight = CareInsight(
            severity="notice",
            title="산책 감소",
            reason="최근 산책 기록이 줄었습니다.",
            source_record_ids=("record-1",),
        )

        suggestions = SuggestionComposer().compose(pet, (insight,))

        self.assertEqual(len(suggestions), 1)
        self.assertEqual(suggestions[0].title, "산책 감소")
        self.assertEqual(suggestions[0].source_record_ids, ("record-1",))

    def test_pattern_analyzer_uses_korean_category_labels_in_reason(self):
        pet = PetProfile(id="pet-1", name="초코")
        records = (
            PetRecord(
                id="record-1",
                pet_id="pet-1",
                category="medical",
                title="약 복용",
                detail="약을 먹은 뒤 기운이 없습니다.",
                status="notice",
                recorded_at="2026-05-09T10:00:00Z",
                source="manual",
            ),
            PetRecord(
                id="record-2",
                pet_id="pet-1",
                category="stool",
                title="묽은 변",
                detail="묽은 변을 봤습니다.",
                status="alert",
                recorded_at="2026-05-09T11:00:00Z",
                source="manual",
            ),
        )

        insights = PatternAnalyzer().analyze(pet, records)

        self.assertEqual(len(insights), 1)
        self.assertEqual(insights[0].reason, "초코의 최근 기록에서 병원/접종, 배변 관련 확인 필요 상태가 반복되었습니다.")


if __name__ == "__main__":
    unittest.main()
