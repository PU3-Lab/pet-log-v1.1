from __future__ import annotations

import base64
import json

from domain.models import PetProfile


def build_image_record_understanding_messages(
    pet: PetProfile,
    image: bytes,
    content_type: str,
    user_note: str | None = None,
) -> list[object]:
    image_data = base64.b64encode(image).decode("ascii")
    text_payload = {
        "pet": {
            "id": pet.id,
            "name": pet.name,
            "breed": pet.breed,
            "species": pet.species,
            "age_label": pet.age_label,
            "personality": pet.personality,
            "notes": list(pet.notes),
        },
        "user_note": user_note,
    }
    return [
        ("system", image_record_understanding_system_prompt()),
        (
            "user",
            [
                {
                    "type": "text",
                    "text": (
                        "다음 반려동물 사진을 StructuredRecordCandidate 후보 하나로 구조화하세요. "
                        "확실하지 않은 내용은 needs_confirmation=true로 표시하세요.\n\n"
                        + json.dumps(text_payload, ensure_ascii=False)
                    ),
                },
                {
                    "type": "image",
                    "source_type": "base64",
                    "mime_type": content_type,
                    "data": image_data,
                },
            ],
        ),
    ]


def image_record_understanding_system_prompt() -> str:
    return (
        "반려동물 사진에서 관찰 가능한 기록 후보만 구조화하세요. "
        "사료량, 배변 상태, 자세처럼 보이는 정보는 사용할 수 있지만 "
        "건강 상태나 질병을 단정하지 마세요."
    )
