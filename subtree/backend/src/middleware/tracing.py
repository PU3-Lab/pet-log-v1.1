from __future__ import annotations

from typing import Literal

from langchain.agents.middleware import ToolCallLimitMiddleware

ExitBehavior = Literal["continue", "error", "end"]


def build_tool_call_limit_middleware(
    *,
    tool_name: str | None = None,
    thread_limit: int | None = None,
    run_limit: int | None = None,
    exit_behavior: ExitBehavior = "continue",
) -> ToolCallLimitMiddleware:
    return ToolCallLimitMiddleware(
        tool_name=tool_name,
        thread_limit=thread_limit,
        run_limit=run_limit,
        exit_behavior=exit_behavior,
    )
