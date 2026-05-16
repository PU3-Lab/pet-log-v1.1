from __future__ import annotations

from io import BytesIO
import unittest
from urllib.error import HTTPError
from unittest.mock import patch

from domain.models import PetProfile, PetRecord, ShoppingCategoryRequest, ShoppingRecommendation
from infrastructure.shopping import NaverShoppingClient, NaverShoppingConfig, ShoppingRecommendationProvider


class FakeShoppingClient:
    def __init__(self) -> None:
        self.searches: list[tuple[str, str, tuple[str, ...]]] = []

    def search(
        self,
        query: str,
        *,
        reason: str,
        source_record_ids: tuple[str, ...],
    ) -> tuple[ShoppingRecommendation, ...]:
        self.searches.append((query, reason, source_record_ids))
        return (
            ShoppingRecommendation(
                title="반려견 사료",
                product_url="https://shopping.example/products/food",
                image_url="https://shopping.example/products/food.jpg",
                mall_name="sample mall",
                lowest_price=12000,
                query=query,
                reason=reason,
                source_record_ids=source_record_ids,
            ),
        )


class TestShoppingRecommendations(unittest.TestCase):
    def test_uses_agent_category_request_for_shopping_search(self) -> None:
        client = FakeShoppingClient()
        provider = ShoppingRecommendationProvider(client)
        record = PetRecord(
            id="record-1",
            pet_id="pet-1",
            category="meal",
            title="아침 식사",
            detail="사료를 조금 남겼어요.",
            status="notice",
            recorded_at="2026-05-11T08:00:00Z",
            source="manual",
        )

        recommendations = provider.recommend(
            PetProfile(id="pet-1", name="초코", species="dog"),
            "아침 식사 기록",
            (record,),
            category_requests=(
                ShoppingCategoryRequest(
                    query="반려견 사료",
                    category="사료",
                    reason="식사 기록과 관련된 후보",
                    source_record_ids=("record-1",),
                ),
            ),
        )

        self.assertEqual(client.searches[0][0], "반려견 사료")
        self.assertEqual(client.searches[0][1], "식사 기록과 관련된 후보")
        self.assertEqual(recommendations[0].query, "반려견 사료")
        self.assertEqual(recommendations[0].category, "사료")
        self.assertEqual(recommendations[0].source_record_ids, ("record-1",))

    def test_returns_empty_without_agent_category_requests(self) -> None:
        client = FakeShoppingClient()
        provider = ShoppingRecommendationProvider(client)
        record = PetRecord(
            id="record-1",
            pet_id="pet-1",
            category="stool",
            title="배변",
            detail="산책 중 배변했어요.",
            status="normal",
            recorded_at="2026-05-11T08:00:00Z",
            source="manual",
        )

        recommendations = provider.recommend(PetProfile(id="pet-1", name="초코", species="dog"), "배변 기록", (record,))

        self.assertEqual(recommendations, ())
        self.assertEqual(client.searches, [])

    def test_searches_once_for_duplicate_queries(self) -> None:
        client = FakeShoppingClient()
        provider = ShoppingRecommendationProvider(client)
        records = (
            PetRecord(
                id="record-1",
                pet_id="pet-1",
                category="meal",
                title="아침 식사",
                detail="사료를 조금 남겼어요.",
                status="notice",
                recorded_at="2026-05-11T08:00:00Z",
                source="manual",
            ),
            PetRecord(
                id="record-2",
                pet_id="pet-1",
                category="meal",
                title="저녁 식사",
                detail="밥을 천천히 먹었어요.",
                status="normal",
                recorded_at="2026-05-11T18:00:00Z",
                source="manual",
            ),
        )

        recommendations = provider.recommend(
            PetProfile(id="pet-1", name="초코", species="dog"),
            "식사 기록",
            records,
            category_requests=(
                ShoppingCategoryRequest(
                    query="반려견 사료",
                    category="사료",
                    reason="아침 식사 기록",
                    source_record_ids=("record-1",),
                ),
                ShoppingCategoryRequest(
                    query="반려견 사료",
                    category="사료",
                    reason="저녁 식사 기록",
                    source_record_ids=("record-2",),
                ),
            ),
        )

        self.assertEqual(len(client.searches), 1)
        self.assertEqual(client.searches[0][0], "반려견 사료")
        self.assertEqual(client.searches[0][2], ("record-1", "record-2"))
        self.assertEqual(recommendations[0].source_record_ids, ("record-1", "record-2"))

    def test_skips_non_dog_context(self) -> None:
        client = FakeShoppingClient()
        provider = ShoppingRecommendationProvider(client)
        record = PetRecord(
            id="record-1",
            pet_id="pet-1",
            category="meal",
            title="아침 식사",
            detail="사료를 조금 남겼어요.",
            status="notice",
            recorded_at="2026-05-11T08:00:00Z",
            source="manual",
        )

        recommendations = provider.recommend(PetProfile(id="pet-1", name="나비", species="cat"), "식사 기록", (record,))

        self.assertEqual(recommendations, ())
        self.assertEqual(client.searches, [])

    def test_naver_client_returns_empty_without_credentials(self) -> None:
        client = NaverShoppingClient(
            NaverShoppingConfig(
                client_id="",
                client_secret="",
            )
        )

        self.assertEqual(client.search("반려견 사료", reason="기록 기반 추천", source_record_ids=("record-1",)), ())

    def test_naver_client_ignores_placeholder_credentials(self) -> None:
        client = NaverShoppingClient(
            NaverShoppingConfig(
                client_id="your-naver-client-id",
                client_secret="your-naver-client-secret",
            )
        )

        with patch("infrastructure.shopping.naver_shopping.urlopen") as urlopen:
            recommendations = client.search("반려견 사료", reason="기록 기반 추천", source_record_ids=("record-1",))

        self.assertEqual(recommendations, ())
        urlopen.assert_not_called()

    def test_naver_client_logs_http_error_details(self) -> None:
        client = NaverShoppingClient(
            NaverShoppingConfig(
                client_id="id",
                client_secret="secret",
            )
        )
        error = HTTPError(
            url="https://openapi.naver.com/v1/search/shop.json",
            code=401,
            msg="Unauthorized",
            hdrs=None,
            fp=BytesIO(b'{"errorCode":"024","errorMessage":"Authentication failed"}'),
        )

        with (
            patch("infrastructure.shopping.naver_shopping.urlopen", side_effect=error),
            self.assertLogs("infrastructure.shopping.naver_shopping", level="WARNING") as logs,
        ):
            recommendations = client.search("반려견 사료", reason="기록 기반 추천", source_record_ids=("record-1",))

        self.assertEqual(recommendations, ())
        self.assertIn("status=401", logs.output[0])
        self.assertIn("Authentication failed", logs.output[0])

    def test_naver_client_skips_calls_during_rate_limit_cooldown(self) -> None:
        now = 100.0

        def clock() -> float:
            return now

        client = NaverShoppingClient(
            NaverShoppingConfig(
                client_id="id",
                client_secret="secret",
                rate_limit_cooldown_seconds=60.0,
            ),
            clock=clock,
        )
        error = HTTPError(
            url="https://openapi.naver.com/v1/search/shop.json",
            code=429,
            msg="Too Many Requests",
            hdrs=None,
            fp=BytesIO(b'{"errorCode":"012","errorMessage":"Rate limit exceeded"}'),
        )

        with patch("infrastructure.shopping.naver_shopping.urlopen", side_effect=error) as urlopen:
            self.assertEqual(client.search("반려견 사료", reason="기록 기반 추천", source_record_ids=("record-1",)), ())
            self.assertEqual(client.search("반려견 장난감", reason="기록 기반 추천", source_record_ids=("record-2",)), ())

        self.assertEqual(urlopen.call_count, 1)

    def test_naver_client_reuses_cached_successful_response(self) -> None:
        now = 100.0

        def clock() -> float:
            return now

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def read(self) -> bytes:
                return (
                    b'{"items":[{"title":"<b>sample</b> food","link":"https://example.com/item",'
                    b'"image":"https://example.com/item.jpg","mallName":"mall","lprice":"9900"}]}'
                )

        client = NaverShoppingClient(
            NaverShoppingConfig(
                client_id="id",
                client_secret="secret",
                cache_ttl_seconds=300.0,
            ),
            clock=clock,
        )

        with patch("infrastructure.shopping.naver_shopping.urlopen", return_value=FakeResponse()) as urlopen:
            first = client.search("반려견 사료", reason="첫 추천", source_record_ids=("record-1",))
            second = client.search("반려견 사료", reason="두 번째 추천", source_record_ids=("record-2",))

        self.assertEqual(urlopen.call_count, 1)
        self.assertEqual(first[0].source_record_ids, ("record-1",))
        self.assertEqual(second[0].source_record_ids, ("record-2",))
        self.assertEqual(second[0].reason, "두 번째 추천")

    def test_naver_client_maps_json_response(self) -> None:
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

            def read(self) -> bytes:
                return (
                    b'{"items":[{"title":"<b>sample</b> food","link":"https://example.com/item",'
                    b'"image":"https://example.com/item.jpg","mallName":"mall","lprice":"9900"}]}'
                )

        client = NaverShoppingClient(
            NaverShoppingConfig(
                client_id="id",
                client_secret="secret",
            )
        )

        with patch("infrastructure.shopping.naver_shopping.urlopen", return_value=FakeResponse()):
            recommendations = client.search("반려견 사료", reason="기록 기반 추천", source_record_ids=("record-1",))

        self.assertEqual(recommendations[0].title, "sample food")
        self.assertEqual(recommendations[0].lowest_price, 9900)
        self.assertEqual(recommendations[0].source_record_ids, ("record-1",))


if __name__ == "__main__":
    unittest.main()
