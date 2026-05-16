# Agent Runtime, Middleware, Tools

## 역할 구분

```text
application/agents/
  = 누가 무슨 일을 맡는가

agent_runtime/
  = agent를 어떻게 실행하는가

middleware/
  = LangChain/LangGraph에 붙일 middleware factory

tools/
  = agent가 호출할 수 있는 LangChain tool adapter

infrastructure/
  = 실제 외부 시스템 구현
```

## Agent Runtime

| 파일 | 책임 |
| --- | --- |
| `src/agent_runtime/runtime.py` | LLM 호출 loop와 tool calling 실행기 |
| `src/agent_runtime/prompts.py` | system/developer prompt 조립 |
| `src/agent_runtime/tool_registry.py` | node/agent별 tool bundle과 middleware bundle 구성 |
| `src/agent_runtime/memory.py` | 단기 context와 향후 memory hook |

## LangGraph/LangChain 선택

현재 프로젝트의 기본 방향은 LangGraph 우선이다.

판단 근거:

- `PetLogAgentPipeline`은 기록 구조화, 맥락 분석, 위험 감지, 저장, 제안, 리마인더처럼 순서와 상태가 있는 workflow다.
- 보호자 확인, 병원 요약, 알림 후보 생성, 향후 human-in-the-loop가 들어갈 가능성이 높다.
- `agent_runtime/`은 이미 LLM 호출 loop, tool registry, memory, middleware를 분리한 구조라 LangGraph의 graph orchestration과 잘 맞는다.

결정:

- application pipeline과 interface는 LangGraph 또는 LangChain 타입에 의존하지 않는다.
- `src/agent_runtime/` 내부 구현에서만 LangGraph adapter를 둔다.
- LLM provider 호출은 `infrastructure/llm/`의 얇은 provider wrapper로 먼저 구현한다.
- LangChain은 model/tool adapter, provider 통합, prebuilt agent가 명확히 필요한 경우에만 보조적으로 사용한다.
- 단순 rule/mock 구현 단계에서는 LangGraph/LangChain을 추가하지 않는다.

후속 구현 후보:

```text
application pipeline
  -> application agent
  -> agent runtime 후보
  -> LangGraphAgentRuntime
  -> ToolRegistry
  -> infrastructure provider/tool
```

도입 기준:

- agent 실행 중간 상태를 저장하거나 재개해야 한다.
- 보호자 확인 같은 interrupt/resume 흐름이 필요하다.
- 여러 tool 호출과 분기 조건을 graph로 명시해야 한다.
- 실행 경로 추적과 재현 가능한 테스트가 중요해진다.

비도입 기준:

- rule-based policy만으로 충분하다.
- 단일 LLM 호출 후 DTO를 반환하는 단순 provider다.
- application interface skeleton 또는 mock 단계다.

## 현재 agent 구성 결정

현재 `pet_log` 기록 workflow는 `create_agent` 기반 agent가 아니라 LangGraph `StateGraph` 기반 pipeline으로 실행한다.

```text
LangGraphPetLogAgentPipeline
  -> structure_record node
     -> RecordStructuringAgent
        -> RecordStructurer
           -> ChatOpenAI.with_structured_output(...).invoke(...)
  -> load_context node
     -> repository readers
  -> analyze_context node
     -> ContextAnalysisAgent
        -> PatternAnalyzer, MissingRecordPolicy
  -> detect_risk node
     -> RiskDetectionAgent
        -> RiskSignalPolicy
  -> save_records node
     -> RecordRepository
  -> suggest_care node
     -> SuggestionAgent
        -> SuggestionComposer
  -> plan_reminders node
     -> ReminderAgent
        -> ReminderPlanner
```

역할 경계:

| 계층 | 책임 | LangChain/LangGraph 의존 |
| --- | --- | --- |
| `application/pipelines/` | workflow 순서, 분기, 상태 조립 | LangGraph adapter 구현만 허용 |
| `application/agents/` | use case 단위 port 호출 | 의존하지 않음 |
| `application/interfaces/` | application port 계약 | 의존하지 않음 |
| `infrastructure/llm/` | 실제 model, structured output, fallback, retry | LangChain 의존 허용 |
| `tools/` | agent가 호출할 수 있는 기능 wrapper | LangChain tool adapter 허용 |
| `middleware/` | LangChain/LangGraph middleware factory | LangChain middleware 의존 허용 |

`create_agent`는 기본값이 아니다. 다음 조건이 생길 때만 특정 capability의 infrastructure adapter 안에서 도입한다.

