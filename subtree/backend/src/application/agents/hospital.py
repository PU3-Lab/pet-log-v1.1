from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from domain.models import VeterinaryHospitalRecommendation


KST = timezone(timedelta(hours=9), "KST")


@dataclass(frozen=True)
class HospitalRecommendationQuery:
    latitude: float
    longitude: float
    radius_meters: int = 3000
    max_results: int = 5
    language_code: str = "ko"
    region_code: str = "KR"
    open_now_only: bool = True
    emergency: bool = False
    text: str = ""
    location_source: str = "gps"
    accuracy_meters: float | None = None


@dataclass(frozen=True)
class HospitalRecommendationResult:
    current_time: datetime
    recommendations: tuple[VeterinaryHospitalRecommendation, ...]
    center_latitude: float | None = None
    center_longitude: float | None = None
    radius_meters: int | None = None
    location_source: str = "gps"
    accuracy_meters: float | None = None
    emergency_mode: bool = False


class HospitalRecommendationAgent:
    def __init__(
        self,
        hospital_provider,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._hospital_provider = hospital_provider
        self._clock = clock or (lambda: datetime.now(KST))

    def recommend(self, query: HospitalRecommendationQuery) -> HospitalRecommendationResult:
        current_time = self._clock()
        emergency_mode = query.emergency or _is_late_hour(current_time) or _has_emergency_terms(query.text)
        radius_meters = max(query.radius_meters, 10_000) if emergency_mode else query.radius_meters
        hospitals = self._hospital_provider.search(
            latitude=query.latitude,
            longitude=query.longitude,
            radius_meters=radius_meters,
            max_results=query.max_results,
            language_code=query.language_code,
            region_code=query.region_code,
            search_query="24시 동물병원" if emergency_mode else "동물병원",
            require_24_hours=emergency_mode,
        )
        if query.open_now_only:
            hospitals = tuple(hospital for hospital in hospitals if hospital.is_open_now is True or _is_fallback(hospital))
        if emergency_mode:
            hospitals = tuple(hospital for hospital in hospitals if hospital.is_24_hours or _is_fallback(hospital))

        return HospitalRecommendationResult(
            current_time=current_time,
            recommendations=tuple(sorted(hospitals, key=_recommendation_sort_key)),
            center_latitude=query.latitude,
            center_longitude=query.longitude,
            radius_meters=radius_meters,
            location_source=query.location_source,
            accuracy_meters=query.accuracy_meters,
            emergency_mode=emergency_mode,
        )


def _recommendation_sort_key(hospital: VeterinaryHospitalRecommendation) -> tuple[int, int, float, int, int]:
    distance = hospital.distance_meters if hospital.distance_meters is not None else 1_000_000_000
    rating = hospital.rating or 0.0
    return (
        0 if hospital.is_24_hours else 1,
        0 if hospital.is_open_now else 1,
        -rating,
        -hospital.user_rating_count,
        distance,
    )


def _is_late_hour(current_time: datetime) -> bool:
    return current_time.hour >= 22 or current_time.hour < 6


def _has_emergency_terms(text: str) -> bool:
    return any(term in text for term in ("응급", "야간", "24시", "24시간", "호흡", "출혈", "경련", "중독"))


def _is_fallback(hospital: VeterinaryHospitalRecommendation) -> bool:
    return hospital.place_id.startswith("fallback-")
