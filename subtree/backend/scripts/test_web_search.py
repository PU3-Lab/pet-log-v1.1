import os
from dotenv import load_dotenv
from tavily import TavilyClient

# .env 파일 로드
load_dotenv()

def test_search():
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        print("Error: TAVILY_API_KEY not found in .env")
        return

    # Tavily 클라이언트 생성
    tavily = TavilyClient(api_key=api_key)

    # 검색 실행
    query = "강아지에게 좋은 음식과 피해야 할 음식"
    print(f"Searching for: {query}...")
    
    # search 메서드 사용 (advanced 모드로 더 깊은 검색)
    response = tavily.search(query=query, search_depth="advanced")

    print("\n--- Search Results ---")
    results = response.get('results', [])
    if not results:
        print("No results found.")
    
    for i, result in enumerate(results, 1):
        print(f"[{i}] {result.get('title')}")
        print(f"URL: {result.get('url')}")
        # 내용이 길 수 있으므로 앞부분만 출력
        content = result.get('content', 'No content available')
        print(f"Content: {content[:150]}...")
        print("-" * 30)

if __name__ == "__main__":
    test_search()
