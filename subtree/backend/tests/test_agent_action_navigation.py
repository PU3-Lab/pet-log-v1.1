from __future__ import annotations

import unittest

from application.agents.care_action_navigation import CareActionRoutingAgent
from application.agents.context_analysis import ContextAnalysisAgent
from domain.models import CareInsight, ContextAnalysisResult, PetProfile, PetRecord, PlannedReminder
from infrastructure.notifications.policy import NotificationPolicy
from infrastructure.policies.suggestion_composer import SuggestionComposer


class TestAgentActionNavigation(unittest.TestCase):
    def setUp(self) -> None:
        self.pet = PetProfile(id="pet-1", name="초코")

    def test_suggestion_uses_agent_action_href_without_keyword_priority(self) -> None:
        suggestions = SuggestionComposer().compose(
            self.pet,
            (
                CareInsight(
                    severity="notice",
                    title="병원 예약 쇼핑 모두 언급",
                    reason="문구에는 병원과 예약이 있지만 에이전트 선택은 쇼핑입니다.",
                    action_href="/shopping",
                ),
            ),
        )

        self.assertEqual(len(suggestions), 1)
        self.assertEqual(suggestions[0].action_href, "/shopping")

    def test_notification_uses_agent_action_href_without_keyword_priority(self) -> None:
        candidates = NotificationPolicy().plan(
            self.pet,
            ContextAnalysisResult(
                insights=(
                    CareInsight(
                        severity="alert",
                        title="쇼핑 예약 병원 모두 언급",
                        reason="문구에는 여러 후보가 있지만 에이전트 선택은 병원입니다.",
                        action_href="/hospital",
                    ),
                ),
            ),
            (),
            (),
        )

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].action_href, "/hospital")

    def test_context_analysis_agent_uses_action_route_provider_decision(self) -> None:
        agent = ContextAnalysisAgent(
            pattern_analyzer=_StaticPatternAnalyzer(
                CareInsight(
                    severity="alert",
                    title="병원 예약 쇼핑 모두 언급",
                    reason="문구에는 여러 후보가 있지만 provider 결정만 따릅니다.",
                    source_record_ids=("record-medical",),
                )
            ),
            missing_record_policy=_StaticMissingRecordPolicy(),
            action_routing_agent=CareActionRoutingAgent(
                _StaticActionRouteDecisionProvider("/shopping")
            ),
        )

        result = agent.analyze(
            self.pet,
            (
                PetRecord(
                    id="record-medical",
                    pet_id=self.pet.id,
                    category="medical",
                    title="진료 후 구토 관찰",
                    detail="병원 상담이 필요해 보입니다.",
                    status="alert",
                    recorded_at="2026-05-15T09:00:00Z",
                    source="manual",
                ),
            ),
            (),
        )

        self.assertEqual(result.insights[0].action_href, "/shopping")

    def test_context_analysis_agent_keeps_schedule_decision_from_provider(self) -> None:
        agent = ContextAnalysisAgent(
            pattern_analyzer=_StaticPatternAnalyzer(
                CareInsight(
                    severity="notice",
                    title="예방접종 확인",
                    reason="provider가 예약을 스케줄로 판단했습니다.",
                )
            ),
            missing_record_policy=_StaticMissingRecordPolicy(),
            action_routing_agent=CareActionRoutingAgent(
                _StaticActionRouteDecisionProvider("/schedule")
            ),
        )

        result = agent.analyze(
            self.pet,
            (),
            (PlannedReminder(title="백신 접종", due_date="2026-05-20", reason="연간 예방접종"),),
        )

        self.assertEqual(result.insights[0].action_href, "/schedule")

    def test_context_analysis_agent_normalizes_invalid_provider_route_to_fallback(self) -> None:
        agent = ContextAnalysisAgent(
            pattern_analyzer=_StaticPatternAnalyzer(
                CareInsight(
                    severity="notice",
                    title="일반 관찰",
                    reason="지원하지 않는 provider 경로는 fallback으로 보정합니다.",
                )
            ),
            missing_record_policy=_StaticMissingRecordPolicy(),
            action_routing_agent=CareActionRoutingAgent(
                _StaticActionRouteDecisionProvider("https://example.com")
            ),
        )

        result = agent.analyze(self.pet, (), ())

        self.assertEqual(result.insights[0].action_href, "/timeline")

    def test_context_analysis_agent_falls_back_when_action_route_provider_fails(self) -> None:
        agent = ContextAnalysisAgent(
            pattern_analyzer=_StaticPatternAnalyzer(
                CareInsight(
                    severity="notice",
                    title="병원 상담 필요",
                    reason="라우팅 provider 실패는 분석 응답을 깨지 않아야 합니다.",
                )
            ),
            missing_record_policy=_StaticMissingRecordPolicy(),
            action_routing_agent=CareActionRoutingAgent(_FailingActionRouteDecisionProvider()),
        )

        result = agent.analyze(self.pet, (), ())

        self.assertEqual(result.insights[0].action_href, "/timeline")


class _StaticPatternAnalyzer:
    def __init__(self, *insights: CareInsight) -> None:
        self._insights = insights

    def analyze(self, pet: PetProfile, records: tuple[PetRecord, ...]) -> tuple[CareInsight, ...]:
        return self._insights


class _StaticMissingRecordPolicy:
    def detect_missing_records(self, pet: PetProfile, records: tuple[PetRecord, ...]) -> tuple[CareInsight, ...]:
        return ()


class _StaticActionRouteDecisionProvider:
    def __init__(self, *routes: str) -> None:
        self._routes = routes

    def decide_routes(
        self,
        *,
        pet: PetProfile,
        insights: tuple[CareInsight, ...],
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
        fallback: str,
    ) -> tuple[str | None, ...]:
        return self._routes


class _FailingActionRouteDecisionProvider:
    def decide_routes(
        self,
        *,
        pet: PetProfile,
        insights: tuple[CareInsight, ...],
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
        fallback: str,
    ) -> tuple[str | None, ...]:
        raise RuntimeError("action route provider unavailable")


if __name__ == "__main__":
    unittest.main()
