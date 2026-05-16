from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class StructuredRecordCandidateOutput(BaseModel):
    title: str = Field(
        description="짧은 기록 제목. 예: 식사, 산책, 배변 상태, 귀 상태 확인, 낯선 소리 반응"
    )
    detail: str = Field(
        description="보호자 입력을 관찰 사실 중심으로 정리한 상세 내용. 진단이나 원인 단정은 포함하지 않는다."
    )
    category: Literal["meal", "walk", "stool", "medical", "behavior"] = Field(
        description="기록 분류. 식사=meal, 산책=walk, 배변=stool, 건강/진료 관련 관찰=medical, 행동 변화=behavior"
    )
    status: Literal["normal", "notice", "alert"] = Field(
        description="기록 상태. normal=일반 기록, notice=지켜볼 필요가 있는 기록, alert=주의가 필요한 신호"
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="구조화 결과 신뢰도. 원문이 명확하면 1.0에 가깝고, 애매하면 낮게 설정한다.",
    )
    needs_confirmation: bool = Field(
        description="내용이 모호하거나 저장 전 보호자 확인이 필요하면 true"
    )
    measurements: list[str] = Field(
        description=(
            "원문에 명시된 시간, 양, 횟수, 무게, 지속 시간, 반복 급여량 같은 측정값 목록. "
            "한국어 횟수 표현은 3회처럼 표준화하고, 10g씩 세 번 같은 반복 표현은 10g씩 3회처럼 의미를 보존한다. "
            "behavior 카테고리는 원문에 명시된 정확한 행동 단어를 짖음, 숨음, 기다림처럼 담는다. "
            "없으면 빈 배열"
        )
    )


class StructuredRecordBatchOutput(BaseModel):
    candidates: list[StructuredRecordCandidateOutput] = Field(
        description="입력 문장에서 분리한 저장 전 기록 후보 목록. 여러 사건이 섞이면 후보를 여러 개 만든다."
    )
