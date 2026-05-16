from __future__ import annotations

import unittest

from agent_runtime.tool_registry import ToolRegistry
from domain.models import CareContext, PetProfile, PlannedReminder
from tools.care_tools import build_care_context_tool
from tools.schedule_tools import build_list_due_reminders_tool


class FakeScheduleRepository:
    def list_due_items(self, pet_id: str, days_ahead: int) -> tuple[PlannedReminder, ...]:
        return (
            PlannedReminder(
                title=f"{pet_id} checkup",
                due_date="2026-05-12",
                reason=f"within {days_ahead} days",
            ),
        )


class FakeCareContextBuilder:
    def build(self, pet_id: str, lookback_days: int) -> CareContext:
        return CareContext(
            pet=PetProfile(id=pet_id, name="Momo"),
            due_reminders=(
                PlannedReminder(
                    title="vaccination",
                    due_date="2026-05-13",
                    reason=f"lookback {lookback_days}",
                ),
            ),
        )


class TestToolFactories(unittest.TestCase):
    def test_schedule_tool_lists_due_reminders(self):
        tool = build_list_due_reminders_tool(FakeScheduleRepository())

        self.assertEqual("list_due_reminders", tool.name)
        self.assertEqual(
            (
                PlannedReminder(
                    title="pet-1 checkup",
                    due_date="2026-05-12",
                    reason="within 7 days",
                ),
            ),
            tool.invoke({"pet_id": "pet-1", "days_ahead": 7}),
        )

    def test_care_context_tool_builds_context(self):
        tool = build_care_context_tool(FakeCareContextBuilder())

        self.assertEqual("build_care_context", tool.name)
        result = tool.invoke({"pet_id": "pet-1", "lookback_days": 30})

        self.assertEqual("pet-1", result.pet.id)
        self.assertEqual("Momo", result.pet.name)
        self.assertEqual("lookback 30", result.due_reminders[0].reason)

    def test_tool_registry_returns_deterministic_tuple_and_rejects_duplicate_names(self):
        schedule_tool = build_list_due_reminders_tool(FakeScheduleRepository())
        care_tool = build_care_context_tool(FakeCareContextBuilder())

        registry = ToolRegistry((schedule_tool, care_tool))

        self.assertEqual((schedule_tool, care_tool), registry.list_tools())
        with self.assertRaises(ValueError):
            ToolRegistry((schedule_tool, schedule_tool))


if __name__ == "__main__":
    unittest.main()
