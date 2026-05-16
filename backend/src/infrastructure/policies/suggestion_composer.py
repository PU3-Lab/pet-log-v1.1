from __future__ import annotations

from application.action_navigation import normalize_action_href
from domain.models import CareInsight, CareSuggestion, PetProfile


class SuggestionComposer:
    def compose(self, pet: PetProfile, insights: tuple[CareInsight, ...]) -> tuple[CareSuggestion, ...]:
        return tuple(
            self._suggestion_from_insight(insight)
            for insight in insights
        )

    def _suggestion_from_insight(self, insight: CareInsight) -> CareSuggestion:
        action = "기록 확인하기" if insight.severity == "info" else "지금 확인하기"
        return CareSuggestion(
            title=insight.title,
            action=action,
            reason=insight.reason,
            severity=insight.severity,
            source_record_ids=insight.source_record_ids,
            action_href=normalize_action_href(insight.action_href, fallback="/timeline") or "/timeline",
        )
