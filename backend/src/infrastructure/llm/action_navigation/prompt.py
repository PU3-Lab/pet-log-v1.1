from __future__ import annotations

import json

from domain.models import CareInsight, PetProfile, PetRecord, PlannedReminder
from infrastructure.llm.action_navigation.mapper import (
    due_item_payload,
    insight_payload,
    pet_payload,
    record_payload,
)


def build_action_navigation_messages(
    *,
    pet: PetProfile,
    insights: tuple[CareInsight, ...],
    records: tuple[PetRecord, ...],
    due_items: tuple[PlannedReminder, ...],
    fallback: str,
) -> list[tuple[str, str]]:
    return [
        ("system", action_navigation_system_prompt()),
        (
            "user",
            action_navigation_user_prompt(
                pet=pet,
                insights=insights,
                records=records,
                due_items=due_items,
                fallback=fallback,
            ),
        ),
    ]


def action_navigation_system_prompt() -> str:
    return (
        "당신은 반려동물 케어 카드의 이동 목적지를 결정하는 에이전트입니다. "
        "프론트엔드 문구나 고정 우선순위가 아니라 입력 데이터의 의미를 보고 판단하세요. "
        "허용된 앱 내부 경로만 선택하고, 외부 URL이나 존재하지 않는 경로를 만들지 마세요. "
        "예약, 접종, 일정, 리마인더 성격의 카드는 반드시 /schedule을 선택하세요. "
        "병원 상담, 진료, 건강 관찰, 수의사 확인이 자연스러운 카드는 /hospital을 선택하세요. "
        "구매, 사료, 용품, 영양제, 쇼핑이 자연스러운 카드는 /shopping을 선택하세요. "
        "어느 기능으로도 명확하지 않으면 입력 fallback 경로를 선택하세요. "
        "진단이나 원인을 단정하지 말고 이동 목적지만 결정하세요."
    )


def action_navigation_user_prompt(
    *,
    pet: PetProfile,
    insights: tuple[CareInsight, ...],
    records: tuple[PetRecord, ...],
    due_items: tuple[PlannedReminder, ...],
    fallback: str,
) -> str:
    return (
        "다음 데이터를 기반으로 ActionNavigationOutput 형식의 JSON을 작성하세요. "
        "각 insights 항목의 index마다 decisions에 정확히 하나의 결정을 포함하세요.\n\n"
        + json.dumps(
            {
                "allowed_routes": ["/hospital", "/schedule", "/shopping", fallback],
                "fallback": fallback,
                "pet": pet_payload(pet),
                "insights": [
                    insight_payload(index, insight)
                    for index, insight in enumerate(insights)
                ],
                "records": [record_payload(record) for record in records],
                "due_items": [due_item_payload(item) for item in due_items],
            },
            ensure_ascii=False,
        )
    )
