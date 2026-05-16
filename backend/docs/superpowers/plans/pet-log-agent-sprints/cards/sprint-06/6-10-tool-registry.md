# Card 6-10: Tool registry

**목표:** agent runtime이 사용할 tool registry를 구현한다.

**Files:**
- Modify: `src/agent_runtime/tool_registry.py`
- Modify: `src/tools/*.py`
- Test: `tests/test_agent_runtime_tools.py`

**완료 기준:**
- [ ] record/profile/schedule/care/speech tool을 등록한다.
- [ ] 등록된 tool 목록을 deterministic tuple로 반환한다.
- [ ] 같은 이름의 tool 중복 등록을 막는다.
