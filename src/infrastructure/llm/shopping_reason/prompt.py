from __future__ import annotations

import json

from domain.models import CareSuggestion, PetProfile, PetRecord, ShoppingRecommendation
from domain.record_labels import record_category_label, record_status_label


def build_shopping_category_messages(
    pet: PetProfile,
    text: str,
    records: tuple[PetRecord, ...],
    suggestions: tuple[CareSuggestion, ...],
) -> list[tuple[str, str]]:
    return [
        ("system", shopping_category_system_prompt()),
        ("user", shopping_category_user_prompt(pet, text, records, suggestions)),
    ]


def build_shopping_selection_messages(
    pet: PetProfile,
    text: str,
    records: tuple[PetRecord, ...],
    suggestions: tuple[CareSuggestion, ...],
    query: str,
    candidates: tuple[ShoppingRecommendation, ...],
) -> list[tuple[str, str]]:
    return [
        ("system", shopping_selection_system_prompt()),
        ("user", shopping_selection_user_prompt(pet, text, records, suggestions, query, candidates)),
    ]


def build_shopping_reason_messages(
    pet: PetProfile,
    recommendation: ShoppingRecommendation,
    source_records: tuple[PetRecord, ...],
) -> list[tuple[str, str]]:
    return build_shopping_selection_messages(
        pet,
        "",
        source_records,
        (),
        recommendation.query,
        (recommendation,),
    )


def shopping_category_system_prompt() -> str:
    return (
        "당신은 반려동물 케어 쇼핑 추천 카테고리 에이전트입니다. "
        "보호자의 반려동물 프로필, 기록, 케어 제안을 함께 보고 네이버 쇼핑에 검색할 상품군을 정하세요. "
        "규칙 기반 매핑처럼 기록 카테고리를 그대로 상품군으로 바꾸지 말고, 실제 도움이 되는 근거가 있을 때만 고르세요. "
        "1개만 고르고, 각 항목은 네이버 쇼핑 검색에 바로 쓸 짧은 한국어 query를 포함하세요. "
        "출력은 JSON 객체 하나만 허용합니다."
    )


def shopping_selection_system_prompt() -> str:
    return (
        "당신은 반려동물 케어 쇼핑 추천 선택 에이전트입니다. "
        "네이버 쇼핑 검색 결과 Top 3 후보 중 프로필, 기록, 케어 제안에 가장 잘 맞는 상품 하나를 선택하세요. "
        "가격만으로 고르지 말고 반려동물 특성과 최근 기록의 근거를 함께 고려하세요. "
        "추천 이유는 한국어 한 문장, 120자 이내로 쓰고 과장, 구매 강요, 진단/치료 단정은 피하세요. "
        "출력은 JSON 객체 하나만 허용합니다."
    )


def shopping_category_user_prompt(
    pet: PetProfile,
    text: str,
    records: tuple[PetRecord, ...],
    suggestions: tuple[CareSuggestion, ...],
) -> str:
    return json.dumps(
        {
            "task": "choose_shopping_categories",
            "pet_profile": _pet_payload(pet),
            "input_text": text,
            "records": [_record_payload(record) for record in records],
            "suggestions": [_suggestion_payload(suggestion) for suggestion in suggestions],
            "output_schema": {
                "queries": [
                    {
                        "query": "반려견 사료",
                        "category": "사료",
                        "reason": "이 상품군을 검색해야 하는 짧은 근거",
                        "source_record_ids": ["record id"],
                    }
                ]
            },
            "constraints": {
                "max_queries": 1,
                "query_language": "ko",
                "query_should_be": "Naver Shopping search phrase",
                "empty_if_no_relevant_need": True,
            },
        },
        ensure_ascii=False,
    )


def shopping_selection_user_prompt(
    pet: PetProfile,
    text: str,
    records: tuple[PetRecord, ...],
    suggestions: tuple[CareSuggestion, ...],
    query: str,
    candidates: tuple[ShoppingRecommendation, ...],
) -> str:
    return json.dumps(
        {
            "task": "select_one_product_from_top_3",
            "query": query,
            "pet_profile": _pet_payload(pet),
            "input_text": text,
            "records": [_record_payload(record) for record in records],
            "suggestions": [_suggestion_payload(suggestion) for suggestion in suggestions],
            "top_3_candidates": [_candidate_payload(candidate) for candidate in candidates[:3]],
            "output_schema": {
                "product_url": "chosen candidate product_url",
                "reason": "한국어 한 문장 추천 이유",
            },
            "constraints": {
                "choose_only_from_candidates": True,
                "reason_max_length": "120 Korean characters",
                "must_use": ["pet profile", "records or suggestions", "candidate info"],
                "must_not_use": ["raw JSON", "bullets", "medical certainty", "purchase pressure"],
            },
        },
        ensure_ascii=False,
    )


def shopping_reason_system_prompt() -> str:
    return shopping_selection_system_prompt()


def shopping_reason_user_prompt(
    pet: PetProfile,
    recommendation: ShoppingRecommendation,
    source_records: tuple[PetRecord, ...],
) -> str:
    return shopping_selection_user_prompt(pet, "", source_records, (), recommendation.query, (recommendation,))


def _pet_payload(pet: PetProfile) -> dict[str, object]:
    return {
        "id": pet.id,
        "name": pet.name,
        "breed": pet.breed,
        "species": pet.species,
        "age_label": pet.age_label,
        "sex_label": pet.sex_label,
        "weight_label": pet.weight_label,
        "personality": pet.personality,
        "notes": list(pet.notes),
    }


def _record_payload(record: PetRecord) -> dict[str, object]:
    return {
        "id": record.id,
        "category": record.category,
        "category_label": record_category_label(record.category),
        "title": record.title,
        "detail": record.detail,
        "status": record.status,
        "status_label": record_status_label(record.status),
        "recorded_at": record.recorded_at,
        "source": record.source,
    }


def _suggestion_payload(suggestion: CareSuggestion) -> dict[str, object]:
    return {
        "title": suggestion.title,
        "action": suggestion.action,
        "reason": suggestion.reason,
        "source_record_ids": list(suggestion.source_record_ids),
    }


def _candidate_payload(candidate: ShoppingRecommendation) -> dict[str, object]:
    return {
        "id": candidate.id,
        "category": candidate.category,
        "title": candidate.title,
        "detail": candidate.detail,
        "query": candidate.query,
        "product_url": candidate.product_url,
        "image_url": candidate.image_url,
        "mall_name": candidate.mall_name,
        "lowest_price": candidate.lowest_price,
        "source_record_ids": list(candidate.source_record_ids),
    }
