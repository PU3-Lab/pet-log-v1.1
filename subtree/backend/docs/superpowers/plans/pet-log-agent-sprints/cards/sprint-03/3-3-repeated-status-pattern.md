# Card 3-3: 반복 notice/alert 패턴 분석

**목표:** 최근 기록에 주의 상태가 반복되면 `CareInsight`를 만든다.

**Files:**
- Modify: `src/infrastructure/policies/pattern_analyzer.py`
- Test: `tests/test_context_policies.py`

**완료 기준:**
- [ ] 최근 기록에 `notice` 또는 `alert`가 2개 이상 있으면 insight를 반환한다.
- [ ] insight의 `source_record_ids`에 관련 기록 id가 포함된다.
- [ ] 정상 기록만 있으면 빈 tuple을 반환한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_context_policies -v
```
