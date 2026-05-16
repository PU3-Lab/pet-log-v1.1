from __future__ import annotations

from domain.models import CareInsight, ContextAnalysisResult, PetProfile, PetRecord


class CauseHypothesisPolicy:
    def analyze(
        self,
        pet: PetProfile,
        records: tuple[PetRecord, ...],
        context: ContextAnalysisResult,
    ) -> tuple[CareInsight, ...]:
        raise NotImplementedError
