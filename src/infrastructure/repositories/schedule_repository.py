from __future__ import annotations

import sqlite3
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from domain.models import CareSchedule, PlannedReminder
from infrastructure.database import initialize_schema


class ScheduleRepository:
    def __init__(
        self,
        due_items_by_pet_id: dict[str, tuple[PlannedReminder, ...]] | None = None,
        connection: sqlite3.Connection | None = None,
    ) -> None:
        self._connection = connection
        if self._connection is not None:
            initialize_schema(self._connection)
        self._due_items_by_pet_id = due_items_by_pet_id or {}

    def list_due_items(self, pet_id: str, days_ahead: int) -> tuple[PlannedReminder, ...]:
        if self._connection is not None:
            max_due_date = (datetime.now(UTC).date() + timedelta(days=days_ahead)).isoformat()
            rows = self._connection.execute(
                """
                SELECT
                    title AS title,
                    due_date AS due_date,
                    note AS note,
                    repeat_label AS repeat_label
                FROM care_schedules
                WHERE pet_id = ?
                    AND deleted_at IS NULL
                    AND is_done = 0
                    AND due_date <= ?
                ORDER BY due_date, created_at
                """,
                (pet_id, max_due_date),
            ).fetchall()
            return tuple(
                PlannedReminder(
                    title=row["title"],
                    due_date=row["due_date"],
                    reason=row["note"] or row["repeat_label"],
                )
                for row in rows
            )

        return self._due_items_by_pet_id.get(pet_id, ())

    def list_for_pet(self, pet_id: str) -> tuple[CareSchedule, ...]:
        if self._connection is not None:
            rows = self._connection.execute(
                """
                SELECT
                    id AS id,
                    pet_id AS pet_id,
                    category AS category,
                    title AS title,
                    due_date AS due_date,
                    repeat_label AS repeat_label,
                    note AS note,
                    is_done AS is_done
                FROM care_schedules
                WHERE pet_id = ? AND deleted_at IS NULL
                ORDER BY due_date, created_at
                """,
                (pet_id,),
            ).fetchall()
            return tuple(
                CareSchedule(
                    id=row["id"],
                    pet_id=row["pet_id"],
                    category=row["category"],
                    title=row["title"],
                    due_date=row["due_date"],
                    repeat_label=row["repeat_label"],
                    note=row["note"],
                    is_done=bool(row["is_done"]),
                )
                for row in rows
            )

        return ()

    def create(
        self,
        pet_id: str,
        category: str,
        title: str,
        due_date: str,
        repeat_label: str = "한 번",
        note: str = "",
    ) -> CareSchedule:
        schedule_id = str(uuid4())
        if self._connection is not None:
            self._connection.execute(
                "INSERT INTO care_schedules (id, pet_id, category, title, due_date, repeat_label, note, is_done) "
                "VALUES (?,?,?,?,?,?,?,0)",
                (schedule_id, pet_id, category, title, due_date, repeat_label, note),
            )
            self._connection.commit()
        return CareSchedule(
            id=schedule_id, pet_id=pet_id, category=category, title=title,
            due_date=due_date, repeat_label=repeat_label, note=note, is_done=False,
        )

    def get_by_id(self, schedule_id: str) -> CareSchedule | None:
        if self._connection is not None:
            row = self._connection.execute(
                "SELECT id AS id, pet_id AS pet_id, category AS category, title AS title, due_date AS due_date, "
                "repeat_label AS repeat_label, note AS note, is_done AS is_done "
                "FROM care_schedules WHERE id=? AND deleted_at IS NULL",
                (schedule_id,),
            ).fetchone()
            if row is None:
                return None
            return CareSchedule(
                id=row["id"], pet_id=row["pet_id"], category=row["category"],
                title=row["title"], due_date=row["due_date"], repeat_label=row["repeat_label"],
                note=row["note"], is_done=bool(row["is_done"]),
            )
        return None

    def update(
        self,
        schedule_id: str,
        category: str | None = None,
        title: str | None = None,
        due_date: str | None = None,
        repeat_label: str | None = None,
        note: str | None = None,
        is_done: bool | None = None,
    ) -> CareSchedule | None:
        if self._connection is not None:
            fields: list[str] = []
            values: list[object] = []
            for col, val in [("category", category), ("title", title), ("due_date", due_date),
                             ("repeat_label", repeat_label), ("note", note)]:
                if val is not None:
                    fields.append(f"{col} = ?")
                    values.append(val)
            if is_done is not None:
                fields.append("is_done = ?")
                values.append(1 if is_done else 0)
            if not fields:
                return self.get_by_id(schedule_id)
            fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(schedule_id)
            self._connection.execute(
                f"UPDATE care_schedules SET {', '.join(fields)} WHERE id=? AND deleted_at IS NULL",
                values,
            )
            self._connection.commit()
            return self.get_by_id(schedule_id)
        return None

    def soft_delete(self, schedule_id: str) -> bool:
        if self._connection is not None:
            cursor = self._connection.execute(
                "UPDATE care_schedules SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL",
                (schedule_id,),
            )
            self._connection.commit()
            return cursor.rowcount > 0
        return False
