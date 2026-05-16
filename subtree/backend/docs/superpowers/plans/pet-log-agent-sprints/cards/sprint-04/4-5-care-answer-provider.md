# Card 4-5: CareAnswerProvider

**목표:** LLM 없이 케어 질문 mock 답변을 반환한다.

**Files:**
- Modify: `src/infrastructure/llm/care_answer/provider.py`
- Modify: `src/infrastructure/llm/care_answer/model.py`
- Modify: `src/infrastructure/llm/care_answer/prompt.py`
- Modify: `src/infrastructure/llm/care_answer/mapper.py`
- Test: `tests/test_care_question_pipeline.py`

**완료 기준:**
- [x] 일반 질문에 문자열 답변을 반환한다.
- [x] 답변에는 pet name을 포함할 수 있다.
- [x] 의료 진단 단정 표현은 사용하지 않는다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_care_question_pipeline -v
```
