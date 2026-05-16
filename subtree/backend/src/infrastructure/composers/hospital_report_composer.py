from __future__ import annotations

from application.dto import HospitalSummaryResult
from domain.models import PetProfile, PetRecord


class HospitalReportComposer:
    def compose(self, pet: PetProfile, records: tuple[PetRecord, ...]) -> HospitalSummaryResult:
        raise NotImplementedError
