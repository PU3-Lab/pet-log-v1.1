# Card 4-8: PetChat health question routing

**목표:** 건강 판단 질문은 펫 대화가 직접 답하지 않고 care question route 표시를 반환한다.

**Files:**
- Test: `tests/test_pet_chat_pipeline.py`

**완료 기준:**
- [ ] 일반 감성 대화는 `routed_to_care_question=False`다.
- [ ] 건강 판단 질문은 `routed_to_care_question=True`다.
- [ ] 건강 판단 질문은 safety notice 또는 route 안내를 포함한다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_pet_chat_pipeline -v
```
