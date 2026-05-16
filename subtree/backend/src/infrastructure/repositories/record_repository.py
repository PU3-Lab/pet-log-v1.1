from __future__ import annotations

import sqlite3
from datetime import UTC, datetime, timedelta
from typing import cast
from uuid import uuid4

from domain.enums import RecordCategory, RecordInputSource, RecordStatus
from domain.models import PetRecord, StructuredRecordCandidate
from infrastructure.database import initialize_schema


class RecordRepository:
    def __init__(self, records: tuple[PetRecord, ...] = (), connection: sqlite3.Connection | None = None) -> None:
        self._connection = connection
        if self._connection is not None:
            initialize_schema(self._connection)
        self._records = list(records)

    def list_recent(self, pet_id: str, lookback_days: int) -> tuple[PetRecord, ...]:
        min_recorded_at = _utc_days_ago(lookback_days)
        if self._connection is not None:
            rows = self._connection.execute(
                """
                SELECT
                    id AS id,
                    pet_id AS pet_id,
                    category AS category,
                    title AS title,
                    detail AS detail,
                    status AS status,
                    recorded_at AS recorded_at,
                    source AS source,
                    batch_id AS batch_id
                FROM pet_records
                WHERE pet_id = ? AND deleted_at IS NULL AND recorded_at >= ?
                ORDER BY recorded_at, created_at
                """,
                (pet_id, min_recorded_at),
            ).fetchall()
            return tuple(_record_from_row(row) for row in rows)

        return tuple(
            record
            for record in self._records
            if record.pet_id == pet_id and record.recorded_at >= min_recorded_at
        )

    def list_by_ids(self, pet_id: str, record_ids: tuple[str, ...]) -> tuple[PetRecord, ...]:
        if self._connection is not None:
            if not record_ids:
                return ()

            placeholders = ", ".join("?" for _ in record_ids)
            rows = self._connection.execute(
                f"""
                SELECT
                    id AS id,
                    pet_id AS pet_id,
                    category AS category,
                    title AS title,
                    detail AS detail,
                    status AS status,
                    recorded_at AS recorded_at,
                    source AS source,
                    batch_id AS batch_id
                FROM pet_records
                WHERE pet_id = ? AND deleted_at IS NULL AND id IN ({placeholders})
                """,
                (pet_id, *record_ids),
            ).fetchall()
            records_by_id = {row["id"]: _record_from_row(row) for row in rows}
            return tuple(records_by_id[record_id] for record_id in record_ids if record_id in records_by_id)

        records_by_id = {record.id: record for record in self._records if record.pet_id == pet_id}
        return tuple(records_by_id[record_id] for record_id in record_ids if record_id in records_by_id)

    def save_candidate(
        self,
        pet_id: str,
        candidate: StructuredRecordCandidate,
        source: RecordInputSource = "ai_preview",
        batch_id: str | None = None,
    ) -> PetRecord:
        if self._connection is not None:
            record = PetRecord(
                id=str(uuid4()),
                pet_id=pet_id,
                category=candidate.category,
                title=candidate.title,
                detail=candidate.detail,
                status=candidate.status,
                recorded_at=_utc_now(),
                source=source,
                batch_id=batch_id,
            )
            self._connection.execute(
                """
                INSERT INTO pet_records (id, pet_id, category, title, detail, status, recorded_at, source, batch_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.pet_id,
                    record.category,
                    record.title,
                    record.detail,
                    record.status,
                    record.recorded_at,
                    record.source,
                    record.batch_id,
                ),
            )
            self._connection.commit()
            return record

        record = PetRecord(
            id=f"record-{len(self._records) + 1}",
            pet_id=pet_id,
            category=candidate.category,
            title=candidate.title,
            detail=candidate.detail,
            status=candidate.status,
            recorded_at=_utc_now(),
            source=source,
            batch_id=batch_id,
        )
        self._records.append(record)
        return record


    def get_by_id(self, record_id: str) -> PetRecord | None:
        if self._connection is not None:
            row = self._connection.execute(
                "SELECT id AS id, pet_id AS pet_id, category AS category, title AS title, detail AS detail, "
                "status AS status, recorded_at AS recorded_at, source AS source, batch_id AS batch_id "
                "FROM pet_records WHERE id = ? AND deleted_at IS NULL",
                (record_id,),
            ).fetchone()
            return _record_from_row(row) if row else None
        return next((r for r in self._records if r.id == record_id), None)

    def update(self, record_id: str, category: str, title: str, detail: str, status: str) -> PetRecord | None:
        if self._connection is not None:
            self._connection.execute(
                "UPDATE pet_records SET category=?, title=?, detail=?, status=?, updated_at=CURRENT_TIMESTAMP "
                "WHERE id=? AND deleted_at IS NULL",
                (category, title, detail, status, record_id),
            )
            self._connection.commit()
            return self.get_by_id(record_id)
        idx = next((i for i, r in enumerate(self._records) if r.id == record_id), None)
        if idx is None:
            return None
        old = self._records[idx]
        updated = PetRecord(
            id=old.id, pet_id=old.pet_id,
            category=cast("RecordCategory", category), title=title,
            detail=detail, status=cast("RecordStatus", status),
            recorded_at=old.recorded_at, source=old.source, batch_id=old.batch_id,
        )
        self._records[idx] = updated
        return updated

    def soft_delete(self, record_id: str) -> bool:
        if self._connection is not None:
            cursor = self._connection.execute(
                "UPDATE pet_records SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL",
                (record_id,),
            )
            self._connection.commit()
            return cursor.rowcount > 0
        idx = next((i for i, r in enumerate(self._records) if r.id == record_id), None)
        if idx is None:
            return False
        self._records.pop(idx)
        return True


def _record_from_row(row: sqlite3.Row) -> PetRecord:
    return PetRecord(
        id=row["id"],
        pet_id=row["pet_id"],
        category=row["category"],
        title=row["title"],
        detail=row["detail"],
        status=row["status"],
        recorded_at=row["recorded_at"],
        source=row["source"],
        batch_id=row["batch_id"],
    )


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _utc_days_ago(days: int) -> str:
    value = datetime.now(UTC) - timedelta(days=days)
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")
