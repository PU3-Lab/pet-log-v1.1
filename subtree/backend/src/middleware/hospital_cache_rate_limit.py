from __future__ import annotations

import logging
import time
from collections import deque
from collections.abc import Callable
from threading import Lock

from domain.models import VeterinaryHospitalRecommendation


logger = logging.getLogger(__name__)


class HospitalCacheRateLimitMiddleware:
    def __init__(
        self,
        hospital_provider,
        *,
        max_requests: int = 30,
        window_seconds: int = 60,
        cache_ttl_seconds: int = 600,
        coordinate_precision: int = 3,
        clock: Callable[[], float] | None = None,
    ) -> None:
        self._hospital_provider = hospital_provider
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._cache_ttl_seconds = cache_ttl_seconds
        self._coordinate_precision = coordinate_precision
        self._clock = clock or time.monotonic
        self._cache: dict[tuple[object, ...], tuple[float, tuple[VeterinaryHospitalRecommendation, ...]]] = {}
        self._request_times: deque[float] = deque()
        self._lock = Lock()

    def search(
        self,
        *,
        latitude: float,
        longitude: float,
        radius_meters: int,
        max_results: int,
        language_code: str,
        region_code: str,
        search_query: str = "animal hospital",
        require_24_hours: bool = False,
    ) -> tuple[VeterinaryHospitalRecommendation, ...]:
        now = self._clock()
        cache_key = self._cache_key(
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            max_results=max_results,
            language_code=language_code,
            region_code=region_code,
            search_query=search_query,
            require_24_hours=require_24_hours,
        )

        with self._lock:
            cached = self._cache.get(cache_key)
            if cached is not None:
                cached_at, recommendations = cached
                if now - cached_at <= self._cache_ttl_seconds:
                    return recommendations
                del self._cache[cache_key]

            if self._is_rate_limited(now):
                logger.info("hospital_recommendation_rate_limited")
                return ()

            self._request_times.append(now)

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

        with self._lock:
            self._cache[cache_key] = (now, recommendations)

        return recommendations

    def _is_rate_limited(self, now: float) -> bool:
        while self._request_times and now - self._request_times[0] >= self._window_seconds:
            self._request_times.popleft()
        return len(self._request_times) >= self._max_requests

    def _cache_key(
        self,
        *,
        latitude: float,
        longitude: float,
        radius_meters: int,
        max_results: int,
        language_code: str,
        region_code: str,
        search_query: str,
        require_24_hours: bool,
    ) -> tuple[object, ...]:
        return (
            round(latitude, self._coordinate_precision),
            round(longitude, self._coordinate_precision),
            radius_meters,
            max_results,
            language_code.lower(),
            region_code.upper(),
            search_query.strip(),
            require_24_hours,
        )
