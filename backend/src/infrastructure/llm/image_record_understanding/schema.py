from __future__ import annotations

from typing import Literal

from pydantic import BaseModel
from pydantic import Field


class ImageRecordUnderstandingOutput(BaseModel):
    title: str = Field(description="사진에서 관찰 가능한 기록 후보 제목")
    detail: str = Field(description="사진과 보호자 메모에서 관찰 가능한 내용. 진단 단정은 금지")
    category: Literal["meal", "walk", "stool", "medical", "behavior"] = Field(
        description="기록 카테고리"
    )
    status: Literal["normal", "notice", "alert"] = Field(
        description="관찰 상태. 불확실하거나 주의가 필요하면 notice 이상"
    )
    confidence: float = Field(ge=0.0, le=1.0, description="사진 기반 구조화 신뢰도")
    needs_confirmation: bool = Field(
        description="사진만으로 확정하기 어려우면 true"
    )
    measurements: list[str] = Field(
        default_factory=list,
        description="사진에서 추정한 양/상태 같은 보조 측정 문구",
    )
