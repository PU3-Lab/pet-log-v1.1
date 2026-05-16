from __future__ import annotations

from domain.models import CareContext
from infrastructure.repositories import PetProfileRepository, RecordRepository, ScheduleRepository


class CareContextBuilder:
    def __init__(
        self,
        pet_profile_reader: PetProfileRepository,
        record_history_reader: RecordRepository,
        schedule_context_reader: ScheduleRepository,
        days_ahead: int = 14,
    ) -> None:
        self._pet_profile_reader = pet_profile_reader
        self._record_history_reader = record_history_reader
        self._schedule_context_reader = schedule_context_reader
        self._days_ahead = days_ahead

    def build(self, pet_id: str, lookback_days: int) -> CareContext:
        pet = self._pet_profile_reader.get_pet(pet_id)
        recent_records = self._record_history_reader.list_recent(pet_id, lookback_days)
        due_reminders = self._schedule_context_reader.list_due_items(pet_id, self._days_ahead)
        return CareContext(
            pet=pet,
            recent_records=recent_records,
            due_reminders=due_reminders,
        )
