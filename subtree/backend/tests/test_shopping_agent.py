from __future__ import annotations

import unittest
from unittest.mock import patch

from application.agents.shopping import ShoppingAgent, ShoppingRecommendationAgent
from domain.models import (
    CareSuggestion,
    PetProfile,
    PetRecord,
    ShoppingCategoryRequest,
    ShoppingRecommendation,
    ShoppingSelectionResult,
)
from infrastructure.llm.shopping_reason import build_shopping_category_messages, build_shopping_selection_messages
from infrastructure.llm.shopping_reason.provider import ShoppingReasonProvider


class FakeRecommendationProvider:
    def __init__(self) -> None:
        self.handled_category_requests = ()
        self.handled_suggestions = ()

    def recommend(
        self,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        *,
        category_requests: tuple[ShoppingCategoryRequest, ...] = (),
        suggestions: tuple[CareSuggestion, ...] = (),
    ) -> tuple[ShoppingRecommendation, ...]:
        self.handled_category_requests = category_requests
        self.handled_suggestions = suggestions
        if not category_requests:
            return ()
        request = category_requests[0]
        return (
            _recommendation("food-1", "https://shopping.example/products/food-1", request),
            _recommendation("food-2", "https://shopping.example/products/food-2", request),
            _recommendation("food-3", "https://shopping.example/products/food-3", request),
        )


class FakeShoppingRecommendationProvider:
    def __init__(self) -> None:
        self.handled_pet = None
        self.handled_records = ()
        self.handled_suggestions = ()
        self.handled_candidates = ()

    def category_requests_for(
        self,
        *,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
    ) -> tuple[ShoppingCategoryRequest, ...]:
        self.handled_pet = pet
        self.handled_records = records
        self.handled_suggestions = suggestions
        return (
            ShoppingCategoryRequest(
                query="반려견 사료",
                category="사료",
                reason="식사 기록과 케어 제안 기반",
                source_record_ids=("record-1",),
            ),
        )

    def select_recommendation(
        self,
        *,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
        query: str,
        candidates: tuple[ShoppingRecommendation, ...],
    ) -> ShoppingSelectionResult:
        self.handled_candidates = candidates
        return ShoppingSelectionResult(
            product_url="https://shopping.example/products/food-2",
            reason=f"{pet.name}의 식사 기록과 제안을 함께 보면 급여 관리에 맞는 후보예요.",
        )


class FailingSelectionProvider(FakeShoppingRecommendationProvider):
    def select_recommendation(
        self,
        *,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
        query: str,
        candidates: tuple[ShoppingRecommendation, ...],
    ) -> ShoppingSelectionResult:
        raise RuntimeError("selection provider unavailable")


class FailingCategoryProvider(FakeShoppingRecommendationProvider):
    def category_requests_for(
        self,
        *,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        suggestions: tuple[CareSuggestion, ...],
    ) -> tuple[ShoppingCategoryRequest, ...]:
        raise RuntimeError("category provider unavailable")


