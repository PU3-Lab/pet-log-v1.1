from __future__ import annotations

from domain.models import CareSuggestion, ContextAnalysisResult, PetProfile, SafetyNotice


class SuggestionAgent:
    def __init__(self, suggestion_composer) -> None:
        self._suggestion_composer = suggestion_composer

    def suggest(
        self,
        pet: PetProfile,
        context: ContextAnalysisResult,
        safety_notices: tuple[SafetyNotice, ...],
    ) -> tuple[CareSuggestion, ...]:
        insights = context.insights + context.missing_record_insights
        return self._suggestion_composer.compose(pet, insights)
