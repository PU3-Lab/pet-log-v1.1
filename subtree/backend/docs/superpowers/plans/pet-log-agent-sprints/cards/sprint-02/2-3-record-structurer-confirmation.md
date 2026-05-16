# Card 2-3: RecordStructurer confirmation 처리

**목표:** mock structurer가 확신 없는 입력을 보호자 확인 필요 후보로 반환한다.

**Files:**
- Modify: `src/infrastructure/llm/record_structuring/mapper.py`
- Test: `tests/test_record_structurer.py`

**완료 기준:**
- [ ] 알 수 없는 입력은 `category="behavior"`를 반환한다.
- [ ] 알 수 없는 입력은 `needs_confirmation=True`를 반환한다.
- [ ] 분류된 입력은 `needs_confirmation=False`를 반환한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_record_structurer -v
```
