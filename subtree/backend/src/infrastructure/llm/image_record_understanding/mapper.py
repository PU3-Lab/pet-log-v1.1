from __future__ import annotations

from pydantic import BaseModel

from domain.models import StructuredRecordCandidate


def to_structured_record_candidate(result: object) -> StructuredRecordCandidate:
    if isinstance(result, BaseModel):
        parsed = result.model_dump()
    elif isinstance(result, dict):
        parsed = result
    else:
        raise RuntimeError("Image understanding structured output had an invalid shape.")

    category = parsed.get("category")
    status = parsed.get("status")
    if category not in ("meal", "walk", "stool", "medical", "behavior"):
        raise RuntimeError("Image understanding output had an invalid category.")
    if status not in ("normal", "notice", "alert"):
        raise RuntimeError("Image understanding output had an invalid status.")

    return StructuredRecordCandidate(
        title=str(parsed["title"]),
        detail=str(parsed["detail"]),
        category=category,
        status=status,
        confidence=float(parsed["confidence"]),
        needs_confirmation=bool(parsed["needs_confirmation"]),
        measurements=tuple(str(item) for item in parsed.get("measurements", [])),
    )
