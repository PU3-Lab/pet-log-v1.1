# Core Pet Log Agent

## 책임

`PetLogAgentPipeline`은 제품-facing core orchestration boundary다. 기록 입력을 받아 구조화, 맥락 분석, 위험 감지, 제안, 쇼핑 추천, 리마인더까지 연결한다. 현재 LangGraph 기반의 `LangGraphPetLogAgentPipeline`으로 구현되어 있다.

```text
PetLogAgentInput
  -> RecordStructuringAgent
  -> [Context Loading]
  -> ContextAnalysisAgent
  -> RiskDetectionAgent
  -> [Routing: Confirmation vs Save]
  -> RecordRepository (Save path)
  -> SuggestionAgent
  -> ShoppingAgent
  -> ReminderAgent
  -> PetLogAgentResult
```

## 내부 Agent

### RecordStructuringAgent

자연어, 음성 변환 텍스트, 빠른 입력을 structured record candidate 묶음으로 바꾼다.

```text
PetLogAgentInput
  -> RecordStructurer
  -> StructuredRecordBatch
```

입력 문장 하나에 여러 사건이 섞이면 `StructuredRecordBatch.candidates`에 여러 후보를 담는다. 확인이 끝난 batch는 각 후보를 별도 `PetRecord`로 저장한다.

### ContextAnalysisAgent

누적 기록, 일정, 프로필, 설정을 읽어 상태 변화와 기록 누락을 감지한다.

```text
PetProfile + recent records + due schedules
  -> PatternAnalyzer
  -> MissingRecordPolicy
  -> ContextAnalysisResult
```

### RecordSummaryAgent 후보

(생략된 이전 내용과 동일)

### RiskDetectionAgent

현재 입력과 누적 기록에서 위험 신호를 감지한다.

```text
input text + recent records
  -> RiskSignalPolicy
  -> SafetyNotice tuple
```

### SuggestionAgent

context insight와 safety notice를 행동 제안으로 바꾼다.

```text
PetProfile + insights + safety notices
  -> SuggestionComposer
  -> CareSuggestion tuple
```

### ShoppingAgent

반려동물의 프로필, 입력 텍스트, 저장된 기록 및 관리 제안을 기반으로 필요한 용품을 추천한다.

```text
PetProfile + input text + saved records + care suggestions
  -> ShoppingAgent
  -> ShoppingRecommendation tuple
```

### ReminderAgent

성장 단계, 예방접종, 약, 검진, 사료 변경 시점 같은 일정 기반 관리 후보를 만든다.

```text
PetProfile + records + due schedules
  -> ReminderPlanner
  -> PlannedReminder tuple
```

## 결정

- 제품의 중심 흐름은 `기록 -> 해석 -> 요약 -> 행동 제안 -> 쇼핑 추천`으로 확장한다.
- 보호자 확인이 필요한 구조화 후보 묶음은 저장 전 수정 요청으로 돌린다.
- 저장 이후에 제안, 쇼핑 추천, 리마인더를 만든다.
- `ContextAnalysisAgent`는 insight 산출까지 담당하고, 누적 기록을 문장형 리포트로 정리하는 책임은 후속 `RecordSummaryAgent` 계열로 분리한다.
- 모델 기반 요약은 `RecordSummaryAgent`가 직접 LLM SDK를 호출하지 않고 `RecordSummaryProvider`에 둔다.
- 의료 판단은 하지 않고 위험 신호 notice만 만든다.
- LangGraph를 사용하여 유연한 노드 실행과 조건부 라우팅을 관리한다.
