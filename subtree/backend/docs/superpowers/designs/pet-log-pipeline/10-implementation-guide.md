# 구현 가이드

이 문서는 처음 보는 개발자가 펫로그 backend 구조를 빠르게 이해하고, 기능별로 어디를 구현해야 하는지 찾기 위한 안내서다.

## 한 줄 요약

```text
presentation -> application pipeline -> application agents -> infrastructure/tools/middleware/agent_runtime
```

- `presentation`은 외부 요청이 들어오는 입구다.
- `application`은 제품 기능 흐름을 조립한다.
- `infrastructure`는 DB, LLM, rule 같은 실제 구현체다.
- `tools`는 LangChain tool adapter, `middleware`는 LangChain/LangGraph middleware factory, `agent_runtime`은 node/agent별 wiring을 맡는 공통 계층이다.

## 먼저 읽을 파일

| 순서 | 파일 | 이유 |
| --- | --- | --- |
| 1 | `docs/superpowers/designs/pet-log-pipeline-interface-design.md` | 전체 설계 인덱스 |
| 2 | `docs/superpowers/designs/pet-log-pipeline/01-package-structure.md` | 폴더별 책임 |
| 3 | `docs/superpowers/designs/pet-log-pipeline/08-contracts.md` | DTO와 class 계약 |
| 4 | `src/infrastructure/` | DB, LLM, speech, policy, composer 구현체 |
| 5 | `src/composition.py` | 구현체를 조립할 위치 |

## 폴더별 역할

### `src/domain/`

순수 데이터 타입이 있는 곳이다. FastAPI, DB, OpenAI SDK를 import하지 않는다.

구현 예:
- `PetProfile`
- `PetRecord`
- `StructuredRecordCandidate`
- `StructuredRecordBatch`
- `CareInsight`
- `CareSuggestion`

수정 기준:
- 새로운 핵심 개념이 생길 때만 수정한다.
- DB row나 API request 모양에 맞추기 위해 domain을 오염시키지 않는다.

### `src/application/dto.py`

pipeline의 입력과 출력 객체가 있는 곳이다.

구현 예:
- `PetLogAgentInput`
- `PetLogAgentResult`
- `HomeFeedResult`
- `CareQuestionResult`
- `PetChatResult`

수정 기준:
- 화면/API/agent 흐름에서 새 입력 또는 결과 필드가 필요할 때 수정한다.

`src/application/interfaces/` 패키지는 제거했다. 구현 없는 `Protocol`을 먼저 만들기보다 현재 제품 경로에서 호출되는 concrete class와 테스트 계약을 기준으로 작업한다.

수정 기준:
- agent나 pipeline이 새 능력을 필요로 할 때 먼저 interface를 정의한다.
- 구현체 이름이나 특정 기술 이름을 interface에 넣지 않는다.

### `src/application/agents/`

제품 기능을 맡는 LLM agent 단위다. 각 agent는 직접 DB나 OpenAI SDK를 호출하지 않고 interface만 사용한다.

예:
- `RecordStructuringAgent`
- `ContextAnalysisAgent`
- `RiskDetectionAgent`
- `SuggestionAgent`
- `ReminderAgent`
- `RecordSummaryAgent`
- `ProactiveQuestionAgent`
- `NotificationAgent`
- `PhotoRecordUnderstandingAgent`
- `PetPersonaAgent`
- `CareContextBuilder`

수정 기준:
- 여러 interface 호출을 어떤 순서로 묶을지 정할 때 수정한다.
- 실제 DB/LLM/rule 로직은 여기 넣지 않는다.

### `src/application/pipelines/`

사용자 기능 흐름을 조립하는 곳이다.

예:
- `PetLogAgentPipeline`: 기록 입력 core 흐름
- `HomeFeedPipeline`: 홈 화면 흐름
- `CareQuestionPipeline`: AI 케어 질문 흐름
- `PetChatPipeline`: 펫 대화 흐름
- `HospitalSummaryPipeline`: 병원 제출 요약 흐름

