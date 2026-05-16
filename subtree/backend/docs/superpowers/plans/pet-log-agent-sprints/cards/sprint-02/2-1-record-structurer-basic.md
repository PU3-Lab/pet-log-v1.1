# Card 2-1: RecordStructurer 기본 후보 반환

**목표:** `RecordStructurer.structure(input)`이 어떤 입력에도 `StructuredRecordBatch`를 반환한다.

**Files:**
- Modify: `src/infrastructure/llm/record_structuring/provider.py`
- Test: `tests/test_record_structurer.py`

**완료 기준:**
- [ ] 기본 title은 입력 문장의 앞부분을 사용한다.
- [ ] 기본 detail은 입력 원문을 보존한다.
- [ ] 기본 category는 `behavior`다.
- [ ] 기본 status는 `normal`이다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_record_structurer -v
```
