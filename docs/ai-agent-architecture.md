# AI 에이전트 아키텍처

## 전체 흐름

```
사용자 입력
  └─ RecordStructuringAgent (텍스트 → 구조화)
       └─ CareContextBuilder (컨텍스트 조립)
            ├─ ContextAnalysisAgent (패턴 분석)
            │    └─ CareActionRoutingAgent (UI 라우팅 결정)
            ├─ RiskDetectionAgent (위험 탐지)
            ├─ SuggestionAgent (제안 생성)
            ├─ ReminderAgent (리마인더 계획)
            ├─ ShoppingAgent (쇼핑 추천)
            └─ NotificationAgent (알림 계획)
```

---

## 에이전트 (`application/agents/`)

| 에이전트 | 역할 | 사용하는 툴/미들웨어 |
|---|---|---|
| **RecordStructuringAgent** | 자유텍스트 입력을 카테고리/제목/상세/상태로 구조화 | `RecordStructurer` |
| **ContextAnalysisAgent** | 최근 기록 패턴 분석 + 누락 기록 감지 + UI 라우팅 | `PatternAnalyzer`, `MissingRecordPolicy`, `CareActionRoutingAgent` |
| **RiskDetectionAgent** | 건강/안전 위험 신호 탐지 | `RiskSignalPolicy` |
| **SuggestionAgent** | 케어 제안 생성 | `SuggestionComposer` |
| **ReminderAgent** | 케어 일정 기반 리마인더 계획 | `ReminderPlanner` |
| **ShoppingAgent** | 케어 컨텍스트 기반 제품 추천 | `ShoppingFallbackMiddleware`, `ShoppingRecommendationProvider`, `ShoppingRecommendationAgent` |
| **CareActionRoutingAgent** | 인사이트를 프론트엔드 UI 경로로 라우팅 | `ActionNavigationProvider` |
| **PetPersonaAgent** | 반려동물 관점에서 사용자와 대화 | `PetPersonaResponder` |
| **PhotoRecordUnderstandingAgent** | 이미지 분석으로 케어 기록 추출 (멀티모달) | `ImageRecordUnderstandingProvider` |
| **ProactiveQuestionAgent** | 컨텍스트 기반 능동적 건강 질문 생성 | `ProactiveQuestionPolicy` |
| **NotificationAgent** | 인사이트/안전 알림 기반 알림 메시지 계획 | `NotificationPolicy` |
| **RecordSummaryAgent** | 케어 기록 요약 생성 | `RecordSummaryProvider` |
| **CareContextBuilder** | 반려동물 프로필·기록·일정 통합 컨텍스트 조립 | PetProfileRepo, RecordRepo, ScheduleRepo |
| **HospitalRecommendationAgent** | 근처 동물병원 검색 + 응급 감지 | `HospitalFallbackMiddleware`, `HospitalCacheRateLimitMiddleware`, `GooglePlacesClient` |

---

## 툴 (`tools/`)

| 툴 | 파일 | 시그니처 | 설명 | 사용 현황 |
|---|---|---|---|---|
| `get_pet_profile` | `profile_tools.py` | `(pet_id: str)` | 반려동물 프로필 조회 | `load_context` 노드에 등록 |
| `list_recent_records` | `record_tools.py` | `(pet_id: str, lookback_days: int = 14)` | 최근 기록 목록 조회 | `load_context` 노드에 등록 |
| `save_pet_record` | `record_tools.py` | `(pet_id, title, detail, category, status, confidence, needs_confirmation)` | 구조화 기록 저장 | `save_records` 노드에 등록, Tool Approval 적용 |
| `build_care_context` | `care_tools.py` | `(pet_id: str, lookback_days: int = 14)` | 케어 컨텍스트 전체 조립 | 정의됨, 미연결 |
| `list_due_reminders` | `schedule_tools.py` | `(pet_id: str, days_ahead: int = 14)` | 예정된 케어 리마인더 조회 | 정의됨, 미연결 |
| `SpeechTools.transcribe` | `speech_tools.py` | `(audio: bytes, content_type: str) -> str` | 음성 → 텍스트 변환 | 정의됨, 미연결 |
| `SpeechTools.synthesize` | `speech_tools.py` | `(text: str, voice: str \| None) -> bytes` | 텍스트 → 음성 변환 | 정의됨, 미연결 |

> `build_care_context`, `list_due_reminders`, `SpeechTools`는 `tools/__init__.py`에 export되어 있으나 현재 어떤 파이프라인에도 연결되어 있지 않습니다.

---

## LLM Provider (`infrastructure/llm/`)

모두 gpt-5-mini 기본 모델, 한국어 프롬프트, JSON Schema 검증(strict=True) 사용.

