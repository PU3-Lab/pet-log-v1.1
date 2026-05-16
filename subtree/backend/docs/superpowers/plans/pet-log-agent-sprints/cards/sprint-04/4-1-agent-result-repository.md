# Card 4-1: Latest agent result repository

**목표:** 홈 피드가 읽을 수 있는 최신 agent result repository를 만든다.

**Files:**
- Modify: `src/infrastructure/repositories/pet_log_agent_result_repository.py`
- Test: `tests/test_home_feed_pipeline.py`

**완료 기준:**
- [ ] pet_id별 latest `PetLogAgentResult`를 반환한다.
- [ ] 없는 pet_id는 명시적인 예외를 발생시킨다.

**검증 명령:**

```bash
uv run python -B -m unittest tests.test_home_feed_pipeline -v
```
