# Card 6-12: Runtime tool calling smoke test

**목표:** agent runtime이 registry의 tool을 호출할 수 있는 최소 smoke path를 만든다.

**Files:**
- Modify: `src/agent_runtime/runtime.py`
- Test: `tests/test_agent_runtime_tools.py`

**완료 기준:**
- [ ] runtime이 tool 이름으로 registry에서 tool을 찾는다.
- [ ] tool 호출 결과를 반환한다.
- [ ] 실패 시 명시적 예외를 발생시킨다.
