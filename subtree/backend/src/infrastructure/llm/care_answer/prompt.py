from __future__ import annotations

from domain.models import CareContext, CareKnowledgeHit
from domain.record_labels import record_category_label, record_status_label


def build_care_answer_messages(
    context: CareContext,
    question: str,
    knowledge_hits: tuple[CareKnowledgeHit, ...] = (),
) -> list[tuple[str, str]]:
    return [
        ("system", care_answer_system_prompt()),
        ("user", care_answer_user_prompt(context, question, knowledge_hits)),
    ]


def care_answer_system_prompt() -> str:
    return (
        "보호자의 반려동물 케어 질문에 한국어로 답하세요. "
        "진단을 단정하지 마세요. 위험하거나 의학적 판단이 필요한 내용은 "
        "병원 상담 가능성을 조심스럽게 안내하세요. "
        "모바일 패널에 표시되는 답변이므로 200자 이내로 답하세요. "
        "답변은 Markdown 형식으로 작성하고, 필요한 경우 짧은 bullet list를 사용하세요."
    )


def care_answer_user_prompt(
    context: CareContext,
    question: str,
    knowledge_hits: tuple[CareKnowledgeHit, ...] = (),
) -> str:
    record_lines = "\n".join(
        f"- {record.recorded_at} {record_category_label(record.category)}/{record_status_label(record.status)}: "
        f"{record.title} - {record.detail}"
        for record in context.recent_records
    )
    reminder_lines = "\n".join(
        f"- {item.due_date}: {item.title} ({item.reason})"
        for item in context.due_reminders
    )
    knowledge_section = ""
    if knowledge_hits:
        knowledge_lines = "\n".join(
            f"- {hit.chunk.title} ({hit.chunk.source_url}): {hit.chunk.text}"
            for hit in knowledge_hits
        )
        knowledge_section = f"care_knowledge:\n{knowledge_lines}\n"

    return (
        f"pet_name: {context.pet.name}\n"
        f"species: {context.pet.species or ''}\n"
        f"breed: {context.pet.breed or ''}\n"
        f"personality: {context.pet.personality or ''}\n"
        f"recent_records:\n{record_lines or '- 없음'}\n"
        f"due_reminders:\n{reminder_lines or '- 없음'}\n"
        f"{knowledge_section}"
        f"question: {question}"
    )
