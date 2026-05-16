# 펫로그 파이프라인 인터페이스 설계

이 문서는 펫로그 backend AI agent 설계의 인덱스다. 세부 설계는 기능별 문서로 분리한다.

## 목표

`기획.md`의 방향인 **기록 중심 앱이 아니라 분석 및 행동 제안 중심 AI Agent**를 backend 파이프라인으로 설계한다.

이번 단계는 구현 로직을 만들지 않고, 폴더 구조, 인터페이스 계약, LLM agent 실행 계층, 구현 클래스 뼈대 위치만 정의한다.

## 설계 원칙

- domain/application core는 FastAPI, DB, OpenAI SDK에 의존하지 않는다.
- 모든 외부 의존성은 interface 뒤로 숨긴다.
- `agent`는 제품 기능을 맡는 LLM agent 단위로 유지한다.
- LLM 호출 loop, prompt 조립, tool registry, memory는 `agent_runtime/`에 둔다.
- `agent_runtime/`의 실제 orchestration 구현은 LangGraph 우선으로 검토한다. LangChain은 model/tool adapter 또는 prebuilt agent가 필요할 때 보조적으로만 쓴다.
- agent 실행 전후 공통 처리인 safety, logging, tracing, retry, validation은 `middleware/`에 둔다.
- agent가 호출할 수 있는 기능은 schema-first `tools/`에 둔다.
- STT/TTS provider는 `infrastructure/speech/` 뒤로 숨기고, 파일/스트림 처리는 `presentation/`에서 변환한다.
- 첫 구현은 interface shell과 infrastructure skeleton만 만들고 실제 DB/AI 동작 구현은 후속 단계로 미룬다.
- 의료 상태를 단정하지 않고 위험 신호는 병원 상담 권장 또는 AI 케어 질문 연결로 제한한다.

## 기능별 설계 문서

| 문서 | 책임 |
| --- | --- |
| [00-overview.md](pet-log-pipeline/00-overview.md) | 기획 반영 범위, 전체 구조, 설계 결정 |
| [01-package-structure.md](pet-log-pipeline/01-package-structure.md) | `src/` 폴더 구성과 책임 |
| [02-core-pet-log-agent.md](pet-log-pipeline/02-core-pet-log-agent.md) | 기록 입력 core agent pipeline |
| [03-home-feed.md](pet-log-pipeline/03-home-feed.md) | 홈 요약/최근 변화/제안 카드 pipeline |
| [04-care-question.md](pet-log-pipeline/04-care-question.md) | 보호자 AI 케어 질문 pipeline |
| [05-pet-chat.md](pet-log-pipeline/05-pet-chat.md) | 펫 말투 감성 대화 pipeline |
| [06-hospital-summary.md](pet-log-pipeline/06-hospital-summary.md) | 병원 제출용 요약 pipeline |
| [07-agent-runtime-tools.md](pet-log-pipeline/07-agent-runtime-tools.md) | `agent_runtime`, `middleware`, `tools`, speech provider 구조 |
| [08-contracts.md](pet-log-pipeline/08-contracts.md) | domain, DTO, interface 계약 |
| [09-infrastructure-skeleton.md](pet-log-pipeline/09-infrastructure-skeleton.md) | infrastructure 구현체 skeleton 위치 |
| [10-implementation-guide.md](pet-log-pipeline/10-implementation-guide.md) | 처음 보는 개발자를 위한 구현 위치 안내 |
| [11-agent-gap-analysis.md](pet-log-pipeline/11-agent-gap-analysis.md) | `기획.md` 재점검 기준 누락 agent 후보 |

## 전체 구조 요약

```text
입력 채널
  -> PetLogAgentPipeline
      -> RecordStructuringAgent
      -> ContextAnalysisAgent
      -> RiskDetectionAgent
      -> SuggestionAgent
      -> ReminderAgent
      -> RecordSummaryAgent 후보
  -> Surface Pipelines
      -> HomeFeedPipeline
      -> ProactiveQuestionAgent 후보
      -> NotificationAgent 후보
      -> CareQuestionPipeline
      -> PetChatPipeline
      -> HospitalSummaryPipeline
  -> Input Understanding
      -> PhotoRecordUnderstandingAgent 후보

Agent Runtime
  -> AgentRuntime
  -> LangGraph adapter 후보
  -> ToolRegistry
  -> Middleware chain
  -> Tools
```

## 다음 작업

- 실제 DB/LLM/rule 구현체 중 다음 우선순위를 선택한다.
- 구현 전 [10-implementation-guide.md](pet-log-pipeline/10-implementation-guide.md)를 기준으로 변경 위치를 확인한다.
