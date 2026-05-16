from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from uuid import uuid4

from domain.enums import FilePurpose
from domain.models import StoredFile
from infrastructure.database import initialize_schema

DEFAULT_UPLOAD_ROOT = Path(
    os.environ.get(
        "PET_LOG_UPLOAD_ROOT",
        Path(__file__).resolve().parents[3] / "uploads",
    )
)


class FileRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection
        initialize_schema(self._connection)

    def save_metadata(
        self,
        *,
        owner_user_id: str,
        pet_id: str | None,
        purpose: FilePurpose,
        storage_key: str,
        mime_type: str,
        byte_size: int,
        file_id: str | None = None,
    ) -> StoredFile:
        stored_file = StoredFile(
            id=file_id or str(uuid4()),
            owner_user_id=owner_user_id,
            pet_id=pet_id,
            purpose=purpose,
            storage_key=storage_key,
            mime_type=mime_type,
            byte_size=byte_size,
        )
        self._connection.execute(
            """
            INSERT INTO files (id, owner_user_id, pet_id, purpose, storage_key, mime_type, byte_size)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                stored_file.id,
                stored_file.owner_user_id,
                stored_file.pet_id,
                stored_file.purpose,
                stored_file.storage_key,
                stored_file.mime_type,
                stored_file.byte_size,
            ),
        )
        self._connection.commit()
        return self.get_file(stored_file.id)

    def get_file(self, file_id: str) -> StoredFile:
        row = self._connection.execute(
            """
            SELECT
                id AS id,
                owner_user_id AS owner_user_id,
                pet_id AS pet_id,
                purpose AS purpose,
                storage_key AS storage_key,
                mime_type AS mime_type,
                byte_size AS byte_size,
                created_at AS created_at
            FROM files
            WHERE id = ? AND deleted_at IS NULL
            """,
            (file_id,),
        ).fetchone()
        if row is None:
            raise KeyError(file_id)
        return _file_from_row(row)

    def delete_metadata(self, file_id: str) -> bool:
        cursor = self._connection.execute(
            "UPDATE files SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
            (file_id,),
        )
        self._connection.commit()
        return cursor.rowcount > 0


class LocalFileStorage:
    def __init__(self, root_path: str | Path = DEFAULT_UPLOAD_ROOT) -> None:
        self._root_path = Path(root_path).resolve()

    def write(self, storage_key: str, content: bytes) -> Path:
        target_path = self._resolve_storage_key(storage_key)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content)
        return target_path

    def path_for(self, storage_key: str) -> Path:
        return self._resolve_storage_key(storage_key)

    def delete(self, storage_key: str) -> bool:
        target_path = self._resolve_storage_key(storage_key)
        if target_path.exists():
            target_path.unlink()
            return True
        return False

    def _resolve_storage_key(self, storage_key: str) -> Path:
        target_path = (self._root_path / storage_key).resolve()
        if not target_path.is_relative_to(self._root_path):
            raise ValueError("storage_key must stay under upload root")
        return target_path


def _file_from_row(row: sqlite3.Row) -> StoredFile:
    return StoredFile(
        id=row["id"],
        owner_user_id=row["owner_user_id"],
        pet_id=row["pet_id"],
        purpose=row["purpose"],
        storage_key=row["storage_key"],
        mime_type=row["mime_type"],
        byte_size=row["byte_size"],
        created_at=row["created_at"],
    )
