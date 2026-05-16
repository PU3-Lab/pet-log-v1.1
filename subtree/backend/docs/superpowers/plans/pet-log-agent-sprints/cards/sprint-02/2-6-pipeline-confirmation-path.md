# Card 2-6: PetLogAgentPipeline confirmation 미저장 경로

**목표:** 확인이 필요한 후보는 `confirm=False`일 때 저장하지 않는다.

**Files:**
- Test: `tests/test_pet_log_agent_pipeline.py`

**완료 기준:**
- [ ] batch 안의 후보 중 하나라도 `needs_confirmation=True`이면 `saved_records`는 비어 있다.
- [ ] `context_analysis`와 `safety_notices`는 결과에 포함된다.
- [ ] 같은 입력에 `confirm=True`를 주면 저장된다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_pet_log_agent_pipeline -v
```
