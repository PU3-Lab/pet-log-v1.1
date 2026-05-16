# 펫로그 파이프라인 개요

## 기획 반영 범위

전체 agent 흐름은 [12-end-to-end-agent-flow.md](12-end-to-end-agent-flow.md)에 따로 정리한다.

| 기획 요소 | backend 파이프라인 반영 |
| --- | --- |
| 자연어 기반 통합 입력 | `PetLogAgentPipeline`, `RecordStructuringAgent` |
| 음성 기반 기록 입력 | `SpeechToTextProvider`, `PetLogAgentPipeline` |
| 사진 첨부 기록/사진 인식 | `PhotoRecordUnderstandingAgent` 후보, `ImageRecordUnderstandingProvider` |
| 자동 데이터 구조화 | `RecordStructuringAgent`, `RecordStructurer` |
| 누적 데이터 기반 분석 | `ContextAnalysisAgent` |
| 시간 흐름 기반 요약/리포트 | `RecordSummaryAgent` 후보 |
| 이상 변화 감지 | `RiskDetectionAgent`, `RiskSignalPolicy` |
| 원인 추정 | `CauseHypothesisPolicy` 후보, 단정 금지 |
| 행동 가이드 제공 | `SuggestionAgent` |
| 기록 누락 감지 | `ContextAnalysisAgent`, `MissingRecordPolicy` |
| 홈 오늘 요약/최근 변화/제안 카드 | `HomeFeedPipeline`, `HomeFeedComposer` |
| AI가 먼저 묻는 홈 질문 | `ProactiveQuestionAgent` 후보 |
| AI 케어 질문 | `CareQuestionPipeline` |
| 펫과 대화하는 감성 인터페이스 | `PetChatPipeline` |
| 펫 대화 음성 출력 | `TextToSpeechProvider`, `PetChatPipeline` |
| 건강 이상 질문 시 병원 상담 안내 | `SafetyGuard`, `middleware/safety.py` |
| 병원 제출용 요약 | `HospitalSummaryPipeline` |
| 일정 기반 관리 | `ScheduleRepository`, `ReminderPlanner` |
| 이상/행동/일정/누락 알림 | `NotificationAgent` 후보 |
| 공동 관리 | shared care bounded context 후보 |
| IoT/디바이스 데이터 수집 | device ingestion bounded context 후보 |
| 병원 검색/예약/공유 전송 | hospital integration bounded context 후보 |
| 커뮤니티/커머스/지도/미션/돈 관리 | 확장 bounded context 후보 |

## Architect Agent 검토 반영

권장 구조는 `hybrid`다.

- 하나의 거대한 pipeline만 두면 홈/질문/펫대화의 UX 경계가 흐려진다.
- 기능별 pipeline만 나누면 기획의 “AI Agent 중심 관리” 의도가 약해진다.
- 따라서 `PetLogAgentPipeline`을 core owner로 두고, 내부 책임은 LLM agent 역할 단위로 분리한다.
- surface pipeline은 core 결과를 화면 또는 대화 채널에 맞게 조립한다.
- multi-agent planner, handoff protocol은 이번 class 설계 범위에 넣지 않는다.
- 단일 agent 실행 공통층인 `agent_runtime`, `middleware`, `tools`는 구조만 잡고 내부 동작은 후속 단계로 미룬다.

## 성공 기준

- 기획의 `기록 -> 해석 -> 행동 제안` 흐름이 pipeline에 반영되어 있다.
- 홈의 `오늘 요약`, `최근 변화`, `이상 징후`, `제안 카드`를 만들 수 있는 interface가 있다.
- `AI 케어 질문`과 `펫 대화`가 backend에서 분리된 pipeline으로 표현된다.
- 위험 신호는 병원 상담 권장 또는 케어 질문 연결로 제한된다.
- 원인 추정은 진단이 아니라 "가능한 맥락" 또는 "확인할 질문" 수준으로 제한된다.
- `기획.md`에 있지만 아직 코드 계약이 없는 agent 후보는 [11-agent-gap-analysis.md](11-agent-gap-analysis.md)에 추적한다.
- MVP 단계에서 과한 추상화와 skeleton 누적 위험은 [15-architecture-refactoring-notes.md](15-architecture-refactoring-notes.md)에 따라 줄인다.
- 현재 단계는 폴더, interface 파일, infrastructure/runtime skeleton import까지 검증되어야 한다.
