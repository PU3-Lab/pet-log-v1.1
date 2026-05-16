from __future__ import annotations

import argparse
from pathlib import Path

from dotenv import load_dotenv

from infrastructure.knowledge.web_evaluator import WebKnowledgeEvaluator
from infrastructure.knowledge.web_search import TavilyWebSearcher


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke test Tavily search results through the web evaluator.")
    parser.add_argument("query", type=str, help="Search query to evaluate")
    parser.add_argument("--limit", type=int, default=3, help="Maximum Tavily results to evaluate")
    args = parser.parse_args()

    backend_root = Path(__file__).resolve().parents[1]
    load_dotenv(backend_root / ".env", override=False)

    searcher = TavilyWebSearcher()
    evaluator = WebKnowledgeEvaluator()

    print(f"Searching Tavily for: {args.query}")
    results = searcher.search(args.query, limit=args.limit)
    print(f"Found {len(results)} usable search results.")

    for index, result in enumerate(results, start=1):
        print("\n" + "=" * 80)
        print(f"[{index}] {result.title}")
        print(f"URL: {result.url}")
        print(f"Tavily score: {result.score}")

        evaluation = evaluator.evaluate(result)
        print(f"Accepted: {evaluation.accepted}")
        print(f"Confidence: {evaluation.confidence}")
        print(f"Risk level: {evaluation.risk_level}")
        print(f"Tags: {', '.join(evaluation.tags) if evaluation.tags else '-'}")
        print(f"Reason: {evaluation.reason}")

        if evaluation.cleaned_text:
            print("\nCleaned text:")
            print(evaluation.cleaned_text)


if __name__ == "__main__":
    main()
