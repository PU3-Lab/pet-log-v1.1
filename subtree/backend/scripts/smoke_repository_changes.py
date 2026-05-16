from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

from application.dto import PetLogAgentResult
from domain.models import PetRecord, StructuredRecordCandidate
from infrastructure.database import connect
from infrastructure.repositories import PetLogAgentResultRepository, RecordRepository


PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0SM0K3"


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    load_dotenv(backend_root / ".env", override=False)

    print("[manual smoke] repository changes")
    print()
    smoke_in_memory_record_repository()
    print()
    smoke_sqlite_record_repository()
    print()
    smoke_agent_result_repository()


def smoke_in_memory_record_repository() -> None:
    repository = RecordRepository(
        records=(
            _record("record-old-memory", _days_ago(40)),
            _record("record-recent-memory", _days_ago(1)),
        )
    )
    recent_records = repository.list_recent(PET_ID, lookback_days=30)
    saved = repository.save_candidate(PET_ID, _candidate(), source="manual")

    print("[RecordRepository: in-memory]")
    print("expected recent ids:", ("record-recent-memory", saved.id))
    print("actual recent ids:  ", tuple(record.id for record in repository.list_recent(PET_ID, lookback_days=30)))
    print("saved recorded_at:  ", saved.recorded_at)
    print("saved timestamp set:", bool(saved.recorded_at))
    print("old record filtered:", tuple(record.id for record in recent_records) == ("record-recent-memory",))


def smoke_sqlite_record_repository() -> None:
    connection = connect(":memory:")
    try:
        connection.executemany(
            """
            INSERT INTO pet_records (id, pet_id, category, title, detail, status, recorded_at, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                (
                    "record-old-sqlite",
                    PET_ID,
                    "meal",
                    "Old meal",
                    "Ate last month",
                    "normal",
                    _days_ago(40),
                    "manual",
                ),
                (
                    "record-recent-sqlite",
                    PET_ID,
                    "meal",
                    "Recent meal",
                    "Ate today",
                    "normal",
                    _days_ago(1),
                    "manual",
                ),
            ),
        )
        connection.commit()

        repository = RecordRepository(connection=connection)
        recent_records = repository.list_recent(PET_ID, lookback_days=30)
        saved = repository.save_candidate(PET_ID, _candidate(), source="manual")

        print("[RecordRepository: sqlite]")
        print("expected recent ids:", ("record-recent-sqlite", saved.id))
        print("actual recent ids:  ", tuple(record.id for record in repository.list_recent(PET_ID, lookback_days=30)))
        print("saved recorded_at:  ", saved.recorded_at)
        print("saved timestamp set:", bool(saved.recorded_at))
        print("old record filtered:", tuple(record.id for record in recent_records) == ("record-recent-sqlite",))
    finally:
        connection.close()


def smoke_agent_result_repository() -> None:
    result = PetLogAgentResult(candidates=(_candidate(),))
    repository = PetLogAgentResultRepository(latest_results_by_pet_id={PET_ID: result})

    print("[PetLogAgentResultRepository]")
    print("latest result found:", repository.get_latest(PET_ID) == result)
    try:
        repository.get_latest("missing-pet")
    except KeyError:
        print("missing pet raises KeyError:", True)
    else:
        print("missing pet raises KeyError:", False)


def _record(record_id: str, recorded_at: str) -> PetRecord:
    return PetRecord(
        id=record_id,
        pet_id=PET_ID,
        category="meal",
        title="Meal",
        detail="Ate some food",
        status="normal",
        recorded_at=recorded_at,
        source="manual",
    )


def _candidate() -> StructuredRecordCandidate:
    return StructuredRecordCandidate(
        title="Manual smoke meal",
        detail="Ate breakfast",
        category="meal",
        status="normal",
        confidence=0.9,
        needs_confirmation=False,
    )


def _days_ago(days: int) -> str:
    value = datetime.now(UTC) - timedelta(days=days)
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    main()
