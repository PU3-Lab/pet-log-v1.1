from __future__ import annotations

from collections.abc import Iterable

from domain.enums import RecordCategory, RecordStatus


_CATEGORY_LABELS: dict[RecordCategory, str] = {
    "meal": "식사",
    "walk": "산책",
    "stool": "배변",
    "medical": "병원/접종",
    "behavior": "행동",
}

_STATUS_LABELS: dict[RecordStatus, str] = {
    "normal": "안정",
    "notice": "확인 필요",
    "alert": "주의",
}


def record_category_label(category: str) -> str:
    return _CATEGORY_LABELS.get(category, category)


def record_status_label(status: str) -> str:
    return _STATUS_LABELS.get(status, status)


def record_category_list_label(categories: Iterable[str]) -> str:
    return ", ".join(dict.fromkeys(record_category_label(category) for category in categories))
