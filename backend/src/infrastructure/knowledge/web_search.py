from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Protocol

from tavily import TavilyClient


class TavilySearchClient(Protocol):
    def search(self, **kwargs: Any) -> dict[str, Any]:
        pass


@dataclass(frozen=True)
class WebSearchResult:
    title: str
    url: str
    content: str
    score: float | None = None


class TavilyWebSearcher:
    def __init__(
        self,
        api_key: str | None = None,
        client: TavilySearchClient | None = None,
        search_depth: str = "advanced",
    ) -> None:
        self._client = client or TavilyClient(api_key=api_key or self._api_key_from_env())
        self._search_depth = search_depth

    def search(self, query: str, limit: int = 5) -> tuple[WebSearchResult, ...]:
        response = self._client.search(
            query=query,
            search_depth=self._search_depth,
            max_results=limit,
        )
        raw_results = response.get("results", [])

        results: list[WebSearchResult] = []
        for raw_result in raw_results:
            title = str(raw_result.get("title") or "").strip()
            url = str(raw_result.get("url") or "").strip()
            content = str(raw_result.get("content") or "").strip()
            if not title or not url or not content:
                continue

            score = raw_result.get("score")
            results.append(
                WebSearchResult(
                    title=title,
                    url=url,
                    content=content,
                    score=float(score) if score is not None else None,
                )
            )

        return tuple(results[:limit])

    @staticmethod
    def _api_key_from_env() -> str:
        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            raise ValueError("TAVILY_API_KEY is required for Tavily web search.")
        return api_key
