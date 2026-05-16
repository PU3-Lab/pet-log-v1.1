from __future__ import annotations

from typing import Any

from langchain.agents.middleware import ModelRetryMiddleware, ToolRetryMiddleware


def build_model_retry_middleware(
    *,
    max_retries: int = 2,
    retry_on: Any = (Exception,),
    on_failure: Any = "continue",
    backoff_factor: float = 2.0,
    initial_delay: float = 1.0,
    max_delay: float = 10.0,
    jitter: bool = False,
) -> ModelRetryMiddleware:
    return ModelRetryMiddleware(
        max_retries=max_retries,
        retry_on=retry_on,
        on_failure=on_failure,
        backoff_factor=backoff_factor,
        initial_delay=initial_delay,
        max_delay=max_delay,
        jitter=jitter,
    )


def build_tool_retry_middleware(
    *,
    tool_names: tuple[str, ...] | None = None,
    max_retries: int = 1,
    retry_on: Any = (Exception,),
    on_failure: Any = "continue",
    backoff_factor: float = 2.0,
    initial_delay: float = 0.5,
    max_delay: float = 5.0,
    jitter: bool = False,
) -> ToolRetryMiddleware:
    return ToolRetryMiddleware(
        max_retries=max_retries,
        tools=list(tool_names) if tool_names is not None else None,
        retry_on=retry_on,
        on_failure=on_failure,
        backoff_factor=backoff_factor,
        initial_delay=initial_delay,
        max_delay=max_delay,
        jitter=jitter,
    )
