from __future__ import annotations

import json
import sqlite3
from dataclasses import replace
from uuid import uuid4

from domain.models import PetProfile
from infrastructure.database import initialize_schema


class PetProfileRepository:
    def __init__(self, pets: tuple[PetProfile, ...] = (), connection: sqlite3.Connection | None = None) -> None:
        self._connection = connection
        if self._connection is not None:
            initialize_schema(self._connection)
        self._pets_by_id = {pet.id: pet for pet in pets}

    def get_pet(self, pet_id: str) -> PetProfile:
        if self._connection is not None:
            row = self._connection.execute(
                """
                SELECT
                    id AS id,
                    name AS name,
                    breed AS breed,
                    species AS species,
                    age_label AS age_label,
                    sex_label AS sex_label,
                    weight_label AS weight_label,
                    birthday AS birthday,
                    personality AS personality,
                    notes AS notes,
                    photo_file_id AS photo_file_id
                FROM pets
                WHERE id = ? AND deleted_at IS NULL
                """,
                (pet_id,),
            ).fetchone()
            if row is None:
                raise KeyError(pet_id)
            return _pet_from_row(row)

        return self._pets_by_id[pet_id]

    def list_pets(self, owner_user_id: str = "local-user") -> tuple[PetProfile, ...]:
        if self._connection is not None:
            rows = self._connection.execute(
                """
                SELECT
                    id AS id,
                    name AS name,
                    breed AS breed,
                    species AS species,
                    age_label AS age_label,
                    sex_label AS sex_label,
                    weight_label AS weight_label,
                    birthday AS birthday,
                    personality AS personality,
                    notes AS notes,
                    photo_file_id AS photo_file_id
                FROM pets
                WHERE owner_user_id = ? AND deleted_at IS NULL
                ORDER BY created_at
                """,
                (owner_user_id,),
            ).fetchall()
            return tuple(_pet_from_row(row) for row in rows)
        return tuple(self._pets_by_id.values())

    def create_pet(
        self,
        name: str,
        species: str = "companion",
        owner_user_id: str = "local-user",
        breed: str | None = None,
    ) -> PetProfile:
        pet_id = f"pet_{uuid4().hex[:10].upper()}"
        if self._connection is not None:
            self._connection.execute(
                """
                INSERT INTO pets (id, owner_user_id, name, species, breed)
                VALUES (?, ?, ?, ?, ?)
                """,
                (pet_id, owner_user_id, name, species, breed),
            )
            self._connection.commit()
            return self.get_pet(pet_id)
        
        pet = PetProfile(id=pet_id, name=name, species=species, breed=breed)
        self._pets_by_id[pet_id] = pet
        return pet

    def set_profile_photo_file(self, pet_id: str, file_id: str) -> None:
        if self._connection is None:
            self._pets_by_id[pet_id] = replace(self._pets_by_id[pet_id], photo_file_id=file_id)
            return

        cursor = self._connection.execute(
            """
            UPDATE pets
            SET photo_file_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND deleted_at IS NULL
            """,
            (file_id, pet_id),
        )
        if cursor.rowcount == 0:
            raise KeyError(pet_id)
        self._connection.commit()

    def update_profile(
        self,
        pet_id: str,
        name: str | None = None,
        breed: str | None = None,
        age_label: str | None = None,
        sex_label: str | None = None,
        weight_label: str | None = None,
        birthday: str | None = None,
        personality: str | None = None,
        notes: tuple[str, ...] | None = None,
    ) -> PetProfile:
        if self._connection is not None:
            fields: list[str] = []
            values: list[object] = []
            for col, val in [("name", name), ("breed", breed), ("age_label", age_label),
                             ("sex_label", sex_label), ("weight_label", weight_label),
                             ("birthday", birthday), ("personality", personality)]:
                if val is not None:
                    fields.append(f"{col} = ?")
                    values.append(val)
            if notes is not None:
                fields.append("notes = ?")
                values.append(json.dumps(list(notes)))
            if fields:
                fields.append("updated_at = CURRENT_TIMESTAMP")
                values.append(pet_id)
                cursor = self._connection.execute(
                    f"UPDATE pets SET {', '.join(fields)} WHERE id=? AND deleted_at IS NULL",
                    values,
                )
                if cursor.rowcount == 0:
                    raise KeyError(pet_id)
                self._connection.commit()
            return self.get_pet(pet_id)
        pet = self._pets_by_id.get(pet_id)
        if pet is None:
            raise KeyError(pet_id)
        updated = replace(
            pet,
            name=name if name is not None else pet.name,
            breed=breed if breed is not None else pet.breed,
            age_label=age_label if age_label is not None else pet.age_label,
            sex_label=sex_label if sex_label is not None else pet.sex_label,
            weight_label=weight_label if weight_label is not None else pet.weight_label,
            birthday=birthday if birthday is not None else pet.birthday,
            personality=personality if personality is not None else pet.personality,
            notes=notes if notes is not None else pet.notes,
        )
        self._pets_by_id[pet_id] = updated
        return updated

    def delete_pet(self, pet_id: str) -> bool:
        if self._connection is not None:
            cursor = self._connection.execute(
                "UPDATE pets SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
                (pet_id,),
            )
            self._connection.commit()
            return cursor.rowcount > 0
        if pet_id in self._pets_by_id:
            del self._pets_by_id[pet_id]
            return True
        return False


def _pet_from_row(row: sqlite3.Row) -> PetProfile:
    return PetProfile(
        id=row["id"],
        name=row["name"],
        breed=row["breed"],
        species=row["species"],
        age_label=row["age_label"],
        sex_label=row["sex_label"],
        weight_label=row["weight_label"],
        birthday=row["birthday"],
        personality=row["personality"],
        notes=tuple(json.loads(row["notes"])),
        photo_file_id=row["photo_file_id"],
    )
