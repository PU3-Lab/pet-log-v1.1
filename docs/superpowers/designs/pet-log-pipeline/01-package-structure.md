# 패키지 구조

패키지는 `pet_log/` wrapper 없이 `src/` 아래의 최상위 패키지로 구성한다. 폴더명은 구현자가 바로 의미를 읽을 수 있도록 `agents`, `pipelines`, `agent_runtime`, `middleware`, `tools`, `infrastructure`, `presentation`을 기준으로 한다.

## 폴더 구성표

| 경로 | 유형 | 책임 | 현재 단계 |
| --- | --- | --- | --- |
| `src/domain/` | domain | framework 의존 없는 도메인 타입과 정책명 | 생성 |
| `src/domain/enums.py` | domain | category, status, severity, chat mode literal | 타입만 |
| `src/domain/models.py` | domain | profile, record, insight, suggestion, schedule, chat context 타입 | 타입만 |
| `src/domain/events.py` | domain | record created, insight generated, reminder planned 이벤트 타입 | 파일만 |
| `src/application/` | application | use case pipeline과 agent 정의 | 생성 |
| `src/application/dto.py` | application | pipeline input/output DTO | 타입만 |
| `src/application/agents/` | application | 제품 기능을 맡는 LLM agent 역할 단위 | 함수 호출 구성만 |
| `src/application/pipelines/` | application | core/surface pipeline shell | 함수 호출 구성만 |
| `src/application/errors.py` | application | pipeline error 계약 | 타입만 |
| `src/agent_runtime/` | agent runtime | LLM 실행 loop, prompt 조립, node/agent별 tool/middleware registry, memory | 일부 구현 |
| `src/middleware/` | middleware | LangChain/LangGraph middleware factory, safety, logging, tracing, retry, validation | 일부 구현 |
| `src/tools/` | tools | agent가 호출 가능한 schema-first LangChain tool factory | 일부 구현 |
| `src/infrastructure/llm/` | infrastructure | OpenAI/local model provider 구현체 뼈대 | skeleton만 |
| `src/infrastructure/speech/` | infrastructure | STT/TTS provider 구현체 뼈대 | skeleton만 |
| `src/infrastructure/policies/` | infrastructure | rule/policy 구현체 뼈대 | skeleton만 |
| `src/infrastructure/repositories/` | infrastructure | 저장소 구현체 뼈대 | skeleton만 |
| `src/infrastructure/composers/` | infrastructure | 화면/리포트 composer 구현체 뼈대 | skeleton만 |
| `src/infrastructure/notifications/` | infrastructure | notification 구현 후보 | 폴더만 |
| `src/infrastructure/clock/` | infrastructure | clock 구현 후보 | 폴더만 |
| `src/presentation/cli/` | presentation | CLI entrypoint 후보 | 폴더만 |
| `src/presentation/http/` | presentation | HTTP entrypoint 후보 | 폴더만 |
| `src/composition.py` | composition | concrete implementation wiring 위치 | 파일만 |
| `pyproject.toml` | packaging | `src` layout package 설정 | 설정됨 |
| `tests/` | tests | class contract와 pipeline 단위 테스트 | 후속 |

## 폴더 트리

```text
backend/
  pyproject.toml
  src/
    __init__.py
    composition.py
    domain/
    application/
      interfaces/
        __init__.py
        agents.py
        composers.py
        pipelines.py
        policies.py
        providers.py
        repositories.py
      agents/
      pipelines/
    agent_runtime/
      runtime.py
      prompts.py
      tool_registry.py
      memory.py
    middleware/
      safety.py
      logging.py
      tracing.py
      retry.py
      validation.py
    tools/
      record_tools.py
      profile_tools.py
      schedule_tools.py
      care_tools.py
      speech_tools.py
    infrastructure/
      llm/
      speech/
      composers/
      policies/
      repositories/
      notifications/
      clock/
    presentation/
      cli/
      http/
  tests/
```
