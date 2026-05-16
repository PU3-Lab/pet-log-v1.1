from __future__ import annotations

import argparse
import os
from datetime import datetime
from pathlib import Path

from application.agents.hospital import KST, HospitalRecommendationAgent, HospitalRecommendationQuery
from domain.models import VeterinaryHospitalRecommendation
from infrastructure.maps import GooglePlacesClient, GooglePlacesConfig
from middleware import HospitalFallbackMiddleware

try:
    from dotenv import load_dotenv
except (ImportError, PermissionError):
    load_dotenv = None


class FakeHospitalProvider:
    def search(self, **kwargs) -> tuple[VeterinaryHospitalRecommendation, ...]:
        return (
            VeterinaryHospitalRecommendation(
                place_id="fake-24h-vet",
                name="24 Hour Companion Animal Clinic",
                address="Seoul",
                phone_number="02-0000-0000",
                google_maps_url="https://maps.example/fake-24h-vet",
                latitude=kwargs["latitude"],
                longitude=kwargs["longitude"],
                rating=4.5,
                user_rating_count=12,
                is_open_now=True,
                is_24_hours=True,
                weekday_text=("Monday: Open 24 hours",),
                distance_meters=0,
                reason="24-hour fake fixture",
            ),
        )


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    if load_dotenv is not None:
        load_dotenv(backend_root / ".env", override=False)

    args = _parse_args()
    latitude, longitude = _smoke_center(args)

    print("[manual smoke] Google hospital recommendations")
    print("center:", f"{latitude}, {longitude}", f"source={args.location_source}")
    print()
    smoke_agent_with_fake_provider(latitude, longitude, args.location_source)
    print()
    smoke_google_places_if_configured(latitude, longitude, args.location_source)


def smoke_agent_with_fake_provider(latitude: float, longitude: float, location_source: str) -> None:
    agent = HospitalRecommendationAgent(
        FakeHospitalProvider(),
        clock=lambda: datetime(2026, 5, 11, 15, 30, tzinfo=KST),
    )
    result = agent.recommend(
        HospitalRecommendationQuery(
            latitude=latitude,
            longitude=longitude,
            location_source=location_source,
        )
    )

    print("[HospitalRecommendationAgent fake]")
    print("current time:", result.current_time.isoformat())
    print("search center:", _center_label(result))
    print("result count:", len(result.recommendations))
    _print_items(result.recommendations)


def smoke_google_places_if_configured(latitude: float, longitude: float, location_source: str) -> None:
    config = GooglePlacesConfig.from_env()
    print("[GooglePlacesClient real]")
    print("credentials configured:", config.has_credentials)
    if not config.has_credentials:
        print("skipped: set GOOGLE_MAPS_API_KEY to call Google Places API")
        return

    agent = HospitalRecommendationAgent(HospitalFallbackMiddleware(GooglePlacesClient(config)))
    result = agent.recommend(
        HospitalRecommendationQuery(
            latitude=latitude,
            longitude=longitude,
            radius_meters=3000,
            max_results=5,
            language_code="ko",
            region_code="KR",
            emergency=True,
            text="늦은 시간 응급 조치가 필요해요.",
            location_source=location_source,
        )
    )
    print("search center:", _center_label(result))
    print("result count:", len(result.recommendations))
    _print_items(result.recommendations)


def _print_items(items: tuple[VeterinaryHospitalRecommendation, ...]) -> None:
    for index, item in enumerate(items, start=1):
        print(
            f"{index}. {item.name} | open_now={item.is_open_now} | 24h={item.is_24_hours} | "
            f"distance={item.distance_meters}m | rating={item.rating} | url={item.google_maps_url}"
        )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke test Google hospital recommendations.")
    parser.add_argument("--latitude", type=float)
    parser.add_argument("--longitude", type=float)
    parser.add_argument("--location-source", default="gps")
    return parser.parse_args()


def _smoke_center(args: argparse.Namespace) -> tuple[float, float]:
    latitude = args.latitude if args.latitude is not None else _env_float("HOSPITAL_SMOKE_LATITUDE")
    longitude = args.longitude if args.longitude is not None else _env_float("HOSPITAL_SMOKE_LONGITUDE")
    if latitude is None or longitude is None:
        return 37.5665, 126.9780
    return latitude, longitude


def _env_float(name: str) -> float | None:
    value = os.environ.get(name)
    if not value:
        return None
    return float(value)


def _center_label(result) -> str:
    return (
        f"{result.center_latitude}, {result.center_longitude} "
        f"radius={result.radius_meters}m source={result.location_source} "
        f"emergency={result.emergency_mode}"
    )


if __name__ == "__main__":
    main()
