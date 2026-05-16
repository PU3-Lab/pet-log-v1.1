from __future__ import annotations

from uuid import uuid4

from application.dto import PetLogAgentInput, PetLogAgentResult
from domain.models import CareSuggestion, PetProfile, PetRecord, ShoppingRecommendation
from infrastructure.repositories import RecordRepository, ScheduleRepository


class _NoopShoppingAgent:
    def recommend(
        self,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...] = (),
    ) -> tuple[ShoppingRecommendation, ...]:
        return ()


class PetLogAgentPipeline:
    def __init__(
        self,
        record_structuring_agent,
        record_history_reader: RecordRepository,
        schedule_context_reader: ScheduleRepository,
        context_analysis_agent,
        risk_detection_agent,
        record_repository: RecordRepository,
        suggestion_agent,
        reminder_agent,
        shopping_agent=None,
        lookback_days: int = 30,
        days_ahead: int = 14,
    ) -> None:
        self._record_structuring_agent = record_structuring_agent
        self._record_history_reader = record_history_reader
        self._schedule_context_reader = schedule_context_reader
        self._context_analysis_agent = context_analysis_agent
        self._risk_detection_agent = risk_detection_agent
        self._record_repository = record_repository
        self._suggestion_agent = suggestion_agent
        self._reminder_agent = reminder_agent
        self._shopping_agent = shopping_agent or _NoopShoppingAgent()
        self._lookback_days = lookback_days
        self._days_ahead = days_ahead

    def handle(self, input: PetLogAgentInput) -> PetLogAgentResult:
        record_batch = self._record_structuring_agent.structure(input)
        recent_records = self._record_history_reader.list_recent(input.pet.id, self._lookback_days)
        due_items = self._schedule_context_reader.list_due_items(input.pet.id, self._days_ahead)
        context = self._context_analysis_agent.analyze(input.pet, recent_records, due_items)
        safety_notices = self._risk_detection_agent.detect(input.text, recent_records)

        if input.source == "ai_preview" or (record_batch.needs_confirmation and not input.confirm):
            return PetLogAgentResult(
                candidates=record_batch.candidates,
                context_analysis=context,
                safety_notices=safety_notices,
            )

        batch_id = str(uuid4())
        saved_records = tuple(
            self._record_repository.save_candidate(input.pet.id, candidate, source=input.source, batch_id=batch_id)
            for candidate in record_batch.candidates
        )
        suggestions = self._suggestion_agent.suggest(input.pet, context, safety_notices)
        shopping_recommendations = self._shopping_agent.recommend(input.pet, input.text, saved_records, suggestions)
        reminders = self._reminder_agent.plan(input.pet, recent_records + saved_records, due_items)

        return PetLogAgentResult(
            candidates=record_batch.candidates,
            saved_records=saved_records,
            context_analysis=context,
            safety_notices=safety_notices,
            suggestions=suggestions,
            shopping_recommendations=shopping_recommendations,
            reminders=reminders,
        )
