from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

from application.dto import PetLogAgentInput
from domain.models import PetProfile
from infrastructure.llm.record_structuring import RecordStructurer


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    load_dotenv(backend_root / ".env", override=False)

    batch = RecordStructurer().structure(
        PetLogAgentInput(
            pet=PetProfile(
                id="pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                name="초코",
                breed="말티푸",
                species="companion",
                age_label="3살",
                personality="처음엔 낯을 가리지만 저녁 산책을 좋아해요",
                notes=("아침 식사는 천천히 먹는 편", "알러지 의심 간식은 피하기"),
            ),
            text="오늘 오전 8시에 초코가 사료 40g 중 15g만 먹고, 저녁 산책은 12분만 했고, 오른쪽 귀를 5번 긁었어.",
            source="manual",
        )
    )

    print("needs_confirmation:", batch.needs_confirmation)
    for index, candidate in enumerate(batch.candidates, start=1):
        print(f"candidate {index}:", candidate)


if __name__ == "__main__":
    main()
