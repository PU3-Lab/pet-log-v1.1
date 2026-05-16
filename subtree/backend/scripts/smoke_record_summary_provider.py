from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

from application.dto import RecordSummaryResult
from domain.models import ContextAnalysisResult, PetProfile, PetRecord, PlannedReminder
from infrastructure.database import connect
from infrastructure.llm.record_summary import RecordSummaryProvider
from infrastructure.repositories import PetProfileRepository, RecordRepository, ScheduleRepository
from infrastructure.seed_data import SAMPLE_PET_ID, seed_default_data


@dataclass(frozen=True)
class RecordSummarySmokeFixture:
    provider: RecordSummaryProvider
    pet: PetProfile
    records: tuple[PetRecord, ...]
    context: ContextAnalysisResult
    due_items: tuple[PlannedReminder, ...]

    def summarize(self) -> RecordSummaryResult:
        return self.provider.summarize(
            pet=self.pet,
            records=self.records,
            context=self.context,
            due_items=self.due_items,
        )


def build_record_summary_smoke_fixture(
    database_path: str | None = ":memory:",
    *,
    seed_today: date = date(2026, 5, 8),
    pet_id: str = SAMPLE_PET_ID,
    lookback_days: int = 30,
    days_ahead: int = 14,
) -> RecordSummarySmokeFixture:
    connection = connect(database_path)
    try:
        seed_default_data(connection, today=seed_today)
        pet_repository = PetProfileRepository(connection=connection)
        record_repository = RecordRepository(connection=connection)
        schedule_repository = ScheduleRepository(connection=connection)

        return RecordSummarySmokeFixture(
            provider=RecordSummaryProvider(),
            pet=pet_repository.get_pet(pet_id),
            records=record_repository.list_recent(pet_id, lookback_days=lookback_days),
            context=ContextAnalysisResult(),
            due_items=schedule_repository.list_due_items(pet_id, days_ahead=days_ahead),
        )
    finally:
        connection.close()


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    load_dotenv(backend_root / ".env", override=False)

    fixture = build_record_summary_smoke_fixture()
    result = fixture.summarize()

    print("pet:", fixture.pet)
    print("records:", fixture.records)
    print("due_items:", fixture.due_items)
    print("summary:", result.summary)
    print("record_ids:", result.record_ids)
    print("highlights:", result.highlights)
    print("behavior_patterns:", result.behavior_patterns)
    print("missing_record_notes:", result.missing_record_notes)
    print("safety_notice:", result.safety_notice)


if __name__ == "__main__":
    main()
