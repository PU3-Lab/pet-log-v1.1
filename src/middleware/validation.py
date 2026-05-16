from __future__ import annotations

from collections.abc import Callable
from typing import Any, Literal

from langchain.agents.middleware import PIIMiddleware

PiiStrategy = Literal["block", "redact", "mask", "hash"]


def build_pii_validation_middleware(
    pii_type: str,
    *,
    strategy: PiiStrategy = "redact",
    detector: Callable[[str], list[Any]] | str | None = None,
    apply_to_input: bool = True,
    apply_to_output: bool = False,
    apply_to_tool_results: bool = False,
) -> PIIMiddleware:
    return PIIMiddleware(
        pii_type,
        strategy=strategy,
        detector=detector,
        apply_to_input=apply_to_input,
        apply_to_output=apply_to_output,
        apply_to_tool_results=apply_to_tool_results,
    )
