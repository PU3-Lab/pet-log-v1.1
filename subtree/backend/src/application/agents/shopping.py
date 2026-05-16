from __future__ import annotations

import logging
from dataclasses import replace

from domain.models import CareSuggestion, PetProfile, PetRecord, ShoppingCategoryRequest, ShoppingRecommendation


logger = logging.getLogger(__name__)


class ShoppingAgent:
    def __init__(self, recommendation_provider, recommendation_agent=None, reason_agent=None) -> None:
        self._recommendation_provider = recommendation_provider
        self._recommendation_agent = recommendation_agent or reason_agent

    def recommend(
        self,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...] = (),
    ) -> tuple[ShoppingRecommendation, ...]:
        category_requests = self._category_requests_for(pet, text, records, suggestions)
        if self._recommendation_agent is not None and not category_requests:
            return ()
        recommendations = self._recommendation_provider.recommend(
            pet,
            text,
            records,
            category_requests=category_requests,
            suggestions=suggestions,
        )
        return self._select_recommendations(pet, text, records, suggestions, recommendations)

    def _category_requests_for(
        self,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
    ) -> tuple[ShoppingCategoryRequest, ...]:
        if self._recommendation_agent is None:
            return ()
        try:
            return self._recommendation_agent.category_requests_for(
                pet=pet,
                text=text,
                records=records,
                suggestions=suggestions,
            )
        except Exception as exc:
            logger.warning(
                "shopping_category_agent_failed error=%s detail=%s",
                exc.__class__.__name__,
                exc,
            )
            return ()

    def _select_recommendations(
        self,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
        recommendations: tuple[ShoppingRecommendation, ...],
    ) -> tuple[ShoppingRecommendation, ...]:
        if self._recommendation_agent is None:
            return recommendations

        selected: list[ShoppingRecommendation] = []
        for query, candidates in _recommendations_by_query(recommendations):
            selected.append(
                self._select_recommendation(
                    pet=pet,
                    text=text,
                    records=records,
                    suggestions=suggestions,
                    query=query,
                    candidates=candidates[:3],
                )
            )
        return tuple(selected)

    def _select_recommendation(
        self,
        *,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
        query: str,
        candidates: tuple[ShoppingRecommendation, ...],
    ) -> ShoppingRecommendation:
        fallback = candidates[0]
        try:
            selection = self._recommendation_agent.select_recommendation(
                pet=pet,
                text=text,
                records=records,
                suggestions=suggestions,
                query=query,
                candidates=candidates,
            )
        except Exception as exc:
            logger.warning(
                "shopping_selection_agent_failed error=%s detail=%s",
                exc.__class__.__name__,
                exc,
            )
            return fallback

        selected = _find_selected_candidate(selection.product_url, candidates)
        if selected is None:
            return fallback
        return replace(selected, reason=selection.reason)


class ShoppingRecommendationAgent:
    def __init__(self, recommendation_provider) -> None:
        self._recommendation_provider = recommendation_provider

    def category_requests_for(
        self,
        *,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
    ) -> tuple[ShoppingCategoryRequest, ...]:
        return self._recommendation_provider.category_requests_for(
            pet=pet,
            text=text,
            records=records,
            suggestions=suggestions,
        )

    def select_recommendation(
        self,
        *,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
        query: str,
        candidates: tuple[ShoppingRecommendation, ...],
    ):
        return self._recommendation_provider.select_recommendation(
            pet=pet,
            text=text,
            records=records,
            suggestions=suggestions,
            query=query,
            candidates=candidates,
        )


ShoppingRecommendationReasonAgent = ShoppingRecommendationAgent


def _recommendations_by_query(
    recommendations: tuple[ShoppingRecommendation, ...],
) -> tuple[tuple[str, tuple[ShoppingRecommendation, ...]], ...]:
    grouped: dict[str, list[ShoppingRecommendation]] = {}
    for recommendation in recommendations:
        grouped.setdefault(recommendation.query, []).append(recommendation)
    return tuple((query, tuple(candidates)) for query, candidates in grouped.items())


def _find_selected_candidate(
    product_url: str,
    candidates: tuple[ShoppingRecommendation, ...],
) -> ShoppingRecommendation | None:
    for candidate in candidates:
        if candidate.product_url == product_url or candidate.id == product_url:
            return candidate
    return None