class TestShoppingAgent(unittest.TestCase):
    def test_agent_controls_category_search_and_final_selection(self) -> None:
        recommendation_provider = FakeRecommendationProvider()
        recommendation_agent_provider = FakeShoppingRecommendationProvider()
        recommendation_agent = ShoppingRecommendationAgent(recommendation_agent_provider)
        agent = ShoppingAgent(recommendation_provider, recommendation_agent=recommendation_agent)
        record = _meal_record()
        suggestion = CareSuggestion(
            title="식사 관리",
            action="식사량을 꾸준히 확인하세요.",
            reason="최근 식사 기록이 있어요.",
            source_record_ids=("record-1",),
        )

        recommendations = agent.recommend(
            PetProfile(
                id="pet-1",
                name="꾸꾸",
                breed="말티즈",
                species="dog",
                weight_label="3.4kg",
                notes=("짖음 정도: 도어락 소리에 많이 짖음", "좋아하는 것: 만져주는 것, 애착 인형"),
            ),
            "식사 기록",
            (record,),
            (suggestion,),
        )

        self.assertEqual(recommendation_provider.handled_category_requests[0].query, "반려견 사료")
        self.assertEqual(recommendation_provider.handled_suggestions, (suggestion,))
        self.assertEqual(recommendation_agent_provider.handled_pet.name, "꾸꾸")
        self.assertEqual(recommendation_agent_provider.handled_records, (record,))
        self.assertEqual(recommendation_agent_provider.handled_suggestions, (suggestion,))
        self.assertEqual(len(recommendation_agent_provider.handled_candidates), 3)
        self.assertEqual(recommendations[0].product_url, "https://shopping.example/products/food-2")
        self.assertIn("급여 관리", recommendations[0].reason)

    def test_keeps_first_candidate_when_selection_agent_fails(self) -> None:
        recommendation_agent = ShoppingRecommendationAgent(FailingSelectionProvider())
        agent = ShoppingAgent(FakeRecommendationProvider(), recommendation_agent=recommendation_agent)

        recommendations = agent.recommend(
            PetProfile(id="pet-1", name="꾸꾸", breed="말티즈", species="dog", weight_label="3.4kg"),
            "식사 기록",
            (_meal_record(),),
        )

        self.assertEqual(recommendations[0].product_url, "https://shopping.example/products/food-1")
        self.assertEqual(recommendations[0].reason, "식사 기록과 케어 제안 기반")

    def test_returns_empty_when_category_agent_fails(self) -> None:
        recommendation_agent = ShoppingRecommendationAgent(FailingCategoryProvider())
        agent = ShoppingAgent(FakeRecommendationProvider(), recommendation_agent=recommendation_agent)

        recommendations = agent.recommend(
            PetProfile(id="pet-1", name="꾸꾸", breed="말티즈", species="dog", weight_label="3.4kg"),
            "식사 기록",
            (_meal_record(),),
        )

        self.assertEqual(recommendations, ())

    def test_shopping_prompts_control_category_and_selection_workflow(self) -> None:
        record = _meal_record()
        suggestion = CareSuggestion(
            title="식사 관리",
            action="식사량을 꾸준히 확인하세요.",
            reason="최근 식사 기록이 있어요.",
            source_record_ids=("record-1",),
        )
        pet = PetProfile(
            id="pet-1",
            name="꾸꾸",
            breed="말티즈",
            species="dog",
            weight_label="3.4kg",
            notes=("짖음 정도: 도어락 소리에 많이 짖음", "좋아하는 것: 만져주는 것, 애착 인형"),
        )
        request = ShoppingCategoryRequest(query="반려견 사료", category="사료", source_record_ids=("record-1",))
        candidates = (
            _recommendation("food-1", "https://shopping.example/products/food-1", request),
            _recommendation("food-2", "https://shopping.example/products/food-2", request),
            _recommendation("food-3", "https://shopping.example/products/food-3", request),
        )

        category_messages = build_shopping_category_messages(pet, "식사 기록", (record,), (suggestion,))
        selection_messages = build_shopping_selection_messages(pet, "식사 기록", (record,), (suggestion,), "반려견 사료", candidates)

        self.assertIn("쇼핑 추천 카테고리 에이전트", category_messages[0][1])
        self.assertIn("choose_shopping_categories", category_messages[1][1])
        self.assertIn("suggestions", category_messages[1][1])
        self.assertIn("도어락 소리에 많이 짖음", category_messages[1][1])
        self.assertIn("Top 3 후보 중", selection_messages[0][1])
        self.assertIn("select_one_product_from_top_3", selection_messages[1][1])
        self.assertIn("https://shopping.example/products/food-2", selection_messages[1][1])

    def test_shopping_provider_uses_env_timeout(self) -> None:
        created: list[dict[str, object]] = []

        def fake_model_factory(model: str, api_key: str, timeout: float):
            created.append({"model": model, "api_key": api_key, "timeout": timeout})
            return FakeChatModel()

        with patch.dict(
            "os.environ",
            {"OPENAI_API_KEY": "test-key", "OPENAI_SHOPPING_REASON_TIMEOUT": "120"},
            clear=True,
        ):
            provider = ShoppingReasonProvider(model_factory=fake_model_factory)
            provider.category_requests_for(
                pet=PetProfile(id="pet-1", name="꾸꾸"),
                text="식사 기록",
                records=(_meal_record(),),
                suggestions=(),
            )

        self.assertEqual(created[0]["timeout"], 120.0)


class FakeChatModel:
    def invoke(self, messages):
        return '{"queries":[]}'


def _meal_record() -> PetRecord:
    return PetRecord(
        id="record-1",
        pet_id="pet-1",
        category="meal",
        title="식사",
        detail="정상적으로 먹었어요.",
        status="normal",
        recorded_at="2026-05-11T08:00:00Z",
        source="manual",
    )


def _recommendation(
    item_id: str,
    product_url: str,
    request: ShoppingCategoryRequest,
) -> ShoppingRecommendation:
    return ShoppingRecommendation(
        id=item_id,
        category=request.category,
        title=f"{request.query} {item_id}",
        detail="샘플몰 · 최저가 12,000원",
        product_url=product_url,
        image_url=f"{product_url}.jpg",
        mall_name="샘플몰",
        lowest_price=12000,
        query=request.query,
        reason=request.reason,
        source_record_ids=request.source_record_ids,
        tone="green",
    )


if __name__ == "__main__":
    unittest.main()
