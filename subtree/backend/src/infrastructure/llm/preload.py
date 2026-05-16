from __future__ import annotations

import os

from infrastructure.llm.action_navigation import ActionNavigationProvider
from infrastructure.llm.care_answer import CareAnswerProvider
from infrastructure.llm.image_record_understanding import ImageRecordUnderstandingProvider
from infrastructure.llm.local_runtime import ensure_local_gemma_runtime
from infrastructure.llm.pet_persona import PetPersonaResponder
from infrastructure.llm.record_summary import RecordSummaryProvider
from infrastructure.llm.record_structuring import RecordStructurer


def should_preload_all_llm_providers() -> bool:
    return os.environ.get("LLM_EAGER_LOAD", "").lower() in {"1", "true", "yes"}


def preload_configured_llm_providers() -> None:
    ensure_local_gemma_runtime()

    if not should_preload_all_llm_providers():
        return

    RecordStructurer()
    RecordSummaryProvider()
    CareAnswerProvider()
    PetPersonaResponder()
    ImageRecordUnderstandingProvider()
    ActionNavigationProvider()
