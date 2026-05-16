from __future__ import annotations

from application.dto import HospitalSummaryResult
from infrastructure.repositories import PetProfileRepository, RecordRepository


class HospitalSummaryPipeline:
    def __init__(
        self,
        pet_profile_reader: PetProfileRepository,
        record_history_reader: RecordRepository,
        report_composer,
    ) -> None:
        self._pet_profile_reader = pet_profile_reader
        self._record_history_reader = record_history_reader
        self._report_composer = report_composer

    def summarize(self, pet_id: str, record_ids: tuple[str, ...]) -> HospitalSummaryResult:
        pet = self._pet_profile_reader.get_pet(pet_id)
        records = self._record_history_reader.list_by_ids(pet_id, record_ids)
        return self._report_composer.compose(pet, records)
