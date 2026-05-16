from __future__ import annotations

from application.dto import PetLogAgentResult


class PetLogAgentResultRepository:
    def __init__(self, latest_results_by_pet_id: dict[str, PetLogAgentResult] | None = None) -> None:
        self._latest_results_by_pet_id = dict(latest_results_by_pet_id or {})

    def get_latest(self, pet_id: str) -> PetLogAgentResult:
        return self._latest_results_by_pet_id[pet_id]
