from __future__ import annotations

from domain.models import CareInsight, PetProfile, PetRecord
from domain.record_labels import record_category_list_label


class PatternAnalyzer:
    def analyze(self, pet: PetProfile, records: tuple[PetRecord, ...]) -> tuple[CareInsight, ...]:
        flagged_records = tuple(record for record in records if record.status in ("notice", "alert"))
        if len(flagged_records) < 2:
            return ()

        severity = "alert" if any(record.status == "alert" for record in flagged_records) else "notice"
        categories = record_category_list_label(record.category for record in flagged_records)
        return (
            CareInsight(
                severity=severity,
                title="주의 상태 반복",
                reason=f"{pet.name}의 최근 기록에서 {categories} 관련 확인 필요 상태가 반복되었습니다.",
                source_record_ids=tuple(record.id for record in flagged_records),
            ),
        )
