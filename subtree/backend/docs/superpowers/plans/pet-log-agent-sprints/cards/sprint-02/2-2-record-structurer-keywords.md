# Card 2-2: RecordStructurer 키워드 분류

**목표:** mock structurer가 대표 키워드로 category/status를 분류한다.

**Files:**
- Modify: `src/infrastructure/llm/record_structuring/prompt.py`
- Test: `tests/test_record_structurer.py`

**완료 기준:**
- [ ] `밥`, `먹` 키워드는 `category="meal"`로 분류한다.
- [ ] `산책` 키워드는 `category="walk"`로 분류한다.
- [ ] `조금`, `못`, `안` 키워드가 있으면 `status="notice"`로 분류한다.
- [ ] `"오늘 밥을 조금 먹고 산책은 못 했어"`는 식사 후보와 산책 후보를 함께 반환한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_record_structurer -v
```
