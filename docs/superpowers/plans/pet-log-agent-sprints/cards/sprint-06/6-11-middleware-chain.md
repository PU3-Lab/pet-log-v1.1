# Card 6-11: Middleware chain

**목표:** agent runtime 전후 처리 middleware chain을 구현한다.

**Files:**
- Modify: `src/middleware/*.py`
- Test: `tests/test_agent_runtime_tools.py`

**완료 기준:**
- [ ] validation, safety, logging 순서로 실행할 수 있다.
- [ ] middleware는 입력을 받아 출력 또는 중단 신호를 반환한다.
- [ ] 특정 기능 로직은 middleware에 넣지 않는다.
