from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from composition import AppContext
from presentation.http.schemas import shopping_recommendation_to_dict, success_response


def build_shopping_router() -> APIRouter:
    router = APIRouter()

    @router.get("/api/v1/shopping/recommendations")
    def recommend_shopping(
        http_request: Request,
        pet_id: str,
        text: str = "",
        lookback_days: int = 30,
    ) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.shopping_agent is None:
            raise HTTPException(status_code=500, detail="Shopping recommendation agent is not configured")
        if app_context.record_reader is None or app_context.schedule_reader is None:
            raise HTTPException(status_code=500, detail="Repository not configured")
        if app_context.context_analysis_agent is None or app_context.suggestion_agent is None:
            raise HTTPException(status_code=500, detail="Shopping suggestion context is not configured")

        try:
            pet = app_context.pet_profile_reader.get_pet(pet_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Pet not found") from exc

        records = app_context.record_reader.list_recent(pet_id, lookback_days=lookback_days)
        due_items = app_context.schedule_reader.list_due_items(pet_id, days_ahead=14)
        context = app_context.context_analysis_agent.analyze(pet, records, due_items)
        suggestions = app_context.suggestion_agent.suggest(pet, context, ())
        recommendations = app_context.shopping_agent.recommend(pet, text, records, suggestions)
        return success_response(
            {
                "recommendations": [
                    shopping_recommendation_to_dict(recommendation)
                    for recommendation in recommendations
                ]
            }
        )

    return router


def _app_context(request: Request) -> AppContext:
    return request.app.state.app_context
