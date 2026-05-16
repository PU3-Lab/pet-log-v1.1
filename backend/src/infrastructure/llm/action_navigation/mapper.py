from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from domain.models import CareInsight, PetProfile, PetRecord, PlannedReminder
from domain.record_labels import record_category_label, record_status_label


def pet_payload(pet: PetProfile) -> dict[str, object]:
    return {
        "id": pet.id,
        "name": pet.name,
        "breed": pet.breed,
        "species": pet.species,
        "age_label": pet.age_label,
        "personality": pet.personality,
        "notes": list(pet.notes),
    }


def insight_payload(index: int, insight: CareInsight) -> dict[str, object]:
    return {
        "index": index,
        "severity": insight.severity,
        "title": insight.title,
        "reason": insight.reason,
        "source_record_ids": list(insight.source_record_ids),
    }


def record_payload(record: PetRecord) -> dict[str, object]:
    return {
        "id": record.id,
        "category": record.category,
        "category_label": record_category_label(record.category),
        "title": record.title,
        "detail": record.detail,
        "status": record.status,
        "status_label": record_status_label(record.status),
        "recorded_at": record.recorded_at,
        "source": record.source,
    }


def due_item_payload(item: PlannedReminder) -> dict[str, object]:
    return {
        "title": item.title,
        "due_date": item.due_date,
        "reason": item.reason,
    }


def to_action_routes(value: object, *, count: int) -> tuple[str | None, ...]:
    parsed = _to_dict(value)
    routes: list[str | None] = [None] * count
    decisions = parsed.get("decisions")
    if not isinstance(decisions, list):
        raise RuntimeError("LangChain action navigation output had an invalid shape.")

    for decision in decisions:
        decision_dict = _to_dict(decision)
        index = decision_dict.get("index")
        action_href = decision_dict.get("action_href")
        if isinstance(index, int) and 0 <= index < count and isinstance(action_href, str):
            routes[index] = action_href
    return tuple(routes)


def _to_dict(value: object) -> dict[str, Any]:
    if isinstance(value, BaseModel):
        return value.model_dump()
    if isinstance(value, dict):
        return value
    raise RuntimeError("LangChain structured output had an invalid shape.")
