from __future__ import annotations

import json
import logging
import math
import os
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from domain.models import VeterinaryHospitalRecommendation


logger = logging.getLogger(__name__)

GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
GOOGLE_PLACES_FIELD_MASK = ",".join(
    (
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.businessStatus",
        "places.currentOpeningHours",
        "places.regularOpeningHours",
        "places.googleMapsUri",
        "places.googleMapsLinks",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.primaryType",
        "places.types",
    )
)


class GooglePlacesConfigurationError(RuntimeError):
    pass


@dataclass(frozen=True)
class GooglePlacesConfig:
    api_key: str
    endpoint: str = GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT
    timeout: float = 3.0

    @classmethod
    def from_env(cls) -> GooglePlacesConfig:
        return cls(
            api_key=os.environ.get("GOOGLE_MAPS_API_KEY", ""),
            endpoint=os.environ.get("GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT", GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT),
            timeout=_bounded_float(os.environ.get("GOOGLE_PLACES_TIMEOUT"), default=3.0, minimum=0.1),
        )

    @property
    def has_credentials(self) -> bool:
        return bool(self.api_key)


class GooglePlacesClient:
    def __init__(self, config: GooglePlacesConfig | None = None) -> None:
        self._config = config or GooglePlacesConfig.from_env()

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
        if not self._config.has_credentials:
            raise GooglePlacesConfigurationError("GOOGLE_MAPS_API_KEY is not configured")

        requested_count = max(1, min(max_results * 4, 20))
        payload = {
            "textQuery": search_query,
            "includedType": "veterinary_care",
            "maxResultCount": requested_count,
            "locationBias": {
                "circle": {
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": float(radius_meters),
                }
            },
            "languageCode": language_code,
            "regionCode": region_code,
        }
        request = Request(
            self._config.endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self._config.api_key,
                "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK,
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=self._config.timeout) as response:
                response_payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            logger.warning("google_places_search_failed error=%s", exc.__class__.__name__)
            return ()

        recommendations = (
            _place_to_recommendation(place, latitude, longitude)
            for place in response_payload.get("places", ())
            if isinstance(place, dict) and _is_operational(place)
        )
        return tuple(
            recommendation
            for recommendation in recommendations
            if _within_radius(recommendation, radius_meters)
            and (not require_24_hours or recommendation.is_24_hours)
        )[:max_results]


def _place_to_recommendation(
    place: dict[str, object],
    origin_latitude: float,
    origin_longitude: float,
) -> VeterinaryHospitalRecommendation:
    current_hours = _dict_value(place.get("currentOpeningHours"))
    regular_hours = _dict_value(place.get("regularOpeningHours"))
    location = _dict_value(place.get("location"))
    latitude = _float_or_none(location.get("latitude"))
    longitude = _float_or_none(location.get("longitude"))
    is_24_hours = _is_24_hours(regular_hours) or _is_24_hours(current_hours)
    is_open_now = _bool_or_none(current_hours.get("openNow"))
    return VeterinaryHospitalRecommendation(
        place_id=str(place.get("id", "")),
        name=_localized_text(place.get("displayName")),
        address=str(place.get("formattedAddress", "")),
        phone_number=_phone_number(place),
        google_maps_url=_maps_url(place),
        latitude=latitude,
        longitude=longitude,
        rating=_float_or_none(place.get("rating")),
        user_rating_count=_int_or_zero(place.get("userRatingCount")),
        is_open_now=is_open_now,
        is_24_hours=is_24_hours,
        weekday_text=tuple(str(item) for item in regular_hours.get("weekdayDescriptions", ()) if isinstance(item, str)),
        distance_meters=_distance_meters(origin_latitude, origin_longitude, latitude, longitude),
        reason=_recommendation_reason(is_open_now, is_24_hours),
    )


def _is_operational(place: dict[str, object]) -> bool:
    types = place.get("types")
    return (
        place.get("businessStatus") in (None, "OPERATIONAL")
        and place.get("primaryType") == "veterinary_care"
        and isinstance(types, list)
        and "veterinary_care" in types
    )


def _localized_text(value: object) -> str:
    if not isinstance(value, dict):
        return ""
    return str(value.get("text", ""))


def _phone_number(place: dict[str, object]) -> str:
    return str(place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber") or "")


def _maps_url(place: dict[str, object]) -> str:
    links = _dict_value(place.get("googleMapsLinks"))
    return str(place.get("googleMapsUri") or links.get("placeUri") or "")


def _is_24_hours(hours: dict[str, object]) -> bool:
    weekday_descriptions = hours.get("weekdayDescriptions")
    if isinstance(weekday_descriptions, list) and any(
        _description_says_24_hours(description)
        for description in weekday_descriptions
        if isinstance(description, str)
    ):
        return True

    periods = hours.get("periods")
    if not isinstance(periods, list):
        return False
    return any(_period_is_24_hours(period) for period in periods if isinstance(period, dict))


def _period_is_24_hours(period: dict[str, object]) -> bool:
    open_point = _dict_value(period.get("open"))
    close_point = _dict_value(period.get("close"))
    if open_point.get("hour", 0) != 0 or open_point.get("minute", 0) != 0:
        return False
    if not close_point:
        return True
    return close_point.get("hour") == 23 and close_point.get("minute") in (59, 60)


def _description_says_24_hours(value: str) -> bool:
    normalized = value.lower().replace(" ", "")
    return "24시간" in normalized or "open24hours" in normalized


def _recommendation_reason(is_open_now: bool | None, is_24_hours: bool) -> str:
    if is_24_hours:
        return "24시간 영업으로 확인되어 현재 시각 기준 우선 추천합니다."
    if is_open_now is True:
        return "현재 시각 기준 영업 중으로 확인되어 추천합니다."
    if is_open_now is False:
        return "현재 시각 기준 영업 중이 아닌 것으로 확인됩니다."
    return "영업 중 여부를 확인할 수 없어 방문 전 문의가 필요합니다."


def _distance_meters(
    origin_latitude: float,
    origin_longitude: float,
    latitude: float | None,
    longitude: float | None,
) -> int | None:
    if latitude is None or longitude is None:
        return None
    earth_radius_meters = 6_371_000
    lat1 = math.radians(origin_latitude)
    lat2 = math.radians(latitude)
    delta_lat = math.radians(latitude - origin_latitude)
    delta_lng = math.radians(longitude - origin_longitude)
    haversine = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    )
    return round(earth_radius_meters * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine)))


def _within_radius(recommendation: VeterinaryHospitalRecommendation, radius_meters: int) -> bool:
    return recommendation.distance_meters is None or recommendation.distance_meters <= radius_meters


def _dict_value(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def _bool_or_none(value: object) -> bool | None:
    return value if isinstance(value, bool) else None


def _float_or_none(value: object) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _int_or_zero(value: object) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _bounded_float(value: str | None, *, default: float, minimum: float) -> float:
    try:
        parsed = float(value) if value else default
    except ValueError:
        return default
    return max(parsed, minimum)
