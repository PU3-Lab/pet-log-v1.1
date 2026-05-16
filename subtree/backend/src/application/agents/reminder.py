from __future__ import annotations

from domain.models import PetProfile, PetRecord, PlannedReminder


class ReminderAgent:
    def __init__(self, reminder_planner) -> None:
        self._reminder_planner = reminder_planner

    def plan(
        self,
        pet: PetProfile,
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
    ) -> tuple[PlannedReminder, ...]:
        return self._reminder_planner.plan(pet, records, due_items)
