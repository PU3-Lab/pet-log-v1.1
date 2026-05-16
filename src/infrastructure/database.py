from __future__ import annotations

import os
import sqlite3
from datetime import date, datetime, time, timedelta
from pathlib import Path

DEFAULT_DATABASE_PATH = Path(
    os.environ.get(
        "PET_LOG_DATABASE_PATH",
        Path(__file__).resolve().parents[2] / "pet_log.sqlite3",
    )
)


def connect(database_path: str | Path | None = None) -> sqlite3.Connection:
    path = Path(database_path) if database_path is not None else DEFAULT_DATABASE_PATH
    should_seed = path != Path(":memory:") and not path.exists()
    if path != Path(":memory:"):
        path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    initialize_schema(connection)
    if should_seed or (
        path != Path(":memory:")
        and (
            _default_sample_pet_missing(connection)
            or _default_community_posts_missing(connection)
        )
    ):
        from infrastructure.seed_data import seed_default_data

        seed_default_data(connection)
    return connection


def initialize_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS pet_records (
            id TEXT PRIMARY KEY,
            pet_id TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            detail TEXT NOT NULL,
            status TEXT NOT NULL,
            recorded_at TEXT NOT NULL,
            source TEXT NOT NULL,
            batch_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_pet_records_pet_recorded_at
            ON pet_records (pet_id, recorded_at);

        CREATE TABLE IF NOT EXISTS pets (
            id TEXT PRIMARY KEY,
            owner_user_id TEXT,
            name TEXT NOT NULL,
            breed TEXT,
            species TEXT,
            age_label TEXT,
            sex_label TEXT,
            weight_label TEXT,
            birthday TEXT,
            personality TEXT,
            notes TEXT NOT NULL DEFAULT '[]',
            photo_file_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );

        CREATE TABLE IF NOT EXISTS care_schedules (
            id TEXT PRIMARY KEY,
            pet_id TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            due_date TEXT NOT NULL,
            repeat_label TEXT NOT NULL DEFAULT '',
            note TEXT NOT NULL DEFAULT '',
            is_done INTEGER NOT NULL DEFAULT 0,
            completed_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_care_schedules_pet_due_date
            ON care_schedules (pet_id, due_date);

        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            owner_user_id TEXT NOT NULL,
            pet_id TEXT,
            purpose TEXT NOT NULL,
            storage_key TEXT NOT NULL UNIQUE,
            mime_type TEXT NOT NULL,
            byte_size INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_files_pet_purpose_created_at
            ON files (pet_id, purpose, created_at);

        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            pet_id TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            detail TEXT NOT NULL,
            action TEXT NOT NULL,
            action_href TEXT NOT NULL,
            due_label TEXT NOT NULL,
            tone TEXT NOT NULL,
            read_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_pet_created_at
            ON notifications (pet_id, created_at);

        CREATE TABLE IF NOT EXISTS notification_read_ids (
            pet_id TEXT NOT NULL,
            notification_id TEXT NOT NULL,
            PRIMARY KEY (pet_id, notification_id)
        );

        CREATE TABLE IF NOT EXISTS community_posts (
            id TEXT PRIMARY KEY,
            board TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            author_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            likes INTEGER NOT NULL DEFAULT 0,
            distance TEXT,
            location_label TEXT,
            feeds TEXT NOT NULL DEFAULT '[]',
            tags TEXT NOT NULL DEFAULT '[]',
            deleted_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
            ON community_posts (created_at);

        CREATE INDEX IF NOT EXISTS idx_community_posts_board_created_at
            ON community_posts (board, created_at);

        CREATE TABLE IF NOT EXISTS community_comments (
            id TEXT PRIMARY KEY,
            post_id TEXT NOT NULL,
            author_name TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at TEXT NOT NULL,
            deleted_at TEXT,
            FOREIGN KEY (post_id) REFERENCES community_posts (id)
        );

        CREATE INDEX IF NOT EXISTS idx_community_comments_post_created_at
            ON community_comments (post_id, created_at);
        """
    )
    _ensure_pet_records_batch_id(connection)


def _ensure_pet_records_batch_id(connection: sqlite3.Connection) -> None:
    columns = {
        row["name"] if isinstance(row, sqlite3.Row) else row[1]
        for row in connection.execute("PRAGMA table_info(pet_records)").fetchall()
    }
    if "batch_id" not in columns:
        connection.execute("ALTER TABLE pet_records ADD COLUMN batch_id TEXT")
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_pet_records_pet_batch_id ON pet_records (pet_id, batch_id)"
    )
    _add_column_if_missing(connection, "pets", "photo_file_id", "TEXT")
    _add_column_if_missing(connection, "notifications", "dedupe_key", "TEXT")
    _add_column_if_missing(connection, "community_posts", "location_label", "TEXT")
    _backfill_community_location_labels(connection)
    _backfill_community_sample_created_at(connection)
    connection.commit()


def _add_column_if_missing(connection: sqlite3.Connection, table: str, column: str, column_definition: str) -> None:
    columns = {
        row["name"] if isinstance(row, sqlite3.Row) else row[1]
        for row in connection.execute(f"PRAGMA table_info({table})").fetchall()
    }
    if column not in columns:
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_definition}")


def _backfill_community_location_labels(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        UPDATE community_posts
        SET location_label = ?, distance = NULL
        WHERE id = ? AND location_label IS NULL AND distance = ?
        """,
        ("동네 직거래 가능", "c2", "1.2km"),
    )
    connection.execute(
        """
        UPDATE community_posts
        SET location_label = ?, distance = NULL
        WHERE id = ? AND location_label IS NULL AND distance = ?
        """,
        ("동네 보호소 공지", "c5", "2.4km"),
    )


def _backfill_community_sample_created_at(connection: sqlite3.Connection) -> None:
    base_date = date.today()
    legacy_post_times = {
        "c1": ("오늘 09:20", _at(base_date, time(9, 20))),
        "c2": ("어제 18:10", _at(base_date - timedelta(days=1), time(18, 10))),
        "c3": ("어제 12:40", _at(base_date - timedelta(days=1), time(12, 40))),
        "c4": ("오늘 07:50", _at(base_date, time(7, 50))),
        "c5": ("오늘 06:30", _at(base_date, time(6, 30))),
    }
    for post_id, (legacy_label, created_at) in legacy_post_times.items():
        connection.execute(
            """
            UPDATE community_posts
            SET created_at = ?
            WHERE id = ? AND created_at = ?
            """,
            (created_at, post_id, legacy_label),
        )

    legacy_comment_times = {
        "comment-c1-1": ("오늘 09:42", _at(base_date, time(9, 42))),
        "comment-c1-2": ("오늘 10:05", _at(base_date, time(10, 5))),
        "comment-c4-1": ("오늘 08:10", _at(base_date, time(8, 10))),
    }
    for comment_id, (legacy_label, created_at) in legacy_comment_times.items():
        connection.execute(
            """
            UPDATE community_comments
            SET created_at = ?
            WHERE id = ? AND created_at = ?
            """,
            (created_at, comment_id, legacy_label),
        )


def _at(day: date, value: time) -> str:
    return datetime.combine(day, value).isoformat()


def _default_sample_pet_missing(connection: sqlite3.Connection) -> bool:
    from infrastructure.seed_data import SAMPLE_PET_ID

    row = connection.execute(
        "SELECT 1 FROM pets WHERE id = ? AND deleted_at IS NULL",
        (SAMPLE_PET_ID,),
    ).fetchone()
    return row is None


def _default_community_posts_missing(connection: sqlite3.Connection) -> bool:
    row = connection.execute(
        "SELECT 1 FROM community_posts WHERE id = 'c1' AND deleted_at IS NULL",
    ).fetchone()
    return row is None
