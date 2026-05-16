from __future__ import annotations

import unittest
from typing import Any

from infrastructure.knowledge.web_search import TavilyWebSearcher, WebSearchResult


class FakeTavilyClient:
    def __init__(self, response: dict[str, Any]) -> None:
        self.response = response
        self.calls: list[dict[str, Any]] = []

    def search(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(kwargs)
        return self.response


class TestTavilyWebSearcher(unittest.TestCase):
    def test_search_maps_tavily_results_to_internal_results(self) -> None:
        client = FakeTavilyClient(
            {
                "results": [
                    {
                        "title": "Dog vaccination guide",
                        "url": "https://example.org/dog-vaccines",
                        "content": "Puppies usually start core vaccines at six to eight weeks.",
                        "score": 0.91,
                    }
                ]
            }
        )
        searcher = TavilyWebSearcher(client=client)

        results = searcher.search("dog vaccination", limit=3)

        self.assertEqual(
            results,
            (
                WebSearchResult(
                    title="Dog vaccination guide",
                    url="https://example.org/dog-vaccines",
                    content="Puppies usually start core vaccines at six to eight weeks.",
                    score=0.91,
                ),
            ),
        )
        self.assertEqual(client.calls[0]["query"], "dog vaccination")
        self.assertEqual(client.calls[0]["search_depth"], "advanced")
        self.assertEqual(client.calls[0]["max_results"], 3)

    def test_search_skips_results_missing_required_fields(self) -> None:
        client = FakeTavilyClient(
            {
                "results": [
                    {"title": "Missing URL", "content": "Useful content"},
                    {
                        "title": "Complete result",
                        "url": "https://example.org/care",
                        "content": "Useful care content",
                    },
                ]
            }
        )
        searcher = TavilyWebSearcher(client=client)

        results = searcher.search("care")

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].title, "Complete result")

    def test_search_limits_returned_results(self) -> None:
        client = FakeTavilyClient(
            {
                "results": [
                    {"title": "One", "url": "https://example.org/1", "content": "A"},
                    {"title": "Two", "url": "https://example.org/2", "content": "B"},
                ]
            }
        )
        searcher = TavilyWebSearcher(client=client)

        results = searcher.search("care", limit=1)

        self.assertEqual(tuple(result.title for result in results), ("One",))


if __name__ == "__main__":
    unittest.main()
