# Backend Architecture 리팩토링 메모

이 문서는 현재 backend 구조에서 과해진 추상화와 skeleton 누적 위험을 정리한다. 목적은 Clean Architecture 의도 자체를 버리는 것이 아니라, 실제 제품 흐름에 필요한 경계만 남기고 미래 확장 영역은 문서와 backlog로 관리하는 것이다.

## 판단 요약

현재 구조는 `기록 입력 -> DB 저장 -> 분석/제안 -> 케어 질문`의 핵심 흐름을 분리하려는 의도는 좋다. 다만 MVP 단계 기준으로는 `Protocol`, wrapper agent, 구현 없는 skeleton module이 동시에 늘어나면서 파일 탐색 비용이 커졌다.

우선 줄일 대상은 실제 product path에 아직 붙지 않은 미래 agent/runtime/RAG 세부 인터페이스다. 현재 코드에서는 `application.interfaces` 패키지를 제거하고, repository/provider/policy의 concrete class를 직접 wiring한다.

## 문제 1. `application.interfaces` 제거

과거 `application.interfaces`에는 agents, providers, policies, repositories, pipelines, composers, knowledge까지 많은 `Protocol`이 나뉘어 있었다. 하지만 실제 구현은 단순 위임이거나 `NotImplementedError` skeleton인 경우가 많았다.

이 상태에서는 인터페이스가 복잡도를 줄이기보다 다음 비용을 만든다.

- 구현체를 찾기 위해 여러 파일을 왕복해야 한다.
- import test만으로 기능이 완료된 것처럼 보일 수 있다.
- 새 기능을 추가할 때 실제 필요보다 먼저 contract가 늘어난다.

### 현재 유지하는 코드 표면

현재 제품 흐름에서 직접 쓰는 경계는 concrete class와 테스트 계약으로 유지한다.

- `PetProfileRepository`
- `RecordRepository`
- `ScheduleRepository`
- `RecordStructurer`
- `SpeechToTextProvider`
- `CareAnswerProvider`

### 문서로만 남길 미래 영역

아직 구현 스프린트가 시작되지 않았거나 제품 경로에 붙지 않은 영역은 interface보다 문서/backlog에 먼저 둔다.

- RAG ingestion
- embedding provider
- agent runtime
- tool registry
- middleware chain
- notification/proactive/photo agent

## 문제 2. Agent와 Provider 경계가 애매함

일부 agent는 provider를 감싼 얇은 wrapper에 가깝다. 예를 들어 `RecordStructuringAgent`는 `RecordStructurer`를 호출하고 결과를 반환한다. `CareAnswerProvider`, `PetPersonaResponder`, `RecordSummaryProvider` 주변도 현재 단계에서는 "한 번 호출하고 결과 반환"에 가까운 흐름이 많다.

agent layer가 실질 가치를 가지려면 다음 중 하나가 있어야 한다.

- 여러 provider/policy를 조합하는 orchestration
- retry, fallback, timeout, 비용 제어
- memory 또는 context window 관리
- tool use
- 안전 정책 적용과 결과 검증

이 조건이 없다면 pipeline이 provider/policy를 직접 의존해도 현재 규모에서는 충분하다. 단순 위임만 하는 wrapper agent는 제거 후보로 본다.

## 문제 3. `agent_runtime`, `tools`, `middleware`가 제품 흐름과 느슨함

폴더와 구조는 있지만 핵심 HTTP 기록 입력 흐름은 현재 다음 경로를 탄다.

```text
composition
-> LangGraphPetLogAgentPipeline
-> agents/providers/repositories
```

`agent_runtime`, `tools`, `middleware`는 미래 확장 표면에 가깝다. 현재 reader에게 "이게 실제 실행 경로인가?"라는 혼란을 줄 수 있으므로 다음 중 하나로 정리한다.

- 실제 product path에 붙일 때까지 docs-only planned 상태로 둔다.
- 코드에 남긴다면 `experimental` 성격을 명확히 한다.
- smoke test가 없는 runtime/tool skeleton은 새로 늘리지 않는다.

## 문제 4. Skeleton이 구현 상태를 흐림

`NotImplementedError` class와 import test만 있는 skeleton은 구조를 빨리 잡는 데는 유용하지만, 누적되면 기능 완료 상태를 흐린다.

앞으로 skeleton을 추가할 때는 다음 조건을 지킨다.

- 실제 구현 스프린트가 가까운 경우에만 코드 skeleton을 만든다.
- skeleton이 필요한 이유와 제외한 구현 범위를 문서에 남긴다.
- import test만 통과하는 module은 기능 완료로 보지 않는다.
- 후속 구현 항목은 별도 backlog 문서나 sprint card에 둔다.

## 문제 5. CareContext RAG 연결 방향

`CareContext`에 RAG를 붙이는 방향은 맞다. 다만 구현 전에 ingestion, embedding, repository, retriever 인터페이스를 모두 만들면 구조가 먼저 커진다.

현재 단계의 최소 경계는 Protocol interface가 아니라 `CareKnowledgeRetriever` 구체 skeleton 클래스 하나면 충분하다.

```text
CareAnswerProvider
-> CareKnowledgeRetriever
-> tuple[CareKnowledgeHit, ...]
```

다음 항목은 실제 구현 스프린트에서 필요가 확인될 때 뽑는다.

- `CareKnowledgeIngestion`
- `EmbeddingProvider`
- `CareKnowledgeRepository`
- URL fetcher
- chunker
- vector persistence adapter

## 리팩토링 기준

리팩토링할 때는 다음 순서로 판단한다.

1. 실제 product path에서 호출되는가?
2. 교체 가능성이 현재 요구사항에 있는가?
3. 테스트에서 fake/mock이 필요해 경계가 도움이 되는가?
4. 단순 위임 이상의 정책, 조합, 실패 처리가 있는가?
5. 구현이 없다면 코드보다 문서/backlog가 더 적절하지 않은가?

이 중 1-4에 해당하지 않고 5에 해당하면 코드 인터페이스를 늘리지 않는다.

## 권장 정리 순서

1. `application.interfaces` 패키지는 제거하고 concrete class 호출 계약으로 정리한다.
2. 단순 provider 위임만 하는 wrapper agent를 제거하거나 pipeline 내부 호출로 접는다.
3. `agent_runtime`, `tools`, `middleware`는 실제 실행 경로가 생기기 전까지 experimental 또는 docs-only로 표시한다.
4. 구현 없는 future skeleton은 문서 backlog로 옮긴다.
5. RAG는 `CareKnowledgeRetriever` 구체 skeleton만 유지하고 ingestion/embedding/repository는 구현 단계에서 도입한다.

## 현재 결론

Clean Architecture 방향은 유지한다. 다만 MVP 기준에서는 인터페이스 수를 줄이고, 미래 확장 표면은 코드가 아니라 문서로 관리한다. 핵심 경계는 남기되 `구현 없는 Protocol + wrapper agent + skeleton module` 조합은 새로 만들지 않는 것을 기본 원칙으로 둔다.
