from __future__ import annotations

from importlib import import_module
from typing import Any


_EXPORTS = {
    "HospitalCacheRateLimitMiddleware": (
        "middleware.hospital_cache_rate_limit",
        "HospitalCacheRateLimitMiddleware",
    ),
    "HospitalFallbackMiddleware": ("middleware.hospital_fallback", "HospitalFallbackMiddleware"),
    "ShoppingFallbackMiddleware": ("middleware.shopping_fallback", "ShoppingFallbackMiddleware"),
    "build_agent_debug_middleware": ("middleware.logging", "build_agent_debug_middleware"),
    "build_fallback_hospital_recommendations": (
        "middleware.hospital_fallback",
        "build_fallback_hospital_recommendations",
    ),
    "build_fallback_shopping_recommendations": (
        "middleware.shopping_fallback",
        "build_fallback_shopping_recommendations",
    ),
    "build_model_retry_middleware": ("middleware.retry", "build_model_retry_middleware"),
    "build_pii_validation_middleware": ("middleware.validation", "build_pii_validation_middleware"),
    "build_tool_approval_middleware": ("middleware.safety", "build_tool_approval_middleware"),
    "build_tool_call_limit_middleware": ("middleware.tracing", "build_tool_call_limit_middleware"),
    "build_tool_retry_middleware": ("middleware.retry", "build_tool_retry_middleware"),
}

__all__ = sorted(_EXPORTS)


def __getattr__(name: str) -> Any:
    if name not in _EXPORTS:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    module_name, attribute_name = _EXPORTS[name]
    value = getattr(import_module(module_name), attribute_name)
    globals()[name] = value
    return value
