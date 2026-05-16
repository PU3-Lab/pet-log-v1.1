from __future__ import annotations

from domain.models import CareInsight, PetProfile, PetRecord


class MissingRecordPolicy:
    def detect_missing_records(self, pet: PetProfile, records: tuple[PetRecord, ...]) -> tuple[CareInsight, ...]:
        if records:
            return ()

        return (
            CareInsight(
                severity="notice",
                title="최근 기록 없음",
                reason=f"{pet.name}의 최근 케어 기록이 없어 식사, 산책, 배변 흐름을 판단하기 어렵습니다.",
            ),
        )
