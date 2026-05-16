from __future__ import annotations

import unittest

from application.dto import NotificationCandidate, ProactiveQuestionResult
from application.agents.notification import NotificationAgent
from application.agents.photo_record_understanding import PhotoRecordUnderstandingAgent
from application.agents.proactive_question import ProactiveQuestionAgent
from domain.models import ContextAnalysisResult, PetProfile, PlannedReminder, SafetyNotice, StructuredRecordCandidate


class FakeProactiveQuestionPolicy:
    def __init__(self, result: ProactiveQuestionResult | None) -> None:
        self.result = result
        self.calls: list[tuple[PetProfile, tuple[object, ...], ContextAnalysisResult, tuple[PlannedReminder, ...]]] = []

    def build_question(
        self,
        pet: PetProfile,
        records: tuple[object, ...],
        context: ContextAnalysisResult,
        due_items: tuple[PlannedReminder, ...],
    ) -> ProactiveQuestionResult | None:
        self.calls.append((pet, records, context, due_items))
        return self.result


class FakeNotificationPolicy:
    def __init__(self, candidates: tuple[NotificationCandidate, ...]) -> None:
        self.candidates = candidates
        self.calls: list[tuple[PetProfile, ContextAnalysisResult, tuple[SafetyNotice, ...], tuple[PlannedReminder, ...]]] = []

    def plan(
        self,
        pet: PetProfile,
        context: ContextAnalysisResult,
        safety_notices: tuple[SafetyNotice, ...],
        due_items: tuple[PlannedReminder, ...],
    ) -> tuple[NotificationCandidate, ...]:
        self.calls.append((pet, context, safety_notices, due_items))
        return self.candidates


class FakeImageRecordUnderstandingProvider:
    def __init__(self, candidate: StructuredRecordCandidate) -> None:
        self.candidate = candidate
        self.calls: list[tuple[PetProfile, bytes, str, str | None]] = []

    def understand(
        self,
        pet: PetProfile,
        image: bytes,
        content_type: str,
        user_note: str | None = None,
    ) -> StructuredRecordCandidate:
        self.calls.append((pet, image, content_type, user_note))
        return self.candidate


class TestAgentSkeletons(unittest.TestCase):
    def test_proactive_question_agent_delegates_to_policy(self):
        expected = ProactiveQuestionResult(
            question="오늘 산책은 어땠나요?",
            reason="최근 산책 기록이 없습니다.",
        )
        policy = FakeProactiveQuestionPolicy(expected)
        agent = ProactiveQuestionAgent(policy)
        pet = PetProfile(id="pet-1", name="초코")
        context = ContextAnalysisResult()
        due_items = (PlannedReminder(title="산책", due_date="2026-05-09", reason="일정"),)

        result = agent.build_question(pet, (), context, due_items)

        self.assertEqual(result, expected)
        self.assertEqual(policy.calls, [(pet, (), context, due_items)])

    def test_notification_agent_delegates_to_policy(self):
        expected = (
            NotificationCandidate(
                title="확인 필요",
                message="초코 기록을 확인해 주세요.",
                kind="behavior_change",
                dedupe_key="pet-1:behavior",
            ),
        )
        policy = FakeNotificationPolicy(expected)
        agent = NotificationAgent(policy)
        pet = PetProfile(id="pet-1", name="초코")
        context = ContextAnalysisResult()
        safety_notices = (SafetyNotice(level="notice", message="관찰이 필요합니다."),)
        due_items = (PlannedReminder(title="산책", due_date="2026-05-09", reason="일정"),)

        result = agent.plan(pet, context, safety_notices, due_items)

        self.assertEqual(result, expected)
        self.assertEqual(policy.calls, [(pet, context, safety_notices, due_items)])

    def test_photo_record_understanding_agent_delegates_to_provider(self):
        expected = StructuredRecordCandidate(
            title="사료 남김",
            detail="사진상 사료가 조금 남았습니다.",
            category="meal",
            status="notice",
            confidence=0.7,
            needs_confirmation=True,
        )
        provider = FakeImageRecordUnderstandingProvider(expected)
        agent = PhotoRecordUnderstandingAgent(provider)
        pet = PetProfile(id="pet-1", name="초코")

        result = agent.understand(pet, b"image", "image/png", user_note="아침 사진")

        self.assertEqual(result, expected)
        self.assertEqual(provider.calls, [(pet, b"image", "image/png", "아침 사진")])


if __name__ == "__main__":
    unittest.main()
