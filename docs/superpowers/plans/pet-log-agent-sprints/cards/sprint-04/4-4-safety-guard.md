# Card 4-4: SafetyGuard

**목표:** care question과 pet chat에서 공통으로 쓰는 safety guard를 구현한다.

**Files:**
- Modify: `src/infrastructure/policies/safety_guard.py`
- Test: `tests/test_care_question_pipeline.py`

**완료 기준:**
- [ ] 위험 키워드 질문은 `SafetyNotice`를 반환한다.
- [ ] 일반 질문은 `None`을 반환한다.
- [ ] 메시지는 병원 상담 안내 수준으로 제한한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_care_question_pipeline -v
```