수정 기준:
- 기능 흐름의 순서가 바뀌거나 새 surface가 생길 때 수정한다.

### `src/infrastructure/`

실제 구현체가 들어가는 곳이다. 대부분의 다음 개발은 여기서 시작한다.

예:
- `infrastructure/llm/`: OpenAI, 로컬 모델, mock LLM provider
- `infrastructure/speech/`: STT/TTS provider
- `infrastructure/repositories/`: DB 또는 in-memory 저장소
- `infrastructure/policies/`: rule-based 분석/추천/위험 감지
- `infrastructure/composers/`: 홈 카드, 병원 리포트 문구 조립

수정 기준:
- 실제 동작을 만들 때 구현한다.
- application interface를 상속하거나 충족해야 한다.

### `src/agent_runtime/`

LLM agent 실행 공통 계층이다.

예:
- prompt 조립
- node/agent별 tool registry
- node/agent별 middleware wiring
- tool calling loop
- memory hook
- LangGraph adapter 후보

수정 기준:
- 단순 rule/mock 구현 단계에서는 건드리지 않아도 된다.
- 실제 tool-calling LLM agent를 붙일 때 구현한다.
- 상태 저장, 중단/재개, human-in-the-loop, 복수 tool 분기 흐름이 필요하면 LangGraph를 우선 검토한다.
- LangChain은 model/tool adapter 또는 prebuilt agent가 명확히 필요한 경우에만 보조적으로 쓴다.

### `src/middleware/`

LangChain/LangGraph에 붙일 middleware factory 위치다. 자체 middleware chain framework를 만들지 않는다.

예:
- safety
- logging
- tracing
- retry
- validation

수정 기준:
- 여러 node/agent에 재사용할 middleware factory만 넣는다.
- 특정 기능 하나만을 위한 로직은 agent나 infrastructure에 둔다.
- raw 보호자 입력, prompt 전문, tool args 전문, secret/env 값은 로그에 남기지 않는다.
- graph 진행 로그는 `stream_mode="updates"`에서 처리하고, agent/tool 내부 디버깅은 해당 node/agent에 middleware로 붙인다.

### `src/tools/`

LLM agent가 호출할 수 있는 LangChain tool adapter 묶음이다.

예:
- 기록 조회: `list_recent_records`
- 기록 저장: `save_pet_record`
- 프로필 조회: `get_pet_profile`
- 일정 조회
- 케어 답변 보조 기능
- STT/TTS 보조 기능

수정 기준:
- agent_runtime의 tool calling에서 사용할 기능을 schema-first로 만들 때 구현한다.
- tool은 business logic을 직접 갖지 않고 repository/provider/usecase를 호출하는 얇은 wrapper로 둔다.
- 읽기 tool과 쓰기 tool은 registry 단계에서 분리한다.

### `src/presentation/`

외부 요청이 application으로 들어오는 입구다.

예:
- `presentation/http/`: FastAPI router/controller 후보
- `presentation/cli/`: 로컬 CLI demo 후보

수정 기준:
- HTTP API나 CLI를 붙일 때 구현한다.
- 비즈니스 로직은 넣지 않고 pipeline 호출과 request/response 변환만 둔다.

### `src/composition.py`

구현체를 실제 pipeline에 연결하는 곳이다.

예:

```text
RecordStructurer 구현체 생성
RecordRepository 구현체 생성
RecordStructuringAgent 생성
PetLogAgentPipeline 생성
```

수정 기준:
- interface 구현체를 조립해서 실행 가능한 pipeline을 만들 때 수정한다.

composition 전략:
- 현재 단계에서는 함수 기반 composition을 유지한다.
- `src/composition.py`는 production wiring 전용으로 둔다.
- smoke script, 테스트 fixture, seed 고정 날짜 같은 수동 검증 전용 조립은 `src/composition.py`에 넣지 않는다.
- agent 또는 pipeline builder가 3개 이상으로 늘어나면 `composition/` 패키지 분리를 검토한다.
- `composition/` 패키지로 전환할 때는 `pyproject.toml`의 `py-modules = ["composition"]` 설정 변경까지 함께 처리한다.
- DB connection close, request scope, background worker lifecycle이 중요해지면 `AppContext` dataclass 또는 contextmanager를 도입한다.
- DI container class는 환경별 wiring과 lifecycle 정책이 실제로 복잡해진 뒤 검토한다.

