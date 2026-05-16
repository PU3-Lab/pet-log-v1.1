from __future__ import annotations

from dataclasses import replace

from domain.models import CareSuggestion, PetProfile, PetRecord, ShoppingCategoryRequest, ShoppingRecommendation


class ShoppingRecommendationProvider:
    def __init__(self, shopping_client) -> None:
        self._shopping_client = shopping_client

    def recommend(
        self,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        *,
        category_requests: tuple[ShoppingCategoryRequest, ...] = (),
        suggestions: tuple[CareSuggestion, ...] = (),
    ) -> tuple[ShoppingRecommendation, ...]:
        if not category_requests:
            return ()

        recommendations: list[ShoppingRecommendation] = []
        seen_urls: set[str] = set()
        for category_request in _unique_category_requests(category_requests):
            items = self._shopping_client.search(
                category_request.query,
                reason=category_request.reason or f"{category_request.category} 후보 상품",
                source_record_ids=category_request.source_record_ids,
            )
            for item in items:
                if item.product_url in seen_urls:
                    continue
                seen_urls.add(item.product_url)
                recommendations.append(
                    replace(
                        item,
                        category=category_request.category or item.category,
                        source_record_ids=category_request.source_record_ids or item.source_record_ids,
                    )
                )

        return tuple(recommendations)


def _unique_category_requests(
    category_requests: tuple[ShoppingCategoryRequest, ...],
) -> tuple[ShoppingCategoryRequest, ...]:
    grouped: dict[str, ShoppingCategoryRequest] = {}
    for category_request in category_requests:
        if category_request.query in grouped:
            grouped[category_request.query] = replace(
                grouped[category_request.query],
                source_record_ids=tuple(
                    dict.fromkeys(grouped[category_request.query].source_record_ids + category_request.source_record_ids)
                ),
            )
            continue
        grouped[category_request.query] = category_request
    return tuple(grouped.values())
