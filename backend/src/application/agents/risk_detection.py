from __future__ import annotations

from domain.models import PetRecord, SafetyNotice


class RiskDetectionAgent:
    def __init__(self, risk_signal_policy) -> None:
        self._risk_signal_policy = risk_signal_policy

    def detect(self, text: str, records: tuple[PetRecord, ...]) -> tuple[SafetyNotice, ...]:
        return self._risk_signal_policy.detect_risks(text, records)
