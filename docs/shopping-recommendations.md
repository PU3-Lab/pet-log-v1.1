# 네이버 쇼핑 추천 연동

반려동물 기록 저장이 완료되면 쇼핑 에이전트가 저장된 기록을 바탕으로 네이버 쇼핑 검색 API를 호출해 관련 상품을 추천한다. 미리보기나 확인 대기 상태에서는 기록이 아직 저장되지 않았으므로 쇼핑 추천을 만들지 않는다.

## provider 경계

- `application.agents.shopping.ShoppingAgent`: 파이프라인에서 호출하는 애플리케이션 에이전트이다.
- `middleware.shopping_fallback.ShoppingFallbackMiddleware`: provider 예외 또는 빈 결과를 기본 네이버 쇼핑 검색 링크로 대체한다.
- `infrastructure.shopping.ShoppingRecommendationProvider`: 반려견 맥락과 기록 카테고리를 기반으로 검색어를 선택한다.
- `infrastructure.shopping.NaverShoppingClient`: 네이버 쇼핑 검색 API 호출과 응답 매핑을 담당한다.

## 검색어 선택

- 식사 기록 또는 사료/급여/간식 언급: `반려견 사료`
- 배변 기록 또는 배변봉투 언급: `반려견 배변봉투`
- 배변패드 언급: `반려견 배변패드`
- 산책 기록: `반려견 산책용품`
- 의료 기록: `반려견 영양제`
- 행동 기록: `반려견 장난감`

## 환경 변수

`.env.example`에 네이버 개발자 센터에서 발급받은 검색 API용 클라이언트 아이디와 시크릿 샘플을 둔다. 실제 값은 로컬 `.env`나 배포 환경의 secret manager에 설정한다.

```env
NAVER_SHOPPING_CLIENT_ID=your-naver-client-id
NAVER_SHOPPING_CLIENT_SECRET=your-naver-client-secret
NAVER_SHOPPING_DISPLAY=3
NAVER_SHOPPING_SORT=sim
NAVER_SHOPPING_EXCLUDE=used:rental:cbshop
NAVER_SHOPPING_TIMEOUT=3
```

키가 비어 있거나 API 호출이 실패하면 쇼핑 폴백 미들웨어가 기록 기반 기본 네이버 쇼핑 검색 링크를 반환하고 기록 저장 흐름은 계속된다. 반려견 맥락이 아니면 폴백 추천도 만들지 않는다.

## 응답 필드

기록 저장 API 응답의 `data.shopping_recommendations`에 상품 목록이 포함된다.

```json
{
  "shopping_recommendations": [
    {
      "title": "상품명",
      "product_url": "https://...",
      "image_url": "https://...",
      "mall_name": "쇼핑몰",
      "lowest_price": 12000,
      "query": "반려견 사료",
      "reason": "식사 기록과 관련된 상품 추천",
      "source_record_ids": ["record-1"]
    }
  ]
}
```

## 검증 명령

네이버 쇼핑 연동만 수동 확인하려면 다음 스크립트를 실행한다. 실제 키 값은 출력하지 않는다.

```bash
uv run python -B scripts/smoke_naver_shopping.py
```

```bash
uv run python -B -m unittest tests.test_shopping_recommendations tests.test_pet_log_agent_pipeline tests.test_http_routes
```

```bash
uv run python -B -m unittest tests.test_shopping_fallback_middleware
```
