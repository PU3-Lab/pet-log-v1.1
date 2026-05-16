# Card 4-6: CareQuestionPipeline

**목표:** care context, safety guard, answer provider를 연결한다.

**Files:**
- Test: `tests/test_care_question_pipeline.py`

**완료 기준:**
- [ ] 일반 질문은 `CareQuestionResult.answer`를 반환한다.
- [ ] 위험 질문은 `safety_notice`를 우선 반환한다.
- [ ] 위험 질문일 때 provider 답변은 사용하지 않는다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_care_question_pipeline -v
```