## 기능별 구현 위치

| 만들 기능 | 먼저 볼 class | 구현 위치 | 연결 위치 |
| --- | --- | --- | --- |
| 자연어 기록 구조화 | `RecordStructurer` | `src/infrastructure/llm/record_structuring/provider.py` | `RecordStructuringAgent` |
| 사진 기록 이해 | `ImageRecordUnderstandingProvider` | `src/infrastructure/llm/image_record_understanding/` | `PhotoRecordUnderstandingAgent` |
| 펫 프로필 조회 | `PetProfileRepository` | `src/infrastructure/repositories/pet_profile_repository.py` | `CareContextBuilder`, pipeline |
| 최근 기록 조회 | `RecordRepository` | `src/infrastructure/repositories/record_repository.py` | `ContextAnalysisAgent`, `CareContextBuilder` |
| 기록 저장 | `RecordRepository` | `src/infrastructure/repositories/record_repository.py` | `PetLogAgentPipeline` |
| 일정 조회 | `ScheduleRepository` | `src/infrastructure/repositories/schedule_repository.py` | `CareContextBuilder`, `ReminderAgent` |
| 위험 신호 감지 | `RiskSignalPolicy` | `src/infrastructure/policies/risk_signal_policy.py` | `RiskDetectionAgent` |
| 기록 누락 감지 | `MissingRecordPolicy` | `src/infrastructure/policies/missing_record_policy.py` | `ContextAnalysisAgent` |
| 원인 추정 제한 | `CauseHypothesisPolicy` | `src/infrastructure/policies/cause_hypothesis_policy.py` | `ContextAnalysisAgent` 또는 `SuggestionAgent` |
| 행동 제안 생성 | `SuggestionComposer` | `src/infrastructure/policies/suggestion_composer.py` | `SuggestionAgent` |
| 리마인더 생성 | `ReminderPlanner` | `src/infrastructure/policies/reminder_planner.py` | `ReminderAgent` |
| 기록 요약 생성 | `RecordSummaryProvider` | `src/infrastructure/llm/record_summary/provider.py` | `RecordSummaryAgent` |
| 기록 요약 fallback/포맷팅 | `RecordSummaryComposer` | `src/infrastructure/composers/record_summary_composer.py` | `RecordSummaryAgent` |
| 홈 선제 질문 생성 | `ProactiveQuestionPolicy` | `src/infrastructure/policies/proactive_question/` | `ProactiveQuestionAgent` |
| 알림 후보 생성 | `NotificationPolicy` | `src/infrastructure/notifications/policy.py` | `NotificationAgent` |
| LangGraph runtime | `PetLogAgentRuntime` | `src/agent_runtime/runtime.py` | `agent_runtime` 내부 adapter |
| AI 케어 답변 | `CareAnswerProvider` | `src/infrastructure/llm/care_answer/provider.py` | `CareQuestionPipeline` |
| 펫 말투 응답 | `PetPersonaResponder` | `src/infrastructure/llm/pet_persona/provider.py` | `PetPersonaAgent` |
| 음성 입력 STT | `SpeechToTextProvider` | `src/infrastructure/speech/speech_to_text.py` (`whisper medium`) | `presentation`, `tools/speech_tools.py` |
| 음성 응답 TTS | `TextToSpeechProvider` | `src/infrastructure/speech/text_to_speech.py` (`edge-tts`) | `presentation`, `tools/speech_tools.py` |
| 홈 화면 카드 조립 | `HomeFeedComposer` | `src/infrastructure/composers/home_feed_composer.py` | `HomeFeedPipeline` |
| 병원 제출 요약 | `HospitalReportComposer` | `src/infrastructure/composers/hospital_report_composer.py` | `HospitalSummaryPipeline` |
| 병원 검색/예약/공유 전송 | hospital integration contract 후보 | 별도 bounded context 후보 | hospital integration pipeline 후보 |
| 공동 관리 | shared care contract 후보 | 별도 bounded context 후보 | shared care pipeline 후보 |
| IoT/디바이스 수집 | device ingestion contract 후보 | 별도 bounded context 후보 | device ingestion pipeline 후보 |
| HTTP API | presentation route | `src/presentation/http/` | `src/composition.py` |

