from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from application.action_navigation import normalize_action_href
from application.dto import NotificationCandidate
from composition import AppContext
from domain.models import Notification
from presentation.http.schemas import success_response

_KIND_CATEGORY = {
    "risk": "주의",
    "behavior_change": "행동 변화",
    "missing_record": "기록",
    "schedule": "일정",
}

_KIND_TONE = {
    "risk": "red",
    "behavior_change": "orange",
    "missing_record": "orange",
    "schedule": "blue",
}

_KIND_ACTION = {
    "risk": "기록 확인",
    "behavior_change": "기록 확인",
    "missing_record": "기록 추가",
    "schedule": "일정 확인",
}

_KIND_HREF = {
    "risk": "/timeline",
    "behavior_change": "/timeline",
    "missing_record": "/record",
    "schedule": "/schedule",
}


class _MarkReadBody(BaseModel):
    readNotificationIds: list[str]


def build_notification_router() -> APIRouter:
    router = APIRouter()

    @router.get("/api/v1/notifications")
    def list_notifications(http_request: Request, pet_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.notification_repository is None:
            raise HTTPException(status_code=500, detail="Notification repository not configured")

        read_ids = set(app_context.notification_repository.get_read_ids(pet_id))
        candidates = _compute_candidates(app_context, pet_id)

        for c in candidates:
            if c.kind == "missing_record":
                app_context.notification_repository.upsert_from_candidate(
                    pet_id=pet_id,
                    candidate=c,
                    category=_KIND_CATEGORY[c.kind],
                    action=_KIND_ACTION[c.kind],
                    action_href=_candidate_action_href(c),
                    tone=_KIND_TONE[c.kind],
                )

        stored_notifications = app_context.notification_repository.list_for_pet(pet_id)
        notification_payloads = _merge_notification_payloads(
            tuple(_notification_to_frontend(n, read_ids) for n in stored_notifications),
            tuple(_candidate_to_frontend(c, read_ids) for c in candidates),
        )
        return success_response({
            "notifications": notification_payloads,
            "readNotificationIds": list(read_ids),
        })

    @router.patch("/api/v1/notifications/{notification_id}/read")
    def mark_notification_as_read(http_request: Request, notification_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.notification_repository is None:
            raise HTTPException(status_code=500, detail="Notification repository not configured")
        marked = app_context.notification_repository.mark_as_read(notification_id)
        if not marked:
            raise HTTPException(status_code=404, detail="Notification not found or already read")
        return success_response({"id": notification_id})

    @router.put("/api/v1/notifications/read")
    def update_read_notifications(
        http_request: Request,
        pet_id: str,
        body: _MarkReadBody,
    ) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.notification_repository is None:
            raise HTTPException(status_code=500, detail="Notification repository not configured")
        ids = tuple(body.readNotificationIds)
        app_context.notification_repository.set_read_ids(pet_id, ids)
        return success_response({"readNotificationIds": list(ids)})

    return router


def _app_context(request: Request) -> AppContext:
    return request.app.state.app_context


def _compute_candidates(app_context: AppContext, pet_id: str) -> tuple[NotificationCandidate, ...]:
    if app_context.context_analysis_agent is None or app_context.notification_policy is None:
        return ()
    if app_context.record_reader is None or app_context.schedule_reader is None:
        return ()

    try:
        pet = app_context.pet_profile_reader.get_pet(pet_id)
    except Exception:
        return ()

    records = app_context.record_reader.list_recent(pet_id, lookback_days=30)
    due_items = app_context.schedule_reader.list_due_items(pet_id, days_ahead=7)

    context = app_context.context_analysis_agent.analyze(pet, records, due_items)
    return app_context.notification_policy.plan(pet, context, safety_notices=(), due_items=due_items)


def _candidate_to_frontend(c: NotificationCandidate, read_ids: set[str]) -> dict[str, object]:
    return {
        "id": c.dedupe_key,
        "category": _KIND_CATEGORY[c.kind],
        "title": c.title,
        "detail": c.message,
        "action": _KIND_ACTION[c.kind],
        "actionHref": _candidate_action_href(c),
        "dueLabel": c.due_date or "",
        "tone": _KIND_TONE[c.kind],
        "createdAt": c.due_date or "",
        "isRead": c.dedupe_key in read_ids,
    }


def _notification_to_frontend(notification: Notification, read_ids: set[str]) -> dict[str, object]:
    notification_id = notification.dedupe_key or notification.id
    return {
        "id": notification_id,
        "category": notification.category,
        "title": notification.title,
        "detail": notification.detail,
        "action": notification.action,
        "actionHref": normalize_action_href(
            notification.action_href,
            fallback=_notification_fallback_href(notification),
        ),
        "dueLabel": notification.due_label,
        "tone": notification.tone,
        "createdAt": notification.created_at,
        "isRead": notification_id in read_ids or notification.read_at is not None,
    }


def _merge_notification_payloads(
    stored: tuple[dict[str, object], ...],
    computed: tuple[dict[str, object], ...],
) -> list[dict[str, object]]:
    merged: list[dict[str, object]] = []
    seen: set[object] = set()
    for notification in stored + computed:
        notification_id = notification["id"]
        if notification_id in seen:
            continue
        seen.add(notification_id)
        merged.append(notification)
    return sorted(merged, key=_notification_created_at_key, reverse=True)


def _candidate_action_href(candidate: NotificationCandidate) -> str:
    fallback_href = _KIND_HREF[candidate.kind]
    return normalize_action_href(candidate.action_href, fallback=fallback_href) or fallback_href


def _notification_fallback_href(notification: Notification) -> str:
    if notification.category == "일정":
        return "/schedule"
    if notification.category == "기록":
        return "/record"
    return "/timeline"


def _notification_created_at_key(notification: dict[str, object]) -> float:
    created_at = str(notification.get("createdAt", ""))
    if not created_at:
        return 0
    normalized = created_at.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return 0
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.timestamp()
