from __future__ import annotations

from typing import Any

from langchain_core.tools import BaseTool, StructuredTool


def build_list_due_reminders_tool(schedule_repository: Any) -> BaseTool:
    def list_due_reminders(pet_id: str, days_ahead: int = 14) -> object:
        """Return upcoming care reminders by pet ID."""
        return schedule_repository.list_due_items(pet_id, days_ahead)

    return StructuredTool.from_function(
        list_due_reminders,
        name="list_due_reminders",
        description="Return upcoming care reminders by pet ID.",
    )
