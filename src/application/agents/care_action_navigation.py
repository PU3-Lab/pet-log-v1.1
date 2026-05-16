from __future__ import annotations

import logging
from dataclasses import replace
from typing import Protocol

from application.action_navigation import normalize_action_href
from domain.models import CareInsight, ContextAnalysisResult, PetProfile, PetRecord, PlannedReminder

logger = logging.getLogger(__name__)


class ActionRouteDecisionProvider(Protocol):
    def decide_routes(
        self,
        *,
        pet: PetProfile,
        insights: tuple[CareInsight, ...],
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
        fallback: str,
    ) -> tuple[str | None, ...]:
        """Return one action href per insight in the same order."""


class CareActionRoutingAgent:
    def __init__(self, decision_provider: ActionRouteDecisionProvider | None = None) -> None:
        self._decision_provider = decision_provider

    def route(
        self,
        pet: PetProfile,
        context: ContextAnalysisResult,
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
    ) -> ContextAnalysisResult:
        return ContextAnalysisResult(
            insights=self._route_insights(
                pet=pet,
                insights=context.insights,
                records=records,
                due_items=due_items,
                fallback="/timeline",
            ),
            missing_record_insights=self._route_insights(
                pet=pet,
                insights=context.missing_record_insights,
                records=records,
                due_items=due_items,
                fallback="/record",
            ),
        )

    def _route_insights(
        self,
        *,
        pet: PetProfile,
        insights: tuple[CareInsight, ...],
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
        fallback: str,
    ) -> tuple[CareInsight, ...]:
        normalized = tuple(_normalize_existing_href(insight) for insight in insights)
        pending = tuple(insight for insight in normalized if insight.action_href is None)
        if not pending:
            return normalized

        routes = self._decide_routes(
            pet=pet,
            insights=pending,
            records=records,
            due_items=due_items,
            fallback=fallback,
        )
        routed_pending = iter(
            replace(
                insight,
                action_href=normalize_action_href(
                    routes[index] if index < len(routes) else None,
                    fallback=fallback,
                ),
            )
            for index, insight in enumerate(pending)
        )
        return tuple(next(routed_pending) if insight.action_href is None else insight for insight in normalized)

    def _decide_routes(
        self,
        *,
        pet: PetProfile,
        insights: tuple[CareInsight, ...],
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
        fallback: str,
    ) -> tuple[str | None, ...]:
        if self._decision_provider is None:
            return tuple(fallback for _ in insights)
        try:
            return self._decision_provider.decide_routes(
                pet=pet,
                insights=insights,
                records=records,
                due_items=due_items,
                fallback=fallback,
            )
        except Exception:
            logger.warning("Action route provider failed; falling back to %s", fallback, exc_info=True)
            return tuple(fallback for _ in insights)


def _normalize_existing_href(insight: CareInsight) -> CareInsight:
    action_href = normalize_action_href(insight.action_href, fallback=None)
    if action_href is None:
        return insight
    return replace(insight, action_href=action_href)