## 모델 기반 요약 구현 원칙

기획서의 분석 리포트, 문제 행동 요약, 주간/월간 리포트, 병원 제출용 요약은 사람이 읽는 자연어 결과가 핵심이다. 따라서 실제 요약 문장은 규칙 composer만으로 완성하지 않고 모델 provider를 통해 생성한다.

권장 책임 분리:

```text
ContextAnalysisAgent
  -> 누적 기록 분석
  -> ContextAnalysisResult

RecordSummaryAgent
  -> 요약 대상과 분석 결과 조립
  -> RecordSummaryProvider 호출
  -> RecordSummaryResult 반환
```

구현 규칙:

- `RecordSummaryAgent`는 OpenAI SDK, LangChain, LangGraph 타입을 직접 import하지 않는다.
- 실제 GPT 또는 로컬 모델 호출은 `RecordSummaryProvider` 구현체가 담당한다.
- 현재 `RecordSummaryProvider`는 LangChain `ChatOpenAI.with_structured_output()`을 사용하는 infrastructure 구현체다.
- `OPENAI_API_KEY`가 없으면 `RecordSummaryProvider.summarize()`는 실행 시 실패한다.
- 기본 모델은 `gpt-5-mini`이며, `OPENAI_RECORD_SUMMARY_MODEL` 환경변수로 교체할 수 있다.
- structured output은 LangChain structured model call과 Pydantic schema로 `RecordSummaryResult` 형태에 맞춘다.
- `RecordSummaryComposer`는 모델을 쓰지 않는 fallback, 테스트용 deterministic 요약, 모델 결과 포맷팅에만 사용한다.
- LangGraph를 붙일 때는 `RecordSummaryAgent.summarize()`를 node로 감싸고, provider/composer/policy 구현체를 직접 node로 등록하지 않는다.
- 요약 문장은 진단처럼 보이면 안 되며, 위험 신호는 `SafetyNotice` 또는 병원 상담 안내로 분리한다.

팀원이 채울 파일 기준:

| 파일 | 책임 |
| --- | --- |
| `src/infrastructure/llm/record_summary/provider.py` | provider orchestration, 모델 호출 순서 |
| `src/infrastructure/llm/record_summary/model.py` | `ChatOpenAI.with_structured_output()` 생성 |
| `src/infrastructure/llm/record_summary/schema.py` | 모델 structured output Pydantic schema |
| `src/infrastructure/llm/record_summary/prompt.py` | system/user prompt 생성 |
| `src/infrastructure/llm/record_summary/mapper.py` | domain 입력 payload 변환, model output -> `RecordSummaryResult` 변환 |

## 추천 구현 순서

### 1. In-memory repositories

처음에는 DB 없이 동작을 확인하는 것이 좋다.

구현 위치:
- `src/infrastructure/repositories/pet_profile_repository.py`
- `src/infrastructure/repositories/record_repository.py`
- `src/infrastructure/repositories/schedule_repository.py`

검증 목표:
- 펫 프로필을 조회할 수 있다.
- 최근 기록을 조회할 수 있다.
- 구조화 후보를 기록으로 저장할 수 있다.

### 2. 모델 기반 `RecordStructurer`

자연어 입력을 구조화 후보 묶음으로 바꾼다. 현재 구현은 LangChain `ChatOpenAI.with_structured_output()`을 사용한다.

구현 위치:
- `src/infrastructure/llm/record_structuring/provider.py`
- `src/infrastructure/llm/record_structuring/model.py`
- `src/infrastructure/llm/record_structuring/schema.py`
- `src/infrastructure/llm/record_structuring/prompt.py`
- `src/infrastructure/llm/record_structuring/mapper.py`

