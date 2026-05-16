from __future__ import annotations

import json
import unittest
from datetime import datetime
from unittest.mock import patch

from application.agents.hospital import KST, HospitalRecommendationAgent, HospitalRecommendationQuery
from domain.models import VeterinaryHospitalRecommendation
from infrastructure.maps import GooglePlacesClient, GooglePlacesConfig, GooglePlacesConfigurationError
from middleware import HospitalCacheRateLimitMiddleware, HospitalFallbackMiddleware


class FakeHospitalProvider:
    def __init__(self, hospitals: tuple[VeterinaryHospitalRecommendation, ...]) -> None:
        self.hospitals = hospitals
        self.searches: list[dict[str, object]] = []

    def search(self, **kwargs) -> tuple[VeterinaryHospitalRecommendation, ...]:
        self.searches.append(kwargs)
        return self.hospitals


class TestHospitalRecommendations(unittest.TestCase):
    def test_agent_keeps_open_hospitals_and_prioritizes_24_hours(self) -> None:
        provider = FakeHospitalProvider(
            (
                VeterinaryHospitalRecommendation(
                    place_id="regular-open",
                    name="Regular Vet",
                    address="Seoul",
                    phone_number="02-0000-0001",
                    google_maps_url="https://maps.example/regular",
                    latitude=37.5,
                    longitude=127.0,
                    rating=4.9,
                    user_rating_count=20,
                    is_open_now=True,
                    is_24_hours=False,
                    weekday_text=(),
                    distance_meters=200,
                    reason="open",
                ),
                VeterinaryHospitalRecommendation(
                    place_id="always-open",
                    name="Always Vet",
                    address="Seoul",
                    phone_number="02-0000-0002",
                    google_maps_url="https://maps.example/always",
                    latitude=37.51,
                    longitude=127.01,
                    rating=4.1,
                    user_rating_count=10,
                    is_open_now=True,
                    is_24_hours=True,
                    weekday_text=(),
                    distance_meters=500,
                    reason="24 hours",
                ),
                VeterinaryHospitalRecommendation(
                    place_id="closed",
                    name="Closed Vet",
                    address="Seoul",
                    phone_number="",
                    google_maps_url="https://maps.example/closed",
                    latitude=37.52,
                    longitude=127.02,
                    rating=5.0,
                    user_rating_count=100,
                    is_open_now=False,
                    is_24_hours=False,
                    weekday_text=(),
                    distance_meters=50,
                    reason="closed",
                ),
            )
        )
        current_time = datetime(2026, 5, 11, 15, 30, tzinfo=KST)
        agent = HospitalRecommendationAgent(provider, clock=lambda: current_time)

        result = agent.recommend(HospitalRecommendationQuery(latitude=37.5, longitude=127.0))

        self.assertEqual(result.current_time, current_time)
        self.assertEqual([hospital.place_id for hospital in result.recommendations], ["always-open", "regular-open"])
        self.assertEqual(provider.searches[0]["radius_meters"], 3000)

    def test_agent_uses_24_hour_query_for_emergency_context(self) -> None:
        provider = FakeHospitalProvider(
            (
                VeterinaryHospitalRecommendation(
                    place_id="always-open",
                    name="Always Vet",
                    address="Seoul",
                    phone_number="02-0000-0002",
                    google_maps_url="https://maps.example/always",
                    latitude=37.51,
                    longitude=127.01,
                    rating=4.1,
                    user_rating_count=10,
                    is_open_now=True,
                    is_24_hours=True,
                    weekday_text=(),
                    distance_meters=500,
                    reason="24 hours",
                ),
            )
        )
        current_time = datetime(2026, 5, 11, 23, 30, tzinfo=KST)
        agent = HospitalRecommendationAgent(provider, clock=lambda: current_time)

        result = agent.recommend(
            HospitalRecommendationQuery(
                latitude=37.5,
                longitude=127.0,
                emergency=True,
                text="응급 조치가 필요해요",
            )
        )

        self.assertEqual(result.recommendations[0].place_id, "always-open")
        self.assertEqual(provider.searches[0]["search_query"], "24시 동물병원")
        self.assertTrue(provider.searches[0]["require_24_hours"])
        self.assertEqual(provider.searches[0]["radius_meters"], 10000)

    def test_hospital_fallback_returns_maps_search_when_provider_is_empty(self) -> None:
        provider = HospitalFallbackMiddleware(FakeHospitalProvider(()))

        recommendations = provider.search(
            latitude=37.5,
            longitude=127.0,
            radius_meters=3000,
            max_results=5,
            language_code="ko",
            region_code="KR",
            search_query="24시 동물병원",
            require_24_hours=True,
        )

        self.assertEqual(recommendations[0].place_id, "fallback-google-maps-search")
        self.assertIn("google.com/maps/search", recommendations[0].google_maps_url)
        self.assertIsNone(recommendations[0].is_open_now)

    def test_hospital_cache_reuses_identical_search_results(self) -> None:
        hospital = VeterinaryHospitalRecommendation(
            place_id="place-1",
            name="Cached Vet",
            address="Seoul",
            phone_number="02-0000-0001",
            google_maps_url="https://maps.example/cached",
            latitude=37.5,
            longitude=127.0,
            rating=4.5,
            user_rating_count=10,
            is_open_now=True,
            is_24_hours=False,
            weekday_text=(),
            distance_meters=150,
            reason="nearby",
        )
        upstream = FakeHospitalProvider((hospital,))
        provider = HospitalCacheRateLimitMiddleware(upstream, cache_ttl_seconds=60, clock=lambda: 1000.0)

        first = provider.search(
            latitude=37.500123,
            longitude=127.000456,
            radius_meters=3000,
            max_results=5,
            language_code="ko",
            region_code="KR",
            search_query="animal hospital",
            require_24_hours=False,
        )
        second = provider.search(
            latitude=37.500123,
            longitude=127.000456,
            radius_meters=3000,
            max_results=5,
            language_code="ko",
            region_code="KR",
            search_query="animal hospital",
            require_24_hours=False,
        )

        self.assertEqual(first, second)
        self.assertEqual(len(upstream.searches), 1)

    def test_hospital_rate_limit_blocks_uncached_searches(self) -> None:
        hospital = VeterinaryHospitalRecommendation(
            place_id="place-1",
            name="Limited Vet",
            address="Seoul",
            phone_number="02-0000-0001",
            google_maps_url="https://maps.example/limited",
            latitude=37.5,
            longitude=127.0,
            rating=4.5,
            user_rating_count=10,
            is_open_now=True,
            is_24_hours=False,
            weekday_text=(),
            distance_meters=150,
            reason="nearby",
        )
        upstream = FakeHospitalProvider((hospital,))
        provider = HospitalCacheRateLimitMiddleware(
            upstream,
            max_requests=1,
            window_seconds=60,
            cache_ttl_seconds=60,
            clock=lambda: 1000.0,
        )

        first = provider.search(
            latitude=37.5,
            longitude=127.0,
            radius_meters=3000,
            max_results=5,
            language_code="ko",
            region_code="KR",
            search_query="animal hospital",
            require_24_hours=False,
        )
        blocked = provider.search(
            latitude=37.6,
            longitude=127.1,
            radius_meters=3000,
            max_results=5,
            language_code="ko",
            region_code="KR",
            search_query="animal hospital",
            require_24_hours=False,
        )

        self.assertEqual(first, (hospital,))
        self.assertEqual(blocked, ())
        self.assertEqual(len(upstream.searches), 1)

    def test_google_places_client_maps_nearby_search_response(self) -> None:
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def read(self) -> bytes:
                return json.dumps(
                    {
                        "places": [
                            {
                                "id": "place-1",
                                "displayName": {"text": "24시 반려동물병원"},
                                "formattedAddress": "서울시 강남구",
                                "location": {"latitude": 37.501, "longitude": 127.001},
                                "rating": 4.6,
                                "userRatingCount": 42,
                                "businessStatus": "OPERATIONAL",
                                "primaryType": "veterinary_care",
                                "types": ["pet_care", "veterinary_care", "point_of_interest", "establishment"],
                                "nationalPhoneNumber": "02-1234-5678",
                                "googleMapsUri": "https://maps.google.com/?cid=1",
                                "currentOpeningHours": {
                                    "openNow": True,
                                    "periods": [{"open": {"day": 0, "hour": 0, "minute": 0}}],
                                },
                                "regularOpeningHours": {
                                    "weekdayDescriptions": ["월요일: 24시간"],
                                    "periods": [{"open": {"day": 0, "hour": 0, "minute": 0}}],
                                },
                            },
                            {
                                "id": "closed-permanently",
                                "businessStatus": "CLOSED_PERMANENTLY",
                            },
                        ]
                    }
                ).encode("utf-8")

        client = GooglePlacesClient(GooglePlacesConfig(api_key="key", timeout=1))

        with patch("infrastructure.maps.google_places.urlopen", return_value=FakeResponse()) as urlopen:
            recommendations = client.search(
                latitude=37.5,
                longitude=127.0,
                radius_meters=1500,
                max_results=5,
                language_code="ko",
                region_code="KR",
            )

        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://places.googleapis.com/v1/places:searchText")
        request_payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(request_payload["textQuery"], "동물병원")
        self.assertEqual(request_payload["includedType"], "veterinary_care")
        self.assertIn("locationBias", request_payload)
        self.assertEqual(recommendations[0].place_id, "place-1")
        self.assertEqual(recommendations[0].name, "24시 반려동물병원")
        self.assertTrue(recommendations[0].is_open_now)
        self.assertTrue(recommendations[0].is_24_hours)
        self.assertEqual(recommendations[0].phone_number, "02-1234-5678")
        self.assertEqual(len(recommendations), 1)

    def test_google_places_client_accepts_24_hour_search_query(self) -> None:
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def read(self) -> bytes:
                return json.dumps(
                    {
                        "places": [
                            {
                                "id": "place-1",
                                "displayName": {"text": "24시 동물병원"},
                                "formattedAddress": "서울시",
                                "location": {"latitude": 37.501, "longitude": 127.001},
                                "businessStatus": "OPERATIONAL",
                                "primaryType": "veterinary_care",
                                "types": ["veterinary_care"],
                                "currentOpeningHours": {
                                    "openNow": True,
                                    "weekdayDescriptions": ["월요일: 24시간 영업"],
                                },
                            }
                        ]
                    }
                ).encode("utf-8")

        client = GooglePlacesClient(GooglePlacesConfig(api_key="key", timeout=1))

        with patch("infrastructure.maps.google_places.urlopen", return_value=FakeResponse()) as urlopen:
            recommendations = client.search(
                latitude=37.5,
                longitude=127.0,
                radius_meters=1500,
                max_results=5,
                language_code="ko",
                region_code="KR",
                search_query="24시 동물병원",
                require_24_hours=True,
            )

        request_payload = json.loads(urlopen.call_args.args[0].data.decode("utf-8"))
        self.assertEqual(request_payload["textQuery"], "24시 동물병원")
        self.assertTrue(recommendations[0].is_24_hours)

    def test_google_places_client_requires_api_key(self) -> None:
        client = GooglePlacesClient(GooglePlacesConfig(api_key=""))

        with self.assertRaises(GooglePlacesConfigurationError):
            client.search(
                latitude=37.5,
                longitude=127.0,
                radius_meters=1500,
                max_results=5,
                language_code="ko",
                region_code="KR",
            )


if __name__ == "__main__":
    unittest.main()
