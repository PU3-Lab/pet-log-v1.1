from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from html import unescape
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from domain.models import ShoppingRecommendation


logger = logging.getLogger(__name__)

NAVER_SHOPPING_ENDPOINT = "https://openapi.naver.com/v1/search/shop.json"
ALLOWED_SORTS = {"sim", "date", "asc", "dsc"}
PLACEHOLDER_CREDENTIALS = {
    "your-naver-client-id",
    "your-naver-client-secret",
}


@dataclass(frozen=True)
class NaverShoppingConfig:
    client_id: str
    client_secret: str
    display: int = 3
    sort: str = "sim"
    filter: str | None = None
    exclude: str | None = "used:rental:cbshop"
    timeout: float = 3.0
    cache_ttl_seconds: float = 300.0
    rate_limit_cooldown_seconds: float = 60.0

    @classmethod
    def from_env(cls) -> NaverShoppingConfig:
        return cls(
            client_id=os.environ.get("NAVER_SHOPPING_CLIENT_ID", ""),
            client_secret=os.environ.get("NAVER_SHOPPING_CLIENT_SECRET", ""),
            display=_bounded_int(os.environ.get("NAVER_SHOPPING_DISPLAY"), default=3, minimum=1, maximum=10),
            sort=_allowed_sort(os.environ.get("NAVER_SHOPPING_SORT", "sim")),
            filter=os.environ.get("NAVER_SHOPPING_FILTER") or None,
            exclude=os.environ.get("NAVER_SHOPPING_EXCLUDE", "used:rental:cbshop") or None,
            timeout=_bounded_float(os.environ.get("NAVER_SHOPPING_TIMEOUT"), default=3.0, minimum=0.1),
            cache_ttl_seconds=_bounded_float(
                os.environ.get("NAVER_SHOPPING_CACHE_TTL_SECONDS"),
                default=300.0,
                minimum=0.0,
            ),
            rate_limit_cooldown_seconds=_bounded_float(
                os.environ.get("NAVER_SHOPPING_RATE_LIMIT_COOLDOWN_SECONDS"),
                default=60.0,
                minimum=0.0,
            ),
        )

    @property
    def has_credentials(self) -> bool:
        return bool(
            self.client_id
            and self.client_secret
            and self.client_id not in PLACEHOLDER_CREDENTIALS
            and self.client_secret not in PLACEHOLDER_CREDENTIALS
        )


class NaverShoppingClient:
    def __init__(self, config: NaverShoppingConfig | None = None, *, clock: Callable[[], float] | None = None) -> None:
        self._config = config or NaverShoppingConfig.from_env()
        self._clock = clock or time.monotonic
        self._cache: dict[tuple[tuple[str, str], ...], tuple[float, tuple[dict[str, object], ...]]] = {}
        self._rate_limited_until = 0.0

    def search(
        self,
        query: str,
        *,
        reason: str,
        source_record_ids: tuple[str, ...],
    ) -> tuple[ShoppingRecommendation, ...]:
        if not self._config.has_credentials:
            return ()
        if self._is_rate_limited():
            logger.info("naver_shopping_search_skipped query=%s reason=rate_limited", query)
            return ()

        params = {
            "query": query,
            "display": str(self._config.display),
            "start": "1",
            "sort": self._config.sort,
        }
        if self._config.filter:
            params["filter"] = self._config.filter
        if self._config.exclude:
            params["exclude"] = self._config.exclude

        cache_key = tuple(sorted(params.items()))
        cached_items = self._cached_items(cache_key)
        if cached_items is not None:
            return _items_to_recommendations(cached_items, query, reason, source_record_ids)

        request = Request(
            f"{NAVER_SHOPPING_ENDPOINT}?{urlencode(params)}",
            headers={
                "X-Naver-Client-Id": self._config.client_id,
                "X-Naver-Client-Secret": self._config.client_secret,
            },
            method="GET",
        )

        try:
            with urlopen(request, timeout=self._config.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 429:
                self._rate_limited_until = self._clock() + self._config.rate_limit_cooldown_seconds
            logger.warning(
                "naver_shopping_search_failed query=%s status=%s reason=%s body=%s",
                query,
                exc.code,
                exc.reason,
                _read_error_body(exc),
            )
            return ()
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            logger.warning("naver_shopping_search_failed query=%s error=%s", query, exc.__class__.__name__)
            return ()

        items = tuple(dict(item) for item in payload.get("items", ()) if isinstance(item, dict))
        self._cache_items(cache_key, items)
        return _items_to_recommendations(items, query, reason, source_record_ids)

    def _is_rate_limited(self) -> bool:
        return self._clock() < self._rate_limited_until

    def _cached_items(self, cache_key: tuple[tuple[str, str], ...]) -> tuple[dict[str, object], ...] | None:
        cached = self._cache.get(cache_key)
        if cached is None:
            return None
        expires_at, items = cached
        if self._clock() >= expires_at:
            del self._cache[cache_key]
            return None
        return items

    def _cache_items(self, cache_key: tuple[tuple[str, str], ...], items: tuple[dict[str, object], ...]) -> None:
        if self._config.cache_ttl_seconds <= 0:
            return
        self._cache[cache_key] = (self._clock() + self._config.cache_ttl_seconds, items)


def _items_to_recommendations(
    items: tuple[dict[str, object], ...],
    query: str,
    reason: str,
    source_record_ids: tuple[str, ...],
) -> tuple[ShoppingRecommendation, ...]:
    return tuple(_item_to_recommendation(item, query, reason, source_record_ids) for item in items)


def _item_to_recommendation(
    item: dict[str, object],
    query: str,
    reason: str,
    source_record_ids: tuple[str, ...],
) -> ShoppingRecommendation:
    return ShoppingRecommendation(
        title=_clean_title(str(item.get("title", ""))),
        product_url=str(item.get("link", "")),
        image_url=str(item.get("image", "")),
        mall_name=str(item.get("mallName", "")),
        lowest_price=_int_or_zero(item.get("lprice")),
        query=query,
        reason=reason,
        source_record_ids=source_record_ids,
        id=str(item.get("link", "")) or f"{query}:{item.get('title', '')}",
        category=_category_for_query(query),
        detail=_detail_for_item(str(item.get("mallName", "")), _int_or_zero(item.get("lprice"))),
        tone="green",
    )


def _clean_title(value: str) -> str:
    return unescape(value.replace("<b>", "").replace("</b>", ""))


def _int_or_zero(value: object) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _category_for_query(query: str) -> str:
    if "사료" in query or "간식" in query:
        return "사료"
    if "영양제" in query or "건강" in query:
        return "건강 용품"
    if "장난감" in query or "케어" in query:
        return "케어 용품"
    return "생활 용품"


def _detail_for_item(mall_name: str, lowest_price: int) -> str:
    mall = mall_name or "쇼핑몰"
    if lowest_price > 0:
        return f"{mall} · 최저가 {lowest_price:,}원"
    return f"{mall} · 가격 확인 필요"


def _bounded_int(value: str | None, *, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value) if value else default
    except ValueError:
        return default
    return min(max(parsed, minimum), maximum)


def _bounded_float(value: str | None, *, default: float, minimum: float) -> float:
    try:
        parsed = float(value) if value else default
    except ValueError:
        return default
    return max(parsed, minimum)


def _allowed_sort(value: str) -> str:
    return value if value in ALLOWED_SORTS else "sim"


def _read_error_body(error: HTTPError) -> str:
    try:
        body = error.read().decode("utf-8", errors="replace")
    except Exception:
        return ""
    return body[:300]