검증 목표:
- `"오늘 밥을 조금 먹고 산책은 못 했어"` 같은 입력이 식사 후보와 산책 후보를 가진 `StructuredRecordBatch`로 변환된다.
- `OPENAI_API_KEY`가 없으면 `RecordStructurer.structure()`는 실행 시 실패한다.
- 기본 모델은 `gpt-5-mini`이며, `OPENAI_RECORD_STRUCTURING_MODEL` 환경변수로 교체할 수 있다.
- 일시적 provider 장애 fallback 모델은 `OPENAI_RECORD_STRUCTURING_FALLBACK_MODEL` 환경변수로 설정한다.

수동 smoke 확인:

```bash
uv run python -B scripts/smoke_record_structurer.py
```

문장 구조화 후 DB 저장까지 확인:

```bash
uv run python -B scripts/smoke_record_input_to_db.py
```

### 3. Rule-based policies

분석/위험/제안/리마인더는 처음에는 rule-based로 만든다.

구현 위치:
- `src/infrastructure/policies/pattern_analyzer.py`
- `src/infrastructure/policies/risk_signal_policy.py`
- `src/infrastructure/policies/suggestion_composer.py`
- `src/infrastructure/policies/reminder_planner.py`

검증 목표:
- 반복되는 이상 패턴을 notice로 만들 수 있다.
- 위험 키워드는 safety notice로 만들 수 있다.
- 보호자 행동 제안을 만들 수 있다.

### 4. `composition.py` wiring

각 구현체를 pipeline에 연결한다.

구현 위치:
- `src/composition.py`

검증 목표:
- `build_pet_log_agent_pipeline()`이 실행 가능한 `PetLogAgentPipeline`을 반환한다.

### 5. CLI 또는 HTTP entrypoint

pipeline이 조립된 뒤 외부 입구를 붙인다.

구현 위치:
- CLI: `src/presentation/cli/`
- HTTP: `src/presentation/http/`

검증 목표:
- CLI 또는 HTTP 요청으로 기록 입력을 처리할 수 있다.

### 6. 실제 LLM provider

mock/rule 기반 흐름이 검증된 뒤 실제 LLM을 붙인다.

구현 위치:
- `src/infrastructure/llm/`
- 필요하면 `src/agent_runtime/`
- 필요하면 `src/tools/`

검증 목표:
- LLM provider를 바꿔도 application pipeline은 바뀌지 않는다.

## 구현할 때 지켜야 할 방향

- 새 기능은 먼저 `application/dto.py`, 관련 pipeline/agent, `infrastructure/` 구현체 계약을 확인한다.
- application layer에서 DB, FastAPI, OpenAI SDK를 직접 import하지 않는다.
- 실제 동작은 `infrastructure` 또는 `agent_runtime/tools`에 둔다.
- pipeline은 흐름을 조립하고, 세부 판단 로직을 과하게 들고 있지 않는다.
- 테스트는 작은 경계부터 시작한다.
- 의료 판단처럼 위험한 문구는 `SafetyNotice`와 병원 상담 안내로 제한한다.

## 빠른 예시

### 자연어 기록 구조화를 구현한다면

1. `RecordStructurer`를 확인한다.
2. `src/infrastructure/llm/record_structuring/` 하위 파일을 확인한다.
3. `RecordStructuringAgent`가 해당 구현체를 호출하는지 확인한다.
4. `src/composition.py`에서 구현체를 agent에 주입한다.
5. 구조화 입력/출력 테스트를 추가한다.

### DB 저장을 구현한다면

1. `RecordRepository`를 확인한다.
2. `src/infrastructure/repositories/record_repository.py`를 구현한다.
3. domain model과 DB row 매핑은 repository 안에 둔다.
4. `PetLogAgentPipeline`에서 저장 흐름이 호출되는지 확인한다.
5. repository 단위 테스트 또는 integration test를 추가한다.

### 누적 기록 기반 정리 agent를 구현한다면

