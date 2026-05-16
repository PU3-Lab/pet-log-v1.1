from __future__ import annotations

import hashlib
from typing import Literal

from application.action_navigation import normalize_action_href
from application.dto import NotificationCandidate
from domain.models import ContextAnalysisResult, PetProfile, PlannedReminder, SafetyNotice

NotificationKind = Literal["risk", "behavior_change", "schedule", "missing_record"]


class NotificationPolicy:
    def plan(
        self,
        pet: PetProfile,
        context: ContextAnalysisResult,
        safety_notices: tuple[SafetyNotice, ...],
        due_items: tuple[PlannedReminder, ...],
    ) -> tuple[NotificationCandidate, ...]:
        candidates: list[NotificationCandidate] = []

        for insight in context.missing_record_insights:
            candidates.append(self._candidate(
                title=insight.title,
                message=insight.reason,
                kind="missing_record",
                dedupe_key=_key("missing_record", insight.title),
                source_record_ids=insight.source_record_ids,
                action_href=insight.action_href,
            ))

        for insight in context.insights:
            if insight.severity == "alert":
                candidates.append(self._candidate(
                    title=insight.title,
                    message=insight.reason,
                    kind="risk",
                    dedupe_key=_key("risk", insight.title),
                    source_record_ids=insight.source_record_ids,
                    action_href=insight.action_href,
                ))
            else:
                candidates.append(self._candidate(
                    title=insight.title,
                    message=insight.reason,
                    kind="behavior_change",
                    dedupe_key=_key("behavior_change", insight.title),
                    source_record_ids=insight.source_record_ids,
                    action_href=insight.action_href,
                ))

        for notice in safety_notices:
            candidates.append(self._candidate(
                title=f"{pet.name} 안전 알림",
                message=notice.message,
                kind="risk",
                dedupe_key=_key("safety", notice.message),
                safety_notice=notice,
            ))

        for item in due_items:
            candidates.append(self._candidate(
                title=item.title,
                message=item.reason,
                kind="schedule",
                dedupe_key=_key("schedule", item.title + item.due_date),
                due_date=item.due_date,
            ))

        return tuple(candidates)

    def _candidate(
        self,
        *,
        title: str,
        message: str,
        kind: NotificationKind,
        dedupe_key: str,
        source_record_ids: tuple[str, ...] = (),
        due_date: str | None = None,
        safety_notice: SafetyNotice | None = None,
        action_href: str | None = None,
    ) -> NotificationCandidate:
        fallback_href = _default_action_href(kind)
        return NotificationCandidate(
            title=title,
            message=message,
            kind=kind,
            dedupe_key=dedupe_key,
            source_record_ids=source_record_ids,
            due_date=due_date,
            safety_notice=safety_notice,
            action_href=normalize_action_href(action_href, fallback=fallback_href) or fallback_href,
        )


def _default_action_href(kind: NotificationKind) -> str:
    if kind == "schedule":
        return "/schedule"
    if kind == "missing_record":
        return "/record"
    return "/timeline"


def _key(prefix: str, content: str) -> str:
    digest = hashlib.sha256(content.encode()).hexdigest()[:12]
    return f"{prefix}:{digest}"
