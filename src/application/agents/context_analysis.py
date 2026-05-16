from __future__ import annotations

from domain.models import ContextAnalysisResult, PetProfile, PetRecord, PlannedReminder


class ContextAnalysisAgent:
    def __init__(
        self,
        pattern_analyzer,
        missing_record_policy,
        action_routing_agent=None,
    ) -> None:
        self._pattern_analyzer = pattern_analyzer
        self._missing_record_policy = missing_record_policy
        self._action_routing_agent = action_routing_agent

    def analyze(
        self,
        pet: PetProfile,
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
    ) -> ContextAnalysisResult:
        insights = self._pattern_analyzer.analyze(pet, records)
        missing_record_insights = self._missing_record_policy.detect_missing_records(pet, records)
        context = ContextAnalysisResult(
            insights=insights,
            missing_record_insights=missing_record_insights,
        )
        if self._action_routing_agent is None:
            return context
        return self._action_routing_agent.route(pet, context, records, due_items)
