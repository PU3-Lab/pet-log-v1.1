from __future__ import annotations

import logging
from urllib.parse import quote

from domain.models import CareSuggestion, PetProfile, PetRecord, ShoppingCategoryRequest, ShoppingRecommendation


logger = logging.getLogger(__name__)

DOG_TERMS = ("강아지", "반려견", "애견", "댕댕", "멍멍")


class ShoppingFallbackMiddleware:
    def __init__(self, recommendation_provider) -> None:
        self._recommendation_provider = recommendation_provider

    def recommend(
        self,
        pet: PetProfile,
        text: str,
        records: tuple[PetRecord, ...],
        *,
        category_requests: tuple[ShoppingCategoryRequest, ...] = (),
        suggestions: tuple[CareSuggestion, ...] = (),
    ) -> tuple[ShoppingRecommendation, ...]:
        try:
            recommendations = self._recommendation_provider.recommend(
                pet,
                text,
                records,
                category_requests=category_requests,
                suggestions=suggestions,
            )
        except Exception as exc:
            logger.warning("shopping_recommendation_provider_failed error=%s", exc.__class__.__name__)
            recommendations = ()

        if recommendations:
            return recommendations
        if category_requests:
            return ()
        return build_fallback_shopping_recommendations(pet, text, records)


def build_fallback_shopping_recommendations(
    pet: PetProfile,
    text: str,
    records: tuple[PetRecord, ...],
) -> tuple[ShoppingRecommendation, ...]:
    if not records or not _is_dog_context(pet, text, records):
        return ()

    recommendations: list[ShoppingRecommendation] = []
    seen_queries: set[str] = set()
    for record in records:
        query = _query_for_record(text, record)
        if query is None or query in seen_queries:
            continue
        seen_queries.add(query)
        recommendations.append(_fallback_recommendation(query, record))
    return tuple(recommendations)


def _fallback_recommendation(query: str, record: PetRecord) -> ShoppingRecommendation:
    return ShoppingRecommendation(
        title=f"{query} 검색",
        product_url=f"https://search.shopping.naver.com/search/all?query={quote(query)}",
        image_url="",
        mall_name="네이버 쇼핑",
        lowest_price=0,
        query=query,
        reason=f"{record.title} 기록과 관련된 기본 쇼핑 검색 추천",
        source_record_ids=(record.id,),
        id=f"fallback:{query}",
        category=_category_for_query(query),
        detail="네이버 쇼핑 · 가격 확인 필요",
        tone="blue",
    )


def _is_dog_context(pet: PetProfile, text: str, records: tuple[PetRecord, ...]) -> bool:
    if (pet.species or "").lower() == "dog":
        return True
    haystack = " ".join((text, pet.breed or "", pet.personality or "", *pet.notes, *(_record_text(record) for record in records)))
    return any(term in haystack for term in DOG_TERMS)


def _query_for_record(text: str, record: PetRecord) -> str | None:
    haystack = f"{text} {_record_text(record)}"
    if "배변패드" in haystack or "패드" in haystack:
        return "반려견 배변패드"
    if "배변봉투" in haystack or record.category == "stool":
        return "반려견 배변봉투"
    if record.category == "meal" or _contains_any(haystack, ("사료", "밥", "급여", "간식")):
        return "반려견 사료"
    if record.category == "walk":
        return "반려견 산책용품"
    if record.category == "medical":
        return "반려견 영양제"
    if record.category == "behavior":
        return "반려견 장난감"
    return None


def _record_text(record: PetRecord) -> str:
    return f"{record.title} {record.detail}"


def _contains_any(value: str, terms: tuple[str, ...]) -> bool:
    return any(term in value for term in terms)


def _category_for_query(query: str) -> str:
    if "사료" in query or "간식" in query:
        return "사료"
    if "영양제" in query or "건강" in query:
        return "건강 용품"
    if "장난감" in query or "케어" in query:
        return "케어 용품"
    return "생활 용품"
