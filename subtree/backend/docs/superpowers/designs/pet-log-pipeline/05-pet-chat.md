# Pet Chat Pipeline

## 책임

`PetChatPipeline`은 펫과 대화하는 감성 인터페이스를 담당한다. 건강 판단 질문은 직접 답하지 않고 AI 케어 질문으로 연결한다. 음성 대화가 필요하면 text 응답을 만든 뒤 TTS provider로 음성 출력을 생성한다.

```text
PetChatInput
  -> CareContextBuilder
  -> SafetyGuard
  -> PetPersonaAgent
  -> PetChatResult
```

## 처리 기준

- 펫 말투는 프로필의 `personality`, 최근 기록, 안전 규칙을 기반으로 한다.
- 건강 판단 질문은 직접 답하지 않는다.
- 건강/증상 관련 질문은 `CareQuestionPipeline`으로 연결한다.
- 감성 답변 생성은 `PetPersonaResponder`에 둔다.
- 음성 출력 생성은 `TextToSpeechProvider`에 둔다.

## 후속 결정

- 말투 규칙은 별도 prompt/spec 문서에서 정의한다.
- 케어 질문과 같은 LLM provider를 쓰더라도 class 책임은 분리한다.
- TTS provider는 LLM provider와 분리한다.