| Provider | 역할 | 사용 에이전트 |
|---|---|---|
| **RecordStructurer** | 텍스트 → 구조화 기록 JSON | RecordStructuringAgent |
| **ActionNavigationProvider** | 인사이트 → UI 경로 결정 (LLM 판단) | CareActionRoutingAgent |
| **ShoppingReasonProvider** | 쇼핑 카테고리 요청 생성 + 최적 상품 선택 + 추천 이유 생성 | ShoppingRecommendationAgent |
| **PetPersonaResponder** | 반려동물 시점의 대화 응답 생성 | PetPersonaAgent |
| **CareAnswerProvider** | 케어 관련 질문 답변 (RAG 지원) | CareQuestionPipeline |
| **RecordSummaryProvider** | 기록 요약 JSON 생성 | RecordSummaryAgent |
| **ImageRecordUnderstandingProvider** | 이미지 → 케어 기록 추출 (멀티모달) | PhotoRecordUnderstandingAgent |

### 모델 폴백 체인

```
gpt-5-mini (기본)
  → 환경변수 지정 fallback 모델 (OPENAI_*_FALLBACK_MODEL)
    → Gemini
      → 로컬 Gemma
```

---

## 미들웨어 (`middleware/`)

### 외부 API 미들웨어

| 미들웨어 | 역할 | 적용 에이전트 |
|---|---|---|
| **HospitalCacheRateLimitMiddleware** | Google Places API 캐싱(10분 TTL) + 속도 제한(30req/60s) | HospitalRecommendationAgent |
| **HospitalFallbackMiddleware** | Provider 실패 시 Google Maps 검색 링크 폴백 | HospitalRecommendationAgent |
| **ShoppingFallbackMiddleware** | Provider 실패 시 네이버 쇼핑 검색 폴백 (기록 분석 후 쿼리 자동 생성) | ShoppingAgent |

### 노드별 미들웨어 (`agent_runtime/tool_registry.py`)

| 미들웨어 | 역할 | 적용 노드 |
|---|---|---|
| **Model Retry** | LLM 일시적 오류 자동 재시도 | `structure_record` |
| **Tool Retry** | 툴 실행 실패 재시도 | `load_context`, `save_records` |
| **Tool Call Limit** | 툴 무한 루프 방지 (load_context: 6회, save_records: 5회) | `load_context`, `save_records` |
| **PII Validation** | 이메일 등 개인정보 검증 및 정제 | `structure_record`, `load_context`, `save_records` |
| **Tool Approval** | 기록 쓰기 전 사람 승인 요구 | `save_records` |
| **Debug Logging** | 에이전트 실행 및 툴 사용 로깅 | `load_context`, `save_records` |

---

## Policy (`infrastructure/policies/`)

| Policy | 역할 | 사용 에이전트 |
|---|---|---|
| **PatternAnalyzer** | 기록 패턴 분석 | ContextAnalysisAgent |
| **MissingRecordPolicy** | 누락 기록 감지 | ContextAnalysisAgent |
| **RiskSignalPolicy** | 건강/안전 위험 신호 탐지 | RiskDetectionAgent |
| **SuggestionComposer** | 케어 제안 조합 | SuggestionAgent |
| **ReminderPlanner** | 리마인더 계획 생성 | ReminderAgent |
| **ProactiveQuestionPolicy** | 능동적 질문 생성 | ProactiveQuestionAgent |
| **NotificationPolicy** | 알림 메시지 계획 | NotificationAgent |
| **CauseHypothesisPolicy** | 이상 원인 가설 생성 | (내부 사용) |
| **SafetyGuard** | 안전 검증 | (내부 사용) |

---

## Action Navigation 시스템

`ContextAnalysisAgent` → `CareActionRoutingAgent` → `ActionNavigationProvider(LLM)` 순으로 동작.
각 인사이트마다 적절한 UI 경로를 LLM이 판단해 반환.

### 유효 경로

```
/analysis, /community, /dashboard, /hospital,
/notifications, /record, /schedule, /settings,
/shopping, /timeline
```

### Alias 정규화

| 입력 | 정규화 결과 |
|---|---|
| `/calendar` | `/schedule` |
| `/hospitals` | `/hospital` |
| `/shop` | `/shopping` |

Provider 실패 시 기본 경로 반환.

---

## 컴포지션 구조 (`composition.py`)

```
AppContext
├── pet_log_agent_pipeline (LangGraphPetLogAgentPipeline)
│   ├── record_structuring_agent
│   ├── context_analysis_agent
│   │    └── care_action_routing_agent
│   ├── risk_detection_agent
│   ├── suggestion_agent
│   ├── reminder_agent
│   └── shopping_agent
│        └── shopping_recommendation_agent
├── pet_chat_pipeline
├── care_question_pipeline
└── repositories
     ├── pet_profile_repository
     ├── record_repository
     ├── schedule_repository
     ├── file_repository
     └── notification_repository
```

미들웨어는 의존성 주입 시 래핑 방식으로 조합:

```python
HospitalRecommendationAgent(
    HospitalFallbackMiddleware(
        HospitalCacheRateLimitMiddleware(
            GooglePlacesClient()
        )
    )
)
```
