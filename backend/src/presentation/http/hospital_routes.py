from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from application.agents.hospital import HospitalRecommendationQuery
from composition import AppContext
from infrastructure.maps import GooglePlacesConfigurationError
from presentation.http.schemas import (
    HospitalRecommendationRequest,
    hospital_recommendation_result_to_dict,
    success_response,
)


def build_hospital_router() -> APIRouter:
    router = APIRouter()

    @router.post("/api/v1/hospitals/recommendations")
    def recommend_hospitals(
        http_request: Request,
        request: HospitalRecommendationRequest,
    ) -> dict[str, object]:
        app_context = _app_context(http_request)
        if app_context.hospital_recommendation_agent is None:
            raise HTTPException(status_code=500, detail="Hospital recommendation agent is not configured")

        try:
            result = app_context.hospital_recommendation_agent.recommend(
                HospitalRecommendationQuery(
                    latitude=request.latitude,
                    longitude=request.longitude,
                    radius_meters=request.radius_meters,
                    max_results=request.max_results,
                    language_code=request.language_code,
                    region_code=request.region_code,
                    open_now_only=request.open_now_only,
                    emergency=request.emergency,
                    text=request.text,
                    location_source=request.location_source,
                    accuracy_meters=request.accuracy_meters,
                )
            )
        except GooglePlacesConfigurationError as exc:
            raise HTTPException(status_code=503, detail="Google Maps API key is not configured") from exc

        return success_response(hospital_recommendation_result_to_dict(result))

    return router


def _app_context(request: Request) -> AppContext:
    return request.app.state.app_context
