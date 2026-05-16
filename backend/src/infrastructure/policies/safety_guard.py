from __future__ import annotations

from domain.models import SafetyNotice


class SafetyGuard:
    def check(self, text: str) -> SafetyNotice | None:
        raise NotImplementedError
