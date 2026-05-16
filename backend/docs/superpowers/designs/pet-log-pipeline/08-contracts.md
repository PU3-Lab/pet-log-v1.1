# Domain, DTO, Class 계약

## Domain 타입

구현 위치는 `src/domain/models.py`, `src/domain/enums.py`다.

| 타입 | 책임 |
| --- | --- |
| `PetProfile` | 펫 프로필 |
| `PetRecord` | 저장된 기록 |
| `StructuredRecordCandidate` | 저장 전 구조화 후보 |
| `StructuredRecordBatch` | 한 입력에서 분리된 구조화 후보 묶음 |
| `CareInsight` | 맥락 분석 결과 |
| `ContextAnalysisResult` | insight와 기록 누락 분석 묶음 |
| `CareSuggestion` | 보호자 행동 제안 |
| `PlannedReminder` | 일정/리마인더 후보 |
| `SafetyNotice` | 위험 신호 또는 병원 상담 안내 |
| `CareContext` | 케어 질문/펫 대화 공통 context |

## Application DTO

구현 위치는 `src/application/dto.py`다.

| DTO | 책임 |
| --- | --- |
| `PetLogAgentInput` | 자연어 기록 입력 |
| `PetLogAgentResult` | core agent 처리 결과 |
| `HomeFeedResult` | 홈 화면 조립 결과 |
| `CareQuestionResult` | AI 케어 질문 답변 |
| `PetChatResult` | 펫 대화 답변 |
| `HospitalSummaryResult` | 병원 제출용 요약 |
| `RecordSummaryResult` | 누적 기록 기반 정리/리포트 공통 결과 |
| `ProactiveQuestionResult` | 홈에 노출할 선제 질문 결과 |
| `NotificationCandidate` | 알림 저장/전송 전 후보 |

## Class Contracts

`src/application/interfaces/` 패키지는 제거했다. 현재 backend는 구현 없는 `Protocol`을 별도 패키지에 늘리지 않고, 제품 경로에서 호출되는 concrete class와 테스트 계약으로 경계를 관리한다.

현재 주요 구현 위치는 다음과 같다.

| 책임 | 구현 class | 구현 위치 |
| --- | --- | --- |
| 펫 프로필 조회 | `PetProfileRepository` | `src/infrastructure/repositories/pet_profile_repository.py` |
| 최근 기록 조회/기록 저장 | `RecordRepository` | `src/infrastructure/repositories/record_repository.py` |
| 일정 조회 | `ScheduleRepository` | `src/infrastructure/repositories/schedule_repository.py` |
| 자연어 기록 구조화 | `RecordStructurer` | `src/infrastructure/llm/record_structuring/provider.py` |
| AI 케어 답변 | `CareAnswerProvider` | `src/infrastructure/llm/care_answer/provider.py` |
| 펫 말투 응답 | `PetPersonaResponder` | `src/infrastructure/llm/pet_persona/provider.py` |
| 음성 입력 STT | `SpeechToTextProvider` | `src/infrastructure/speech/speech_to_text.py` |
| 음성 응답 TTS | `TextToSpeechProvider` | `src/infrastructure/speech/text_to_speech.py` |

## 기록 구조화 계약

자연어 입력은 한 문장 안에 여러 사건이 함께 들어올 수 있다. 예를 들어 식사와 산책 상태가 한 번에 들어오면 저장 전 후보도 여러 항목으로 분리해야 한다.

초기 domain 계약:

```text
StructuredRecordCandidate
  title: str
  detail: str
  category: RecordCategory
  status: RecordStatus
  confidence: float
  needs_confirmation: bool
  measurements: tuple[str, ...]

StructuredRecordBatch
  candidates: tuple[StructuredRecordCandidate, ...]
  needs_confirmation: bool
```

초기 agent/provider 계약:

```text
RecordStructuringAgent.structure(
  input: PetLogAgentInput,
) -> StructuredRecordBatch

RecordStructurer.structure(
  input: PetLogAgentInput,
) -> StructuredRecordBatch
```

구현 방향:

- 문장 하나에서 식사, 산책, 배변, 의료, 행동 기록이 섞이면 후보를 나눠 반환한다.
- batch의 `needs_confirmation`은 후보 중 하나라도 확인이 필요하면 `True`로 본다.
- `PetLogAgentPipeline`은 확인이 필요하지 않은 batch의 모든 후보를 각각 `PetRecord`로 저장한다.
- 저장 후 결과는 `PetLogAgentResult.candidates`, `PetLogAgentResult.saved_records`로 전달한다.

정책과 composer도 같은 원칙을 따른다. 현재는 `PatternAnalyzer`, `MissingRecordPolicy`, `RiskSignalPolicy`, `SuggestionComposer`, `ReminderPlanner`, `HomeFeedComposer`, `HospitalReportComposer` 같은 concrete class를 직접 wiring한다. 교체 필요가 실제로 생기면 그때 최소 interface를 도입한다.

## Record summary 계약

