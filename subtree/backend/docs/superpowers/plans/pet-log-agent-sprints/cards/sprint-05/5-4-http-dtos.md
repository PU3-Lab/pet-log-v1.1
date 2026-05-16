# Card 5-4: HTTP request/response DTO

**목표:** HTTP 계층에서 사용할 request/response 변환 타입을 정의한다.

**Files:**
- Create: `src/presentation/http/routes.py`
- Test: `tests/test_http_routes.py`

**완료 기준:**
- [x] HTTP request dict의 `pet_id`로 서버 저장 pet profile을 조회해 `PetLogAgentInput`으로 변환한다.
- [x] `PetLogAgentResult`를 response dict로 변환한다.
- [x] application/domain에는 HTTP framework import를 추가하지 않는다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_http_routes -v
```
