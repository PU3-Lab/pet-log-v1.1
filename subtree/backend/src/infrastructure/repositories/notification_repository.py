from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from uuid import uuid4

from application.dto import NotificationCandidate
from domain.models import Notification
from infrastructure.database import initialize_schema


class NotificationRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection
        initialize_schema(self._connection)

    def list_for_pet(self, pet_id: str, limit: int = 50) -> tuple[Notification, ...]:
        rows = self._connection.execute(
            """
            SELECT
                id AS id,
                pet_id AS pet_id,
                category AS category,
                title AS title,
                detail AS detail,
                action AS action,
                action_href AS action_href,
                due_label AS due_label,
                tone AS tone,
                read_at AS read_at,
                created_at AS created_at,
                dedupe_key AS dedupe_key
            FROM notifications
            WHERE pet_id = ? AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (pet_id, limit),
        ).fetchall()
        return tuple(_notification_from_row(row) for row in rows)

    def mark_as_read(self, notification_id: str) -> bool:
        cursor = self._connection.execute(
            "UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND read_at IS NULL",
            (notification_id,),
        )
        self._connection.commit()
        return cursor.rowcount > 0

    def mark_all_as_read(self, pet_id: str) -> int:
        cursor = self._connection.execute(
            "UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE pet_id = ? AND read_at IS NULL",
            (pet_id,),
        )
        self._connection.commit()
        return cursor.rowcount

    def get_read_ids(self, pet_id: str) -> tuple[str, ...]:
        rows = self._connection.execute(
            "SELECT notification_id FROM notification_read_ids WHERE pet_id = ?",
            (pet_id,),
        ).fetchall()
        return tuple(row[0] for row in rows)

    def set_read_ids(self, pet_id: str, ids: tuple[str, ...]) -> None:
        self._connection.execute(
            "DELETE FROM notification_read_ids WHERE pet_id = ?",
            (pet_id,),
        )
        for nid in ids:
            self._connection.execute(
                "INSERT INTO notification_read_ids (pet_id, notification_id) VALUES (?, ?)",
                (pet_id, nid),
            )
        self._connection.commit()

    def create(
        self,
        pet_id: str,
        category: str,
        title: str,
        detail: str,
        action: str,
        action_href: str,
        due_label: str,
        tone: str,
    ) -> Notification:
        notification_id = str(uuid4())
        created_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        self._connection.execute(
            """
            INSERT INTO notifications (id, pet_id, category, title, detail, action, action_href, due_label, tone, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (notification_id, pet_id, category, title, detail, action, action_href, due_label, tone, created_at),
        )
        self._connection.commit()
        return Notification(
            id=notification_id,
            pet_id=pet_id,
            category=category,
            title=title,
            detail=detail,
            action=action,
            action_href=action_href,
            due_label=due_label,
            tone=tone,
            created_at=created_at,
            dedupe_key=None,
        )


    def upsert_from_candidate(
        self,
        pet_id: str,
        candidate: NotificationCandidate,
        category: str,
        action: str,
        action_href: str,
        tone: str,
    ) -> Notification:
        existing = self.find_by_dedupe_key(candidate.dedupe_key)
        if existing:
            return existing

        notification_id = str(uuid4())
        created_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        self._connection.execute(
            """
            INSERT INTO notifications
                (id, pet_id, category, title, detail, action, action_href, due_label, tone, dedupe_key, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                notification_id, pet_id, category,
                candidate.title, candidate.message,
                action, action_href,
                candidate.due_date or "", tone,
                candidate.dedupe_key, created_at,
            ),
        )
        self._connection.commit()
        return Notification(
            id=notification_id,
            pet_id=pet_id,
            category=category,
            title=candidate.title,
            detail=candidate.message,
            action=action,
            action_href=action_href,
            due_label=candidate.due_date or "",
            tone=tone,
            created_at=created_at,
            dedupe_key=candidate.dedupe_key,
        )

    def find_by_dedupe_key(self, dedupe_key: str) -> Notification | None:
        row = self._connection.execute(
            """
            SELECT
                id AS id,
                pet_id AS pet_id,
                category AS category,
                title AS title,
                detail AS detail,
                action AS action,
                action_href AS action_href,
                due_label AS due_label,
                tone AS tone,
                read_at AS read_at,
                created_at AS created_at,
                dedupe_key AS dedupe_key
            FROM notifications
            WHERE dedupe_key = ? AND deleted_at IS NULL
            """,
            (dedupe_key,),
        ).fetchone()
        if row is None:
            return None
        return _notification_from_row(row)


def _notification_from_row(row: sqlite3.Row) -> Notification:
    return Notification(
        id=row["id"],
        pet_id=row["pet_id"],
        category=row["category"],
        title=row["title"],
        detail=row["detail"],
        action=row["action"],
        action_href=row["action_href"],
        due_label=row["due_label"],
        tone=row["tone"],
        read_at=row["read_at"],
        created_at=row["created_at"],
        dedupe_key=row["dedupe_key"],
    )
