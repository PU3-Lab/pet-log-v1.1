from __future__ import annotations

from domain.models import PetRecord, SafetyNotice


class RiskSignalPolicy:
    def detect_risks(self, text: str, records: tuple[PetRecord, ...]) -> tuple[SafetyNotice, ...]:
        return ()
