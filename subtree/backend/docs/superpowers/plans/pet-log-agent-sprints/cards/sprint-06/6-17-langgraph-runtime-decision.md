# Card 6-17: LangGraph runtime decision

**목표:** `agent_runtime`의 실제 orchestration 구현 방향을 LangGraph 우선, LangChain 보조로 고정한다.

## Files

- Modify: `src/agent_runtime/runtime.py`
- Modify: `src/agent_runtime/tool_registry.py`
- Modify: `src/agent_runtime/memory.py`
- Modify: `src/composition.py`
- Test: `tests/test_agent_runtime_langgraph_contract.py`

## Planning basis

- 현재 application pipeline은 단계형 workflow다.
- 보호자 확인, 병원 요약, 알림 후보 생성은 중간 상태와 분기 가능성이 있다.
- LangGraph는 상태 기반 graph orchestration, persistence, interrupt/resume 흐름과 맞다.
- LangChain은 provider/model/tool adapter 또는 prebuilt agent가 필요한 경우에만 쓴다.

## Completion criteria

- [ ] application/domain/interface는 LangGraph와 LangChain 타입을 import하지 않는다.
- [ ] `agent_runtime` 내부에만 LangGraph 의존성을 둔다.
- [ ] 단순 LLM 호출 provider는 `infrastructure/llm/`의 얇은 wrapper로 유지한다.
- [ ] tool registry는 LangGraph node/tool adapter와 독립적으로 테스트할 수 있다.
- [ ] human-in-the-loop 또는 confirmation path를 graph interrupt/resume 후보로 문서화한다.
- [ ] LangChain 도입 조건은 model/tool adapter 또는 prebuilt agent 필요 시로 제한한다.

## Verification

```bash
uv run python -B -m unittest tests.test_agent_runtime_langgraph_contract -v
```
