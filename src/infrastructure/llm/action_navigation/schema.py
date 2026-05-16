from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

ActionHrefOutput = Literal["/hospital", "/schedule", "/shopping", "/timeline", "/record"]


class ActionNavigationDecisionOutput(BaseModel):
    index: int = Field(
        ge=0,
        description="입력 insights 배열에서 이동 경로를 결정한 항목의 0-based index",
    )
    action_href: ActionHrefOutput = Field(
        description="카드를 눌렀을 때 이동할 앱 내부 경로"
    )
    reason: str = Field(
        description="왜 이 경로를 선택했는지에 대한 짧은 한국어 근거"
    )


class ActionNavigationOutput(BaseModel):
    decisions: list[ActionNavigationDecisionOutput] = Field(
        description="각 입력 insight마다 정확히 하나씩 포함하는 이동 경로 결정 목록"
    )
