from __future__ import annotations

import json

from application.dto import PetLogAgentInput
from infrastructure.llm.record_structuring.mapper import allowed_values_payload, input_payload


def build_record_structuring_messages(input: PetLogAgentInput) -> list[tuple[str, str]]:
    return [
        ("system", record_structuring_system_prompt()),
        ("user", record_structuring_user_prompt(input)),
    ]


def record_structuring_system_prompt() -> str:
    return (
        "반려동물 기록 입력을 저장 전 후보로 구조화하세요. "
        "여러 사건이 섞이면 후보를 나누세요. "
        "관찰된 사실만 기록하고 진단을 단정하지 마세요. "
        "확신이 낮거나 보호자 확인이 필요한 내용은 needs_confirmation을 true로 설정하세요."
    )


def record_structuring_user_prompt(input: PetLogAgentInput) -> str:
    return (
        "다음 입력을 StructuredRecordBatch 형식으로 변환하세요. "
        "category와 status는 allowed_values에 있는 값만 사용하세요.\n\n"
        + json.dumps(
            {
                "input": input_payload(input),
                "allowed_values": allowed_values_payload(),
                "measurement_policy": [
                    "measurements에는 원문에 명시된 시간, 양, 횟수, 무게, 지속 시간, 반복 급여량을 빠짐없이 담으세요.",
                    "한국어 수량 표현은 의미를 보존해 표준 형태로 정리하세요. 예: 한 번=1회, 두 번=2회, 세 번=3회.",
                    "반복 표현은 단순 수치 하나로 줄이지 말고 전체 의미를 담으세요. 예: 사료는 10g씩 세 번 먹었어 -> 10g씩 3회.",
                    "행동 카테고리(behavior)는 숫자가 없어도 원문에 명시된 정확한 행동 단어를 measurements에 담으세요. 행동이라고만 쓰지 말고 짖음, 숨음, 기다림, 맴돌기처럼 어떤 행동인지 명시하세요.",
                    "보호자 입력에 없는 측정값은 만들지 마세요.",
                ],
                "classification_policy": [
                    "stool 후보는 실제 배변/소변/대변 발생, 횟수, 상태, 색, 양, 설사/구토처럼 배변 사건이 명시될 때만 만드세요.",
                    "배변 단어가 행동의 배경, 장소, 도구, 훈련 맥락으로만 나오면 별도 stool 후보를 만들지 말고 behavior 후보 하나로 유지하세요.",
                    "예: 배변 패드 주변을 맴돌고 낑낑댔어 -> behavior만 생성, stool 후보 생성 금지.",
                    "행동 패턴과 실제 배변 사건이 모두 명확히 있을 때만 behavior와 stool을 분리하세요.",
                ],
                "splitting_examples": [
                    {
                        "text": (
                            "오늘 오전 8시에 초코가 사료 40g 중 15g만 먹고, "
                            "저녁 산책은 12분만 했고, 오른쪽 귀를 5번 긁었어."
                        ),
                        "candidates": [
                            {
                                "category": "meal",
                                "title": "식사",
                                "detail": "오전 8시에 사료 40g 중 15g만 먹음",
                                "measurements": ["오전 8시", "사료 40g", "섭취 15g"],
                            },
                            {
                                "category": "walk",
                                "title": "산책",
                                "detail": "저녁 산책을 12분만 함",
                                "measurements": ["12분"],
                            },
                            {
                                "category": "medical",
                                "title": "귀 긁음",
                                "detail": "오른쪽 귀를 5번 긁음",
                                "measurements": ["오른쪽 귀", "5번"],
                            },
                        ],
                    },
                    {
                        "text": "오늘 꾸꾸가 10분 정도 산책하고, 배변은 세 번 했고, 사료는 10g씩 세 번 먹었어.",
                        "candidates": [
                            {
                                "category": "walk",
                                "title": "산책",
                                "detail": "10분 정도 산책함",
                                "measurements": ["10분"],
                            },
                            {
                                "category": "stool",
                                "title": "배변",
                                "detail": "배변을 세 번 함",
                                "measurements": ["3회"],
                            },
                            {
                                "category": "meal",
                                "title": "식사",
                                "detail": "사료를 10g씩 세 번 먹음",
                                "measurements": ["10g씩 3회"],
                            },
                        ],
                    },
                    {
                        "text": "초인종 소리에 꾸꾸가 계속 짖었고, 현관 앞에서 기다렸어.",
                        "candidates": [
                            {
                                "category": "behavior",
                                "title": "초인종 반응",
                                "detail": "초인종 소리에 계속 짖고 현관 앞에서 기다림",
                                "measurements": ["짖음", "기다림"],
                            },
                        ],
                    },
                    {
                        "text": "배변 패드 주변을 맴돌고 낑낑댔어.",
                        "candidates": [
                            {
                                "category": "behavior",
                                "title": "배변 패드 주변 행동",
                                "detail": "배변 패드 주변을 맴돌고 낑낑댐",
                                "measurements": ["맴돌기", "낑낑댐"],
                            },
                        ],
                    },
                ],
            },
            ensure_ascii=False,
        )
    )
