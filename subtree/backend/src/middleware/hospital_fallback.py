from __future__ import annotations

import logging
from urllib.parse import quote

from domain.models import VeterinaryHospitalRecommendation


logger = logging.getLogger(__name__)


class HospitalFallbackMiddleware:
    def __init__(self, hospital_provider) -> None:
        self._hospital_provider = hospital_provider

    def search(
        self,
        *,
        latitude: float,
        longitude: float,
        radius_meters: int,
        max_results: int,
        language_code: str,
        region_code: str,
        search_query: str = "동물병원",
        require_24_hours: bool = False,
    ) -> tuple[VeterinaryHospitalRecommendation, ...]:
        try:
            recommendations = self._hospital_provider.search(
                latitude=latitude,
                longitude=longitude,
                radius_meters=radius_meters,
                max_results=max_results,
                language_code=language_code,
                region_code=region_code,
                search_query=search_query,
                require_24_hours=require_24_hours,
            )
        except Exception as exc:
            logger.warning("hospital_recommendation_provider_failed error=%s", exc.__class__.__name__)
            recommendations = ()

        if recommendations:
            return recommendations
        return build_fallback_hospital_recommendations(
            latitude=latitude,
            longitude=longitude,
            search_query="24시 동물병원" if require_24_hours else search_query,
        )


def build_fallback_hospital_recommendations(
    *,
    latitude: float,
    longitude: float,
    search_query: str,
) -> tuple[VeterinaryHospitalRecommendation, ...]:
    maps_query = f"{search_query} 근처"
    return (
        VeterinaryHospitalRecommendation(
            place_id="fallback-google-maps-search",
            name=f"{maps_query} Google Maps 검색",
            address="",
            phone_number="",
            google_maps_url=(
                "https://www.google.com/maps/search/"
                f"{quote(maps_query)}"
                f"/@{latitude},{longitude},14z"
            ),
            latitude=None,
            longitude=None,
            rating=None,
            user_rating_count=0,
            is_open_now=None,
            is_24_hours=False,
            weekday_text=(),
            distance_meters=None,
            reason="Google Places 결과를 확인하지 못해 지도 검색 링크로 대체합니다. 방문 전 24시간 진료 여부를 확인하세요.",
        ),
    )
