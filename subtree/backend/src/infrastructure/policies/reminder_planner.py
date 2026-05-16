from __future__ import annotations

from domain.models import PetProfile, PetRecord, PlannedReminder


class ReminderPlanner:
    def plan(
        self,
        pet: PetProfile,
        records: tuple[PetRecord, ...],
        due_items: tuple[PlannedReminder, ...],
    ) -> tuple[PlannedReminder, ...]:
        return due_items
