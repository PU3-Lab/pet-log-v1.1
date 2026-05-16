from __future__ import annotations

from typing import Any

from langchain_core.tools import BaseTool, StructuredTool


def build_get_pet_profile_tool(profile_repository: Any) -> BaseTool:
    def get_pet_profile(pet_id: str) -> object:
        """Return a pet profile by pet ID."""
        return profile_repository.get_pet(pet_id)

    return StructuredTool.from_function(
        get_pet_profile,
        name="get_pet_profile",
        description="Return a pet profile by pet ID.",
    )
