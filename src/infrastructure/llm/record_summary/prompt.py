from __future__ import annotations

import json

from domain.models import ContextAnalysisResult, PetProfile, PetRecord, PlannedReminder
from infrastructure.llm.record_summary.mapper import context_payload, due_item_payload, pet_payload, record_payload


def build_record_summary_messages(
    pet: PetProfile,
    records: tuple[PetRecord, ...],
    context: ContextAnalysisResult,
    due_items: tuple[PlannedReminder, ...],
) -> list[tuple[str, str]]:
    return [
        ("system", record_summary_system_prompt()),
        ("user", record_summary_user_prompt(pet, records, context, due_items)),
    ]


def record_summary_system_prompt() -> str:
    return (
        "반려동물 기록을 보호자가 이해하기 쉬운 한국어로 요약하세요. "
        "진단을 단정하지 마세요. 위험 신호가 있으면 safety_notice로 분리하고 "
        "병원 상담이 필요한 가능성만 조심스럽게 표현하세요."
    )


def record_summary_user_prompt(
    pet: PetProfile,
    records: tuple[PetRecord, ...],
    context: ContextAnalysisResult,
    due_items: tuple[PlannedReminder, ...],
) -> str:
    return (
        "다음 데이터를 기반으로 RecordSummaryResult 형식의 요약을 작성하세요. "
        "입력 record id를 record_ids에 보존하세요.\n\n"
        + json.dumps(
            {
                "pet": pet_payload(pet),
                "records": [record_payload(record) for record in records],
                "context": context_payload(context),
                "due_items": [due_item_payload(item) for item in due_items],
            },
            ensure_ascii=False,
        )
    )
