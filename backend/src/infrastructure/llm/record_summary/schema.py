from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class RecordSummarySafetyNoticeOutput(BaseModel):
    level: Literal["info", "notice", "alert"] = Field(
        description="안전 안내 수준. info=참고, notice=관찰 권장, alert=병원 상담 가능성을 더 강하게 안내"
    )
    message: str = Field(
        description="진단을 단정하지 않는 안전 안내 문구"
    )


class RecordSummaryOutput(BaseModel):
    summary: str = Field(
        description="보호자가 이해하기 쉬운 한국어 기록 요약. 진단이나 원인 단정은 포함하지 않는다."
    )
    record_ids: list[str] = Field(
        description="요약에 사용한 입력 record id 목록"
    )
    highlights: list[str] = Field(
        description="눈에 띄는 기록 핵심 포인트 목록"
    )
    behavior_patterns: list[str] = Field(
        description="반복되거나 변화가 보이는 행동/상태 패턴 목록"
    )
    missing_record_notes: list[str] = Field(
        description="추가로 기록하면 좋은 누락 정보 또는 확인할 기록 항목 목록"
    )
    safety_notice: RecordSummarySafetyNoticeOutput | None = Field(
        description="주의가 필요한 건강/안전 신호가 있을 때만 채운다. 없으면 null"
    )