기획서의 `문제 행동 요약`, `최근 변화 정리`, `주간/월간 리포트`, `병원 제출용 요약`은 모두 누적 기록 묶음을 사람이 읽을 수 있는 형태로 정리하는 공통 계약을 필요로 한다.

초기 DTO:

```text
RecordSummaryResult
  summary: str
  record_ids: tuple[str, ...]
  highlights: tuple[str, ...]
  behavior_patterns: tuple[str, ...]
  missing_record_notes: tuple[str, ...]
  safety_notice: SafetyNotice | None
```

초기 agent 계약:

```text
RecordSummaryAgent.summarize(
  pet: PetProfile,
  records: tuple[PetRecord, ...],
  context: ContextAnalysisResult,
  due_items: tuple[PlannedReminder, ...],
) -> RecordSummaryResult
```

모델 provider 계약:

```text
RecordSummaryProvider.summarize(
  pet: PetProfile,
  records: tuple[PetRecord, ...],
  context: ContextAnalysisResult,
  due_items: tuple[PlannedReminder, ...],
) -> RecordSummaryResult
```

구현 방향:

- `ContextAnalysisAgent`가 만든 insight를 재사용한다.
- 시간 흐름 기반 변화와 반복 행동은 모델 provider가 문장형으로 정리한다.
- `RecordSummaryAgent`는 요약 대상, 분석 결과, 일정 맥락을 provider에 전달하는 orchestration 책임을 가진다.
- `RecordSummaryComposer`는 모델 없는 fallback 또는 모델 결과 포맷팅에만 사용한다.
- 병원 제출용 문구는 `HospitalReportComposer`에서 목적에 맞게 재구성한다.
- 의료 판단 단정 표현은 금지하고, 위험 신호는 `SafetyNotice`로 분리한다.

## 선제 질문 계약 후보

기획서의 홈 화면에는 `AI가 먼저 질문하는 한줄 구간`이 있다. 이 기능은 홈 문구 조립이 아니라 누락 기록, 최근 변화, 예정 일정 중 어떤 맥락을 먼저 확인할지 고르는 agent 책임이다.

초기 DTO 후보:

```text
ProactiveQuestionResult
  question: str
  reason: str
  source_record_ids: tuple[str, ...]
  related_due_items: tuple[PlannedReminder, ...]
  route: Literal["record_input", "care_question", "schedule"]
```

초기 agent 계약 후보:

```text
ProactiveQuestionAgent.build_question(
  pet: PetProfile,
  records: tuple[PetRecord, ...],
  context: ContextAnalysisResult,
  due_items: tuple[PlannedReminder, ...],
) -> ProactiveQuestionResult | None
```

구현 방향:

- 홈에는 최대 1개 질문만 반환한다.
- 질문 생성 근거를 `reason`, `source_record_ids`, `related_due_items`로 남긴다.
- 건강 판단이 필요한 질문은 직접 답변하지 않고 `care_question` route로 연결한다.

## 알림 후보 계약 후보

기획서의 알림 범위는 이상 징후, 행동 변화, 일정, 기록 누락이다. 알림 생성은 core agent 결과를 바탕으로 하되, 저장/전송과 분리한다.

초기 DTO 후보:

```text
NotificationCandidate
  title: str
  message: str
  kind: Literal["risk", "behavior_change", "schedule", "missing_record"]
  dedupe_key: str
  source_record_ids: tuple[str, ...]
  due_date: str | None
  safety_notice: SafetyNotice | None
```

초기 agent 계약 후보:

```text
NotificationAgent.plan(
  pet: PetProfile,
  context: ContextAnalysisResult,
  safety_notices: tuple[SafetyNotice, ...],
  due_items: tuple[PlannedReminder, ...],
) -> tuple[NotificationCandidate, ...]
```

구현 방향:

- 알림 후보 생성과 실제 push/email 전송은 분리한다.
- 같은 insight로 반복 발송되지 않도록 deterministic `dedupe_key`를 둔다.
- 의료 판단 단정 표현은 금지하고 위험 신호는 병원 상담 안내 수준으로 제한한다.

## 사진 기록 이해 계약 후보

기획서에는 사진 첨부 기록과 사진 인식 아이디어가 있다. 텍스트/음성 입력과 마찬가지로 사진을 바로 저장하지 않고 structured record candidate 또는 보강 질문으로 변환하는 agent가 필요하다.

초기 agent 계약 후보:

```text
PhotoRecordUnderstandingAgent.understand(
  pet: PetProfile,
  image: bytes,
  content_type: str,
  user_note: str | None = None,
) -> StructuredRecordCandidate
```

구현 방향:

- 실제 vision 모델 호출은 `ImageRecordUnderstandingProvider`에 둔다.
- 사료량, 배변 상태, 자세 같은 관찰 가능한 정보만 구조화한다.
- 건강 상태를 이미지로 단정하지 않고, 위험 신호는 `SafetyNotice` 또는 케어 질문으로 연결한다.
