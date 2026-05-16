from __future__ import annotations

from typing import Literal

from langchain.agents.middleware import HumanInTheLoopMiddleware, InterruptOnConfig

AllowedDecision = Literal["approve", "edit", "reject", "respond"]


def build_tool_approval_middleware(
    *,
    tool_names: tuple[str, ...],
    allowed_decisions: tuple[AllowedDecision, ...] = ("approve", "reject"),
    description_prefix: str = "Pet log tool approval required",
) -> HumanInTheLoopMiddleware:
    interrupt_on: dict[str, InterruptOnConfig] = {
        tool_name: {"allowed_decisions": list(allowed_decisions)}
        for tool_name in tool_names
    }
    return HumanInTheLoopMiddleware(
        interrupt_on,
        description_prefix=description_prefix,
    )
