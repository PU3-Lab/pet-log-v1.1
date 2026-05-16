# Card 3-2: 위험 메시지 safety 문구 제한

**목표:** 위험 신호 메시지가 의료 상태를 단정하지 않고 병원 상담 안내로 제한된다.

**Files:**
- Modify: `src/infrastructure/policies/risk_signal_policy.py`
- Test: `tests/test_risk_signal_policy.py`

**완료 기준:**
- [ ] 메시지에 병원 상담 권장 문구가 포함된다.
- [ ] `진단`, `확정`, `질병입니다` 같은 단정 표현을 사용하지 않는다.
- [ ] notice level은 `alert`를 사용한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_risk_signal_policy -v
```