1. `기획.md`의 기록 기반 요구를 확인한다: 문제 행동 요약, 최근 변화 정리, 주간/월간 리포트, 병원 제출용 요약.
2. `ContextAnalysisAgent`가 이미 만든 insight와 missing-record insight를 재사용한다.
3. 새 책임은 `RecordSummaryAgent` 또는 `CareReportAgent`로 분리하고, 단순 패턴 감지는 기존 policy에 남긴다.
4. summary 결과 DTO를 `application/dto.py`에 추가하고, 호출 계약은 관련 agent/provider/composer class와 테스트에 둔다.
5. 실제 문장 생성은 rule composer 또는 LLM provider를 `infrastructure/` 뒤에 둔다.
6. `HospitalSummaryPipeline`은 공통 summary를 받아 병원 제출용 포맷으로 재구성한다.
7. 의료 판단 단정 표현이 없는지 테스트한다.

### 원인 추정 정책을 구현한다면

1. `기획.md`의 원인 추정 요구를 확인하되 의료/행동 원인을 단정하지 않는다.
2. 출력은 "가능한 맥락", "확인할 질문", "관찰 포인트"로 제한한다.
3. 근거가 되는 record id와 insight를 반드시 포함한다.
4. 위험 신호가 있으면 원인 추정보다 `SafetyNotice`와 병원 상담 안내를 우선한다.
5. 금지 표현 테스트를 추가한다: 질병명 단정, 원인 확정, 치료 지시.

### 홈 선제 질문 agent를 구현한다면

1. `기획.md`의 홈 요구를 확인한다: 오늘 요약, 최근 변화, 기록 누락 알림, AI가 먼저 질문하는 한줄 구간.
2. `ContextAnalysisResult`, 최근 기록, due schedule 중 질문 근거를 하나 고른다.
3. 결과 DTO는 질문 문구, 이유, 연결 route, source record id를 포함한다.
4. 질문은 최대 1개만 반환하고, 없을 수 있음을 `None`으로 표현한다.
5. 건강 판단이 필요한 질문은 `CareQuestionPipeline` route로 넘긴다.

### 알림 후보 agent를 구현한다면

1. 이상 징후, 행동 변화, 일정 도래, 기록 누락을 알림 후보로 변환한다.
2. 실제 push/email 전송은 application agent가 아니라 notification infrastructure에 둔다.
3. 중복 발송 방지를 위해 deterministic `dedupe_key`를 만든다.
4. 위험 신호 알림은 진단이 아니라 병원 상담 권장 문구로 제한한다.

### 사진 기록 이해 agent를 구현한다면

1. 입력은 image bytes, content type, optional user note로 제한한다.
2. 실제 vision 모델 호출은 provider interface 뒤에 둔다.
3. 출력은 가능한 한 `StructuredRecordCandidate`를 재사용한다.
4. 이미지로 건강 상태를 단정하지 않고 관찰 가능한 정보만 구조화한다.
5. 확신이 낮으면 `needs_confirmation=True`로 보호자 확인을 요구한다.

### 확장 bounded context를 구현한다면

1. 공동 관리, IoT/디바이스, 병원 실제 연계, 커뮤니티, 커머스, 위치, 목표 미션, 돈 관리는 core care agent 밖에 둔다.
2. core care pipeline과 연결해야 한다면 record id, pet id, summary id 같은 명시적 계약으로만 연결한다.
3. 병원 연계는 `HospitalSummaryPipeline`의 요약 생성과 병원 검색/예약/공유 전송을 분리한다.
4. 커머스 추천은 제휴/광고 표시와 건강 관련 안전 문구 정책을 별도로 둔다.
5. IoT/디바이스 데이터는 기기별 신뢰도와 사용자 확인 정책을 먼저 정의한다.

### API를 붙인다면

1. `src/composition.py`에서 pipeline을 만들 수 있게 한다.
2. `src/presentation/http/`에 router/controller를 둔다.
3. HTTP request를 `PetLogAgentInput`으로 변환한다.
4. pipeline 결과를 response DTO로 변환한다.
5. application/domain에 FastAPI import를 추가하지 않는다.
