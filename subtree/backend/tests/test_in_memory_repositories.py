import unittest
from datetime import UTC, datetime, timedelta

from application.dto import PetLogAgentResult
from domain.models import PetProfile, PetRecord, PlannedReminder, StructuredRecordCandidate
from infrastructure.repositories import (
    PetLogAgentResultRepository,
    PetProfileRepository,
    RecordRepository,
    ScheduleRepository,
)


class TestInMemoryRepositories(unittest.TestCase):
    def test_pet_profile_repository_returns_pet_by_id(self):
        pet = PetProfile(id="pet-1", name="초코", species="dog")
        repository = PetProfileRepository(pets=(pet,))

        self.assertEqual(repository.get_pet("pet-1"), pet)

    def test_record_repository_lists_filters_and_saves_records(self):
        existing = PetRecord(
            id="record-1",
            pet_id="pet-1",
            category="meal",
            title="아침 식사",
            detail="조금 먹음",
            status="notice",
            recorded_at="2026-05-06T08:00:00",
            source="manual",
        )
        repository = RecordRepository(records=(existing,))
        candidate = StructuredRecordCandidate(
            title="산책",
            detail="저녁 산책",
            category="walk",
            status="normal",
            confidence=0.9,
            needs_confirmation=False,
        )

        saved = repository.save_candidate("pet-1", candidate)

        self.assertEqual(saved.id, "record-2")
        self.assertEqual(saved.pet_id, "pet-1")
        self.assertEqual(saved.title, "산책")
        self.assertEqual(repository.list_recent("pet-1", lookback_days=30), (existing, saved))
        self.assertEqual(repository.list_by_ids("pet-1", ("record-2", "record-1")), (saved, existing))
        self.assertEqual(repository.list_recent("pet-2", lookback_days=30), ())

    def test_record_repository_filters_recent_records_by_lookback_days(self):
        recent = PetRecord(
            id="record-recent",
            pet_id="pet-1",
            category="meal",
            title="Recent meal",
            detail="Ate today",
            status="normal",
            recorded_at=_days_ago(1),
            source="manual",
        )
        old = PetRecord(
            id="record-old",
            pet_id="pet-1",
            category="meal",
            title="Old meal",
            detail="Ate last month",
            status="normal",
            recorded_at=_days_ago(40),
            source="manual",
        )
        repository = RecordRepository(records=(old, recent))

        self.assertEqual(repository.list_recent("pet-1", lookback_days=30), (recent,))

    def test_schedule_repository_returns_due_items_by_pet_id(self):
        due = PlannedReminder(title="예방접종", due_date="2026-06-01", reason="정기 접종")
        repository = ScheduleRepository(due_items_by_pet_id={"pet-1": (due,)})

        self.assertEqual(repository.list_due_items("pet-1", days_ahead=14), (due,))
        self.assertEqual(repository.list_due_items("pet-2", days_ahead=14), ())

    def test_agent_result_repository_returns_latest_result_by_pet_id(self):
        candidate = StructuredRecordCandidate(
            title="Meal",
            detail="Ate breakfast",
            category="meal",
            status="normal",
            confidence=0.9,
            needs_confirmation=False,
        )
        result = PetLogAgentResult(candidates=(candidate,))
        repository = PetLogAgentResultRepository(latest_results_by_pet_id={"pet-1": result})

        self.assertEqual(repository.get_latest("pet-1"), result)

    def test_agent_result_repository_raises_for_missing_pet_id(self):
        repository = PetLogAgentResultRepository()

        with self.assertRaises(KeyError):
            repository.get_latest("missing-pet")


def _days_ago(days: int) -> str:
    value = datetime.now(UTC) - timedelta(days=days)
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")
