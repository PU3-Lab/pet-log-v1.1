# Care Question Pipeline

## 책임

`CareQuestionPipeline`은 보호자가 직접 묻는 `물어보기` 질문을 기록 기반 케어 조언으로 처리한다.

```text
CareQuestionInput
  -> CareContextBuilder
  -> SafetyGuard
  -> CareAnswerProvider
  -> CareQuestionResult
```

## 처리 기준

- 최근 기록, 프로필, 일정 정보를 `CareContext`로 모은다.
- 위험 신호가 포함되면 병원 상담 안내를 우선한다.
- 건강 상태를 단정하지 않는다.
- 답변 생성은 `CareAnswerProvider`에 둔다.

## 후속 결정

- 실제 provider가 OpenAI인지 로컬 모델인지는 infrastructure 단계에서 결정한다.
- sync/async 전환은 실제 LLM provider 도입 시 재검토한다.