- 여러 tool을 상황에 따라 반복 호출해야 한다.
- model이 tool 결과를 보고 다음 행동을 선택해야 한다.
- agent loop, memory, human-in-the-loop, tool error handling이 필요하다.
- LangChain middleware lifecycle을 그대로 쓰는 이점이 단순 provider보다 크다.

단일 structured output 호출은 `create_agent`로 감싸지 않는다. 예를 들어 `record_structuring`은 입력 문장을 구조화 DTO로 변환하는 단일 호출이므로 `RecordStructurer` provider 안에서 처리한다.

## Middleware

| 파일 | 책임 |
| --- | --- |
| `src/middleware/safety.py` | 위험 질문/금지 응답/병원 상담 안내 guard |
| `src/middleware/logging.py` | agent/tool call debug log middleware factory |
| `src/middleware/tracing.py` | agent/tool call 추적 |
| `src/middleware/retry.py` | 안전한 retry 정책 |
| `src/middleware/validation.py` | 입력/출력 schema 검증 |

`middleware/`는 자체 middleware 실행 프레임워크가 아니다. LangChain/LangGraph가 제공하는 lifecycle hook을 프로젝트 규칙에 맞게 감싸는 factory 위치다.

예:

```text
middleware/logging.py
  -> build_agent_debug_middleware(...)
     -> langchain.agents.middleware.wrap_tool_call

middleware/retry.py
  -> build_tool_retry_middleware(...)
     -> package retry/fallback 기능 조합

middleware/validation.py
  -> build_tool_validation_middleware(...)
     -> tool input/output boundary 검증
```

### Middleware 등록 위치

middleware는 한 곳에 전부 붙이지 않는다. 관심사에 따라 등록 지점을 나눈다.

```text
workflow 관찰
  -> LangGraph stream/tracing

특정 LLM provider fallback/retry/timeout
  -> infrastructure/llm/* provider 또는 runnable

특정 LangChain agent loop 정책
  -> create_agent(..., middleware=[...])

특정 tool retry
  -> ToolRetryMiddleware(tools=[...]) 또는 tool adapter
```

현재 `pet_log`에서는 node별 wiring에서 필요한 middleware만 명시한다.

```text
build_pet_log_node_wiring(...)
  structure_record
    tools=[]
    middleware=[]

  load_context
    tools=[get_pet_profile, list_recent_records]
    middleware=[agent_debug_log]

  save_records
    tools=[save_pet_record]
    middleware=[agent_debug_log]
```

디버깅 로그 middleware도 agent/tool 내부 관찰 목적이면 graph 전역이 아니라 해당 node 또는 agent adapter에 붙인다. graph stream log는 workflow 진행 관찰용으로만 사용한다.

#### Graph-level

LangGraph pipeline 전체 실행 흐름, node 완료 로그, 진행상황 표시는 graph stream을 사용한다.

```python
for update in graph.stream({"input": input}, stream_mode="updates"):
    for node_name, node_state in update.items():
        logger.info(
            "pet_log_agent_graph_node_completed node=%s updated_keys=%s",
            node_name,
            ",".join(sorted(node_state.keys())),
        )
```

이 로그에는 raw 보호자 입력, 이미지, API error payload를 남기지 않는다. node 이름과 업데이트된 state key 정도만 남긴다.

Graph-level retry는 idempotent node에만 제한한다. `save_records`처럼 DB write side effect가 있는 node에는 blanket retry를 적용하지 않는다.

#### Provider-level

model fallback, timeout, transient retry는 실제 model을 아는 `infrastructure/llm/` provider가 담당한다.

```text
RecordStructuringAgent
  -> RecordStructurer
     -> primary structured model
     -> fallback structured model
```

`record_structuring` fallback은 이 위치에 둔다.

```python
primary = build_record_structuring_model(primary_model, api_key, timeout)
fallback = build_record_structuring_model(fallback_model, api_key, timeout)
structured_model = primary.with_fallbacks(
    [fallback],
    exceptions_to_handle=(TimeoutError, ConnectionError),
)
```

fallback 대상 예외는 좁게 잡는다. timeout, rate limit, 일시적 provider 장애는 fallback 대상이 될 수 있지만 schema mapping 오류나 domain validation 오류는 prompt/schema 버그를 가릴 수 있으므로 기본 fallback 대상에 넣지 않는다.

#### create_agent-level

LangChain `create_agent`를 쓰는 capability가 생기면 해당 agent 생성 지점에서만 middleware를 등록한다.

