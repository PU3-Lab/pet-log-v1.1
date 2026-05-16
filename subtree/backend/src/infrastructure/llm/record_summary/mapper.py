from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from application.dto import RecordSummaryResult
from domain.models import ContextAnalysisResult, PetProfile, PetRecord, PlannedReminder, SafetyNotice
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


def record_payload(record: PetRecord) -> dict[str, object]:
    return {
        "id": record.id,
        "pet_id": record.pet_id,
        "category": record.category,
        "category_label": record_category_label(record.category),
        "title": record.title,
        "detail": record.detail,
        "status": record.status,
        "status_label": record_status_label(record.status),
        "recorded_at": record.recorded_at,
        "source": record.source,
    }


def context_payload(context: ContextAnalysisResult) -> dict[str, object]:
    return {
        "insights": [insight_payload(insight) for insight in context.insights],
        "missing_record_insights": [
            insight_payload(insight) for insight in context.missing_record_insights
        ],
    }


def insight_payload(insight: Any) -> dict[str, object]:
    return {
        "severity": insight.severity,
        "title": insight.title,
        "reason": insight.reason,
        "source_record_ids": list(insight.source_record_ids),
    }


def due_item_payload(item: PlannedReminder) -> dict[str, object]:
    return {
        "title": item.title,
        "due_date": item.due_date,
        "reason": item.reason,
    }


def to_record_summary_result(value: object) -> RecordSummaryResult:
    if isinstance(value, BaseModel):
        parsed = value.model_dump()
    elif isinstance(value, dict):
        parsed = value
    else:
        raise RuntimeError("LangChain structured output had an invalid shape.")

    safety_notice = parsed.get("safety_notice")
    return RecordSummaryResult(
        summary=str(parsed["summary"]),
        record_ids=tuple(str(item) for item in parsed["record_ids"]),
        highlights=tuple(str(item) for item in parsed["highlights"]),
        behavior_patterns=tuple(str(item) for item in parsed["behavior_patterns"]),
        missing_record_notes=tuple(str(item) for item in parsed["missing_record_notes"]),
        safety_notice=to_safety_notice(safety_notice),
    )


def to_safety_notice(value: object) -> SafetyNotice | None:
    if value is None:
        return None
    if isinstance(value, BaseModel):
        value = value.model_dump()
    if not isinstance(value, dict):
        raise RuntimeError("LangChain safety_notice output was not an object.")
    level = value.get("level")
    message = value.get("message")
    if level not in ("info", "notice", "alert") or not isinstance(message, str):
        raise RuntimeError("LangChain safety_notice output had an invalid shape.")
    return SafetyNotice(level=level, message=message)
