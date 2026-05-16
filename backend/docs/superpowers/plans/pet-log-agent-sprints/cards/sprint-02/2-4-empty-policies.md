# Card 2-4: Pipeline 실행용 빈 policy 구현

**목표:** core pipeline이 끝까지 실행될 수 있도록 policy skeleton이 빈 tuple을 반환한다.

**Files:**
- Modify: `src/infrastructure/policies/pattern_analyzer.py`
- Modify: `src/infrastructure/policies/missing_record_policy.py`
- Modify: `src/infrastructure/policies/risk_signal_policy.py`
- Modify: `src/infrastructure/policies/suggestion_composer.py`
- Modify: `src/infrastructure/policies/reminder_planner.py`
- Test: `tests/test_policy_fallbacks.py`

**완료 기준:**
- [x] `PatternAnalyzer.analyze()`는 빈 tuple을 반환한다.
- [x] `MissingRecordPolicy.detect_missing_records()`는 빈 tuple을 반환한다.
- [x] `RiskSignalPolicy.detect_risks()`는 빈 tuple을 반환한다.
- [x] `SuggestionComposer.compose()`는 insight가 없으면 빈 tuple을 반환한다.
- [x] `ReminderPlanner.plan()`은 due item 입력이 없으면 빈 tuple을 반환한다.

**구현 상태:** `tests/test_policy_fallbacks.py`가 API pipeline용 안전 fallback 동작을 검증한다. `SuggestionComposer`와 `ReminderPlanner`는 후속 Sprint 3 카드 요구에 맞춰 insight/due item 입력이 있으면 결과를 반환한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_policy_fallbacks -v
```
