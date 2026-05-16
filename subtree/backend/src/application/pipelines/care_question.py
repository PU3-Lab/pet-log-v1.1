from __future__ import annotations

from application.dto import CareQuestionResult


class CareQuestionPipeline:
    def __init__(
        self,
        context_builder,
        safety_guard,
        answer_provider,
        lookback_days: int = 30,
    ) -> None:
        self._context_builder = context_builder
        self._safety_guard = safety_guard
        self._answer_provider = answer_provider
        self._lookback_days = lookback_days

    def ask(self, pet_id: str, question: str) -> CareQuestionResult:
        context = self._context_builder.build(pet_id, self._lookback_days)
        safety_notice = self._safety_guard.check(question)
        answer = self._answer_provider.answer(context, question)
        referenced_record_ids = tuple(record.id for record in context.recent_records)
        return CareQuestionResult(
            answer=answer,
            safety_notice=safety_notice,
            referenced_record_ids=referenced_record_ids,
        )
