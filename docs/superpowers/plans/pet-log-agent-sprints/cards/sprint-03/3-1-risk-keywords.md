# Card 3-1: 위험 키워드 감지

**목표:** `RiskSignalPolicy`가 대표 위험 키워드를 `SafetyNotice`로 변환한다.

**Files:**
- Modify: `src/infrastructure/policies/risk_signal_policy.py`
- Test: `tests/test_risk_signal_policy.py`

**완료 기준:**
- [ ] `구토`, `혈변`, `호흡`, `경련` 키워드를 감지한다.
- [ ] 감지 결과는 빈 tuple이 아니다.
- [ ] 위험 키워드가 없으면 빈 tuple을 반환한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_risk_signal_policy -v
```
