from __future__ import annotations

import unittest

from domain.models import PetProfile, PetRecord, ShoppingCategoryRequest, ShoppingRecommendation
from middleware import ShoppingFallbackMiddleware, build_fallback_shopping_recommendations


class EmptyShoppingProvider:
    def recommend(self, pet: PetProfile, text: str, records: tuple[PetRecord, ...], **kwargs):
        return ()


class FailingShoppingProvider:
    def recommend(self, pet: PetProfile, text: str, records: tuple[PetRecord, ...], **kwargs):
        raise RuntimeError("shopping provider unavailable")


class ResultShoppingProvider:
    def recommend(self, pet: PetProfile, text: str, records: tuple[PetRecord, ...], **kwargs):
        return (
            ShoppingRecommendation(
                title="실제 상품",
                product_url="https://shopping.example/item",
                image_url="https://shopping.example/item.jpg",
                mall_name="sample mall",
                lowest_price=1000,
                query="반려견 사료",
                reason="실제 네이버 쇼핑 결과",
                source_record_ids=("record-1",),
            ),
        )


class TestShoppingFallbackMiddleware(unittest.TestCase):
    def test_fallback_recommends_basic_search_when_provider_returns_empty(self) -> None:
        recommendation = ShoppingFallbackMiddleware(EmptyShoppingProvider()).recommend(
            _dog_pet(),
            "반려견이 사료를 남겼어요.",
            (_record(category="meal", title="식사 기록", detail="사료를 남겼어요."),),
        )[0]

        self.assertEqual(recommendation.title, "반려견 사료 검색")
        self.assertEqual(recommendation.query, "반려견 사료")
        self.assertIn("search.shopping.naver.com", recommendation.product_url)
        self.assertEqual(recommendation.lowest_price, 0)

    def test_fallback_recommends_when_provider_raises(self) -> None:
        recommendation = ShoppingFallbackMiddleware(FailingShoppingProvider()).recommend(
            _dog_pet(),
            "배변봉투가 필요해요.",
            (_record(category="stool", title="배변 기록", detail="산책 중 배변했어요."),),
        )[0]

        self.assertEqual(recommendation.query, "반려견 배변봉투")
        self.assertEqual(recommendation.source_record_ids, ("record-1",))

    def test_does_not_use_rule_fallback_when_agent_category_was_supplied(self) -> None:
        recommendations = ShoppingFallbackMiddleware(EmptyShoppingProvider()).recommend(
            _dog_pet(),
            "반려견이 사료를 남겼어요.",
            (_record(category="meal", title="식사 기록", detail="사료를 남겼어요."),),
            category_requests=(ShoppingCategoryRequest(query="반려견 사료", category="사료"),),
        )

        self.assertEqual(recommendations, ())

    def test_keeps_real_provider_results(self) -> None:
        recommendations = ShoppingFallbackMiddleware(ResultShoppingProvider()).recommend(
            _dog_pet(),
            "반려견이 사료를 남겼어요.",
            (_record(category="meal", title="식사 기록", detail="사료를 남겼어요."),),
        )

        self.assertEqual(recommendations[0].title, "실제 상품")
        self.assertEqual(recommendations[0].lowest_price, 1000)

    def test_fallback_skips_non_dog_context(self) -> None:
        recommendations = build_fallback_shopping_recommendations(
            PetProfile(id="pet-1", name="나비", species="cat"),
            "사료를 남겼어요.",
            (_record(category="meal", title="식사 기록", detail="사료를 남겼어요."),),
        )

        self.assertEqual(recommendations, ())


def _dog_pet() -> PetProfile:
    return PetProfile(id="pet-1", name="초코", species="dog")


def _record(*, category: str, title: str, detail: str) -> PetRecord:
    return PetRecord(
        id="record-1",
        pet_id="pet-1",
        category=category,
        title=title,
        detail=detail,
        status="normal",
        recorded_at="2026-05-11T08:00:00Z",
        source="manual",
    )


if __name__ == "__main__":
    unittest.main()
