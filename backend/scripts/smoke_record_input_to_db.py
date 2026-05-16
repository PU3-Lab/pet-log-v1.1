from __future__ import annotations

import json
from pathlib import Path

from dotenv import load_dotenv

from application.dto import PetLogAgentInput
from infrastructure.database import connect
from infrastructure.llm.record_structuring import RecordStructurer
from infrastructure.repositories import PetProfileRepository, RecordRepository


PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0SM0K3"


def seed_smoke_pet(connection) -> None:
    connection.execute(
        """
        INSERT OR IGNORE INTO pets (id, name, breed, species, age_label, personality, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            PET_ID,
            "초코",
            "말티푸",
            "companion",
            "3살",
            "처음엔 낯을 가리지만 저녁 산책을 좋아해요",
            json.dumps(["아침 식사는 천천히 먹는 편", "알러지 의심 간식은 피하기"], ensure_ascii=False),
        ),
    )
    connection.commit()


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    load_dotenv(backend_root / ".env", override=False)

    connection = connect(":memory:")
    try:
        seed_smoke_pet(connection)
        pet_repository = PetProfileRepository(connection=connection)
        record_repository = RecordRepository(connection=connection)

        pet = pet_repository.get_pet(PET_ID)
        batch = RecordStructurer().structure(
            PetLogAgentInput(
                pet=pet,
                text="오늘 오전 8시에 초코가 사료 40g 중 15g만 먹고, 저녁 산책은 12분만 했고, 오른쪽 귀를 5번 긁었어.",
                source="manual",
                confirm=True,
            )
        )
        saved_records = tuple(record_repository.save_candidate(pet.id, candidate) for candidate in batch.candidates)
        stored_records = record_repository.list_by_ids(pet.id, tuple(record.id for record in saved_records))
    finally:
        connection.close()

    print("pet:", pet)
    print("parsed_candidates:", batch.candidates)
    print("needs_confirmation:", batch.needs_confirmation)
    print("saved_records:", saved_records)
    print("stored_records:", stored_records)


if __name__ == "__main__":
    main()
