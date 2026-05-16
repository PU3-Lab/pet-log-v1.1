from __future__ import annotations

from typing import Any

from langchain_core.tools import BaseTool, StructuredTool

from domain.models import StructuredRecordCandidate


def build_list_recent_records_tool(record_repository: Any) -> BaseTool:
    def list_recent_records(pet_id: str, lookback_days: int = 14) -> object:
        """Return recent pet records by pet ID."""
        return record_repository.list_recent(pet_id, lookback_days)

    return StructuredTool.from_function(
        list_recent_records,
        name="list_recent_records",
        description="Return recent pet records by pet ID.",
    )


def build_save_pet_record_tool(record_repository: Any) -> BaseTool:
    def save_pet_record(
        pet_id: str,
        title: str,
        detail: str,
        category: str,
        status: str = "normal",
        confidence: float = 1.0,
        needs_confirmation: bool = False,
    ) -> object:
        """Save one structured pet record."""
        candidate = StructuredRecordCandidate(
            title=title,
            detail=detail,
            category=category,
            status=status,
            confidence=confidence,
            needs_confirmation=needs_confirmation,
        )
        return record_repository.save_candidate(pet_id, candidate)

    return StructuredTool.from_function(
        save_pet_record,
        name="save_pet_record",
        description="Save one structured pet record.",
    )
