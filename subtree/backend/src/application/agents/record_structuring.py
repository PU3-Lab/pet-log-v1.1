from __future__ import annotations

from application.dto import PetLogAgentInput
from domain.models import StructuredRecordBatch


class RecordStructuringAgent:
    def __init__(self, structurer) -> None:
        self._structurer = structurer

    def structure(self, input: PetLogAgentInput) -> StructuredRecordBatch:
        return self._structurer.structure(input)
