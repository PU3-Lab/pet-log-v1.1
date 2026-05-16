# Pet Log AI Agent 사양

## 목적

Pet Log AI는 보호자가 남긴 기록을 해석해 다음 행동을 정리하는 보조 역할을 합니다. MVP의 AI는 진단이나 처방이 아니라 기록 구조화, 변화 감지, 누락 감지, 케어 제안, 보호자 질문 응답에 집중합니다.

## 실행 위치

- LLM 호출은 클라이언트가 아니라 서버 API 뒤에서 실행합니다.
- 현재 실행 지점은 `app/web/src/lib/server/pet-log-ai-service.ts`입니다.
- 프론트는 기록 구조화에서 `POST /api/v1/ai/records/structure`, 챗봇에서 `POST /api/v1/chatbot/messages` 또는 `POST /api/v1/chatbot/threads/:id/messages`를 호출합니다.
- 챗봇 대화 이력은 `GET /api/v1/chatbot/threads`로 조회하며, 2차 구현부터는 **SQLite DB**에 영구 저장하여 맥락 파악에 활용합니다.
- 기본 provider는 `mock`입니다.
- `PET_LOG_AI_PROVIDER=openai`와 `OPENAI_API_KEY`를 설정하면 서버에서 OpenAI Responses API를 호출할 수 있습니다.
- `PET_LOG_OPENAI_MODEL`로 모델을 바꿀 수 있고, 기본값은 `gpt-4o-mini`입니다.

## AI 책임

- 자연어 기록에서 원문, 요약, 추천 분류, 수치, 신뢰도, 확인 필요 여부를 만듭니다.
- 최근 기록에서 식사, 활동, 배변, 행동, 병원/약/접종 관련 변화를 요약합니다.
- 기록이 비어 있거나 반복 이상이 보이면 설명 가능한 알림과 제안을 만듭니다.
- 홈 챗봇은 보호자 질문에 최근 기록을 참고해 짧은 한국어 답변을 제공합니다.
- 홈 챗봇은 보호자 질문과 AI 답변을 대화방 메시지로 남겨 보호자가 같은 흐름을 이어볼 수 있게 합니다.

## 비목표

- 질병 확정 진단
- 약 처방, 용량 지시, 치료 결정
- 기록에 없는 사실 추정
- 사진만 보고 질병을 판단하는 기능
- 병원 예약, 결제, 쇼핑 구매 실행

## 구조화 기록 계약

```ts
type StructuredRecord = {
  sourceText: string;
  normalizedSummary: string;
  suggestedCategory: RecordCategory;
  confidence: number;
  measurements: Array<{
    label: string;
    value: string;
  }>;
  needsConfirmation: boolean;
};
```

MVP 분류는 식사, 산책/활동, 배변/소변, 병원/약/접종, 행동입니다. 신뢰도가 낮거나 보호자가 고른 분류와 AI 추천 분류가 다르면 저장 전 확인이 필요합니다.

구현 기준:

- `POST /api/v1/ai/records/structure`가 저장 전 미리보기 구조화를 담당합니다.
- `POST /api/v1/records`와 `PATCH /api/v1/records/:id`도 서버 AI service를 경유해 `structured`를 저장합니다.
- 기본 provider는 mock이며 현재 규칙 기반 구조화와 같은 계약을 반환합니다.
- `PET_LOG_AI_PROVIDER=openai` 설정 시 서버에서 OpenAI Responses API를 axios로 호출하고, 실패하면 mock 구조화로 fallback합니다.
- 클라이언트는 구조화 로직을 직접 실행하지 않고 API 결과를 표시합니다.

## 분석과 알림 규칙

- 최근 기록에 배변 기록이 없으면 배변 상태 확인을 제안합니다.
- 최근 기록에 산책/활동 기록이 없으면 짧은 활동 기록을 제안합니다.
- `alert` 상태 기록이 있으면 반복 여부를 관찰하고 병원 상담을 권장합니다.
- 모든 알림은 사용자에게 보이는 기록이나 프로필 데이터로 설명 가능해야 합니다.

## 제안 정책

- 문장은 실천 가능한 행동 중심으로 작성합니다.
- 확정 진단처럼 보이는 표현을 금지합니다.
- 지속, 악화, 반복, 통증, 호흡 이상, 혈변 등 위험 신호는 병원 상담 권장 문구를 포함합니다.
- 답변은 짧게 유지하고, 근거가 부족하면 추가 기록을 요청합니다.

## 안전 규칙

- “진단이 아닙니다” 또는 이에 준하는 안전 안내를 챗봇 응답과 분석 화면에 포함합니다.
- 응급 가능성이 있는 질문에는 앱 내 조치보다 병원 상담을 먼저 안내합니다.
- LLM provider 장애 시 mock 답변으로 fallback하되, 진단성 표현은 계속 금지합니다.

## 테스트 시나리오

- 최근 기록이 없을 때 챗봇이 추가 기록을 요청하는지 확인합니다.
- 배변 기록이 없을 때 누락 알림이 표시되는지 확인합니다.
- 주의 기록이 있을 때 병원 상담 권장 문구가 포함되는지 확인합니다.
- `PET_LOG_AI_PROVIDER`가 설정되지 않아도 mock 답변이 정상 반환되는지 확인합니다.
- `POST /api/v1/ai/records/structure`가 원문, 추천 분류, 신뢰도, 추출 수치를 반환하는지 확인합니다.
- `PET_LOG_AI_PROVIDER=openai`에서 키가 없거나 호출이 실패해도 UI가 깨지지 않는지 확인합니다.
- 챗봇 질문 후 `GET /api/v1/chatbot/threads`에서 사용자 메시지와 assistant 메시지가 함께 조회되는지 확인합니다.
