# Card 3-4: 기록 없음 누락 insight

**목표:** 최근 기록이 없으면 기록 누락 insight를 만든다.

**Files:**
- Modify: `src/infrastructure/policies/missing_record_policy.py`
- Test: `tests/test_context_policies.py`

**완료 기준:**
- [ ] records가 비어 있으면 `CareInsight`를 반환한다.
- [ ] severity는 `notice`를 사용한다.
- [ ] records가 있으면 빈 tuple을 반환한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_context_policies -v
```
