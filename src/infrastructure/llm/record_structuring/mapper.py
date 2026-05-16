from __future__ import annotations

from pydantic import BaseModel

from application.dto import PetLogAgentInput
from domain.enums import RecordCategory, RecordInputSource, RecordStatus
from domain.models import PetProfile, StructuredRecordBatch, StructuredRecordCandidate


_CATEGORIES: tuple[RecordCategory, ...] = ("meal", "walk", "stool", "medical", "behavior")
_STATUSES: tuple[RecordStatus, ...] = ("normal", "notice", "alert")
_SOURCES: tuple[RecordInputSource, ...] = ("manual", "voice", "ai_preview", "quick_action")


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


def input_payload(input: PetLogAgentInput) -> dict[str, object]:
    return {
        "pet": pet_payload(input.pet),
        "text": input.text,
        "source": input.source,
        "confirm": input.confirm,
    }


def allowed_values_payload() -> dict[str, object]:
    return {
        "categories": list(_CATEGORIES),
        "statuses": list(_STATUSES),
        "sources": list(_SOURCES),
    }


def to_structured_record_batch(value: object) -> StructuredRecordBatch:
    if isinstance(value, dict):
        parsed = value
        candidates = parsed.get("candidates")
    elif hasattr(value, "candidates"):
        candidates = getattr(value, "candidates")
    elif isinstance(value, BaseModel):
        parsed = value.model_dump()
        candidates = parsed.get("candidates")
    else:
        raise RuntimeError("LangChain structured record output had an invalid shape.")

    if not isinstance(candidates, list):
        raise RuntimeError("LangChain structured record output had no candidates list.")

    return StructuredRecordBatch(
        candidates=tuple(to_structured_record_candidate(candidate) for candidate in candidates)
    )


def to_structured_record_candidate(value: object) -> StructuredRecordCandidate:
    if not isinstance(value, dict):
        if _has_candidate_attrs(value):
            value = {
                "title": getattr(value, "title"),
                "detail": getattr(value, "detail"),
                "category": getattr(value, "category"),
                "status": getattr(value, "status"),
                "confidence": getattr(value, "confidence"),
                "needs_confirmation": getattr(value, "needs_confirmation"),
                "measurements": getattr(value, "measurements"),
            }
        elif isinstance(value, BaseModel):
            value = value.model_dump()
        else:
            raise RuntimeError("LangChain structured record candidate output was not an object.")

    category = value.get("category")
    status = value.get("status")
    if category not in _CATEGORIES:
        raise RuntimeError("LangChain structured record candidate category was invalid.")
    if status not in _STATUSES:
        raise RuntimeError("LangChain structured record candidate status was invalid.")

    measurements = value.get("measurements", [])
    if not isinstance(measurements, list):
        raise RuntimeError("LangChain structured record candidate measurements were invalid.")

    return StructuredRecordCandidate(
        title=str(value["title"]),
        detail=str(value["detail"]),
        category=category,
        status=status,
        confidence=float(value["confidence"]),
        needs_confirmation=bool(value["needs_confirmation"]),
        measurements=tuple(str(item) for item in measurements),
    )


def _has_candidate_attrs(value: object) -> bool:
    return all(
        hasattr(value, field_name)
        for field_name in (
            "title",
            "detail",
            "category",
            "status",
            "confidence",
            "needs_confirmation",
            "measurements",
        )
    )
