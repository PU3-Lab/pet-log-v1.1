# Card 3-5: Insight 기반 suggestion

**목표:** insight가 있으면 보호자 행동 제안을 만든다.

**Files:**
- Modify: `src/infrastructure/policies/suggestion_composer.py`
- Test: `tests/test_policy_fallbacks.py`

**완료 기준:**
- [x] insight가 없으면 빈 tuple을 반환한다.
- [x] insight가 있으면 `CareSuggestion`을 반환한다.
- [x] suggestion의 `source_record_ids`는 insight의 source를 보존한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_policy_fallbacks -v
```