```python
from langchain.agents import create_agent
from langchain.agents.middleware import ModelFallbackMiddleware, ModelRetryMiddleware

agent = create_agent(
    model="openai:gpt-5-mini",
    tools=[record_lookup_tool, schedule_lookup_tool],
    middleware=[
        ModelRetryMiddleware(max_retries=2),
        ModelFallbackMiddleware("openai:gpt-5-nano"),
    ],
)
```

이 adapter는 `infrastructure/llm/` 또는 별도 infrastructure adapter 안에 둔다. `application/agents/`에서 `create_agent`, `ChatOpenAI`, `ModelFallbackMiddleware`를 직접 import하지 않는다.

#### Tool-level

외부 API 조회처럼 특정 tool만 재시도가 필요한 경우 tool 단위로 제한한다.

```python
from langchain.agents.middleware import ToolRetryMiddleware

middleware = [
    ToolRetryMiddleware(
        max_retries=2,
        tools=["record_lookup", "schedule_lookup"],
        retry_on=(TimeoutError, ConnectionError),
    )
]
```

모든 tool에 blanket retry를 걸지 않는다. 저장, 알림 발송, 결제 같은 side effect tool은 idempotency key나 중복 방지 정책이 먼저 필요하다.

## Tools

| 파일 | 책임 |
| --- | --- |
| `src/tools/record_tools.py` | `list_recent_records`, `save_pet_record` 같은 기록 tool factory |
| `src/tools/profile_tools.py` | `get_pet_profile` 같은 프로필 tool factory |
| `src/tools/schedule_tools.py` | 일정/리마인더 조회 |
| `src/tools/care_tools.py` | 케어 답변 보조 기능 |
| `src/tools/speech_tools.py` | STT/TTS tool wrapper |

현재 관리 방식:

```text
tools/
  개별 LangChain tool factory
  repository/provider/usecase를 호출하는 얇은 adapter

agent_runtime/tool_registry.py
  node/agent별 tool bundle 구성
  read tool과 write tool을 분리

middleware/
  LangChain/LangGraph middleware factory

application/pipelines/pet_log_graph.py
  StateGraph workflow와 node wiring
```

## Tool 설계 기준

- tool 이름은 안정적이고 명시적으로 둔다.
- 입력은 schema-first로 좁게 정의한다.
- 출력은 deterministic shape으로 둔다.
- 위험 작업은 작은 tool로 분리한다.
- error output에는 원인 힌트, 재시도 조건, 중단 조건을 포함한다.

### Tool 등록 방법

tool은 domain/application 로직을 직접 포함하지 않는다. repository, provider, service adapter를 호출하는 얇은 wrapper로 둔다.

```python
from langchain_core.tools import tool


@tool("record_lookup")
def record_lookup(pet_id: str, lookback_days: int = 30) -> dict[str, object]:
    """최근 기록을 조회한다."""
    records = record_repository.list_recent(pet_id, lookback_days)
    return {"records": [to_payload(record) for record in records]}
```

입력 schema를 더 엄격히 관리해야 하면 `StructuredTool`과 Pydantic args schema를 사용한다.

```python
from pydantic import BaseModel, Field
from langchain_core.tools import StructuredTool


class RecordLookupArgs(BaseModel):
    pet_id: str = Field(min_length=1)
    lookback_days: int = Field(default=30, ge=1, le=365)


record_lookup_tool = StructuredTool.from_function(
    func=record_lookup,
    name="record_lookup",
    args_schema=RecordLookupArgs,
)
```

registry는 전체 tool 목록을 들고 있지만 agent에는 필요한 tool만 주입한다.

```text
build_context_tools(...)
  -> get_pet_profile
  -> list_recent_records

build_record_write_tools(...)
  -> save_pet_record

load_context node
  -> build_context_tools(...)

save_records node
  -> build_record_write_tools(...)
```

등록 규칙:

- tool 이름은 stable API처럼 관리한다.
- 같은 이름의 중복 등록은 실패시킨다.
- agent별 tool allowlist를 둔다.
- side effect tool은 읽기 tool과 분리한다.
- tool output은 domain object를 그대로 노출하지 말고 payload shape으로 변환한다.
- error output에는 raw exception이나 secret을 넣지 않는다.

## Speech Provider

| 파일 | 책임 |
| --- | --- |
| `src/infrastructure/speech/speech_to_text.py` | 음성 입력을 text로 변환하는 STT provider |
| `src/infrastructure/speech/text_to_speech.py` | text 응답을 음성 출력으로 변환하는 TTS provider |

STT/TTS provider는 application layer에서 직접 호출하지 않고 interface 뒤로 숨긴다. 파일 업로드, MIME type, streaming 같은 transport 처리는 `presentation/`에서 처리한다.
