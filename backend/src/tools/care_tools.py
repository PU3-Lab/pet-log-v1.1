from __future__ import annotations

from typing import Any

from langchain_core.tools import BaseTool, StructuredTool


def build_care_context_tool(care_context_builder: Any) -> BaseTool:
    def build_care_context(pet_id: str, lookback_days: int = 14) -> object:
        """Build care context for a pet by pet ID."""
        return care_context_builder.build(pet_id, lookback_days)

    return StructuredTool.from_function(
        build_care_context,
        name="build_care_context",
        description="Build care context for a pet by pet ID.",
    )
