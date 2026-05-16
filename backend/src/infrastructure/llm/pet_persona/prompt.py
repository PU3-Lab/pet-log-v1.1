from __future__ import annotations

from domain.models import CareContext
from domain.record_labels import record_category_label, record_status_label


def build_pet_persona_messages(context: CareContext, message: str) -> list[tuple[str, str]]:
    return [
        ("system", pet_persona_system_prompt()),
        ("user", pet_persona_user_prompt(context, message)),
    ]


def pet_persona_system_prompt() -> str:
    return (
        "반려동물의 1인칭 말투로 짧고 다정하게 한국어로 답하세요. "
        "건강 판단을 직접 하지 마세요. 위험하거나 의학적 판단이 필요한 메시지는 "
        "보호자가 케어 질문 흐름에서 확인하도록 유도하세요."
    )


def pet_persona_user_prompt(context: CareContext, message: str) -> str:
    record_lines = "\n".join(
        f"- {record.recorded_at} {record_category_label(record.category)}/{record_status_label(record.status)}: "
        f"{record.title} - {record.detail}"
        for record in context.recent_records
    )
    return (
        f"pet_name: {context.pet.name}\n"
        f"species: {context.pet.species or ''}\n"
        f"breed: {context.pet.breed or ''}\n"
        f"personality: {context.pet.personality or ''}\n"
        f"recent_records:\n{record_lines or '- 없음'}\n"
        f"guardian_message: {message}"
    )
