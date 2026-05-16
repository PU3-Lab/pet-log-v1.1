from __future__ import annotations

from application.dto import HomeFeedResult
from infrastructure.repositories import PetProfileRepository, ScheduleRepository


class HomeFeedPipeline:
    def __init__(
        self,
        pet_profile_reader: PetProfileRepository,
        agent_result_reader,
        schedule_context_reader: ScheduleRepository,
        home_feed_composer,
        days_ahead: int = 14,
    ) -> None:
        self._pet_profile_reader = pet_profile_reader
        self._agent_result_reader = agent_result_reader
        self._schedule_context_reader = schedule_context_reader
        self._home_feed_composer = home_feed_composer
        self._days_ahead = days_ahead

    def build(self, pet_id: str) -> HomeFeedResult:
        pet = self._pet_profile_reader.get_pet(pet_id)
        agent_result = self._agent_result_reader.get_latest(pet_id)
        due_items = self._schedule_context_reader.list_due_items(pet_id, self._days_ahead)
        return self._home_feed_composer.compose(pet, agent_result, due_items)
