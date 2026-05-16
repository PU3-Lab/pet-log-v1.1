# Pet Log API 연동 계약 계획

## 목적

현재 `app/web`은 `PetLogProvider`에서 mock data와 `localStorage`를 직접 관리합니다. API 연동 1차 작업은 백엔드 구현 전에 계약을 먼저 고정해, 이후 provider를 axios 기반 데이터 경계로 바꿀 수 있게 만드는 것입니다.

이번 문서는 **API 계약과 mock API 구현 기준 문서**입니다. 프론트는 실제 axios HTTP 호출을 사용하고, 1차 서버 응답은 Next.js Route Handler의 메모리 mock store에서 제공합니다. 기록 미리보기와 기록 생성은 FastAPI 백엔드가 연결되어 있으면 Next Route Handler가 axios로 `backend`의 기록 파이프라인을 호출하고, 백엔드 호출이 실패하면 기존 mock store와 mock AI provider로 fallback합니다. 초기 앱 데이터는 프로필, 기록, 일정, 알림 API를 개별 호출해 가져오며 단일 묶음 endpoint에 의존하지 않습니다. 실제 인증, 파일 업로드, 계정 간 동기화는 후속 스프린트에서 결정합니다.

## 백엔드 연결 환경변수

`frontend/app/web`의 Next Route Handler는 다음 서버 환경변수를 사용합니다.

```env
PET_LOG_BACKEND_API_BASE_URL=http://127.0.0.1:27893
PET_LOG_BACKEND_PET_ID=pet_01JCM7V8H9Q2K4N6R8T0A1B2C3
```

- `PET_LOG_BACKEND_API_BASE_URL`: FastAPI 서버 base URL입니다. 기본값은 `http://127.0.0.1:27893`입니다.
- `PET_LOG_BACKEND_PET_ID`: 기록 파이프라인에 넘길 서버 pet id입니다. 기본값은 seed data의 `pet_01JCM7V8H9Q2K4N6R8T0A1B2C3`입니다.
- 클라이언트 브라우저는 FastAPI를 직접 호출하지 않고 `/api/v1/*`의 Next Route Handler만 호출합니다.

## 현재 프론트 저장 경계

- 상태 소유자: `app/web/src/components/pet-log-provider.tsx`
- 저장 키: `pet-log-state-v1`
- 기준 타입: `app/web/src/lib/types.ts`
  - `PetProfile`
  - `RecordEntry`
  - `CareSchedule`
  - `AppSettings`
- 확장 UI 타입: `app/web/src/lib/expansion-state.ts`
  - `ExpansionState`
  - `SharedCareState`
  - `HospitalState`
  - `ShoppingState`
- 현재 생성/수정/삭제 함수
  - `addRecord`
  - `updateRecord`
  - `deleteRecord`
  - `updateProfile`
  - `updateSettings`
  - `addSchedule`
  - `toggleScheduleDone`
  - `deleteSchedule`
  - `updateSharedCareState`
  - `updateHospitalState`
  - `updateShoppingState`

## 공통 응답 형식

API 버전은 `/api/v1`로 시작합니다. 모든 응답은 JSON을 기본으로 합니다.

```ts
type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};
```

공통 에러 코드는 다음 기준으로 둡니다.

- `VALIDATION_ERROR`: 필수값 누락 또는 타입 불일치
- `NOT_FOUND`: 대상 기록, 일정, 프로필 리소스 없음
- `CONFLICT`: 클라이언트 상태가 서버 최신 상태와 충돌
- `UNAUTHORIZED`: 인증이 필요한 요청에서 사용자 확인 실패
- `INTERNAL_ERROR`: 서버 처리 실패

## 초기 데이터 로딩

앱 시작 시 필요한 상태를 개별 API를 통해 병렬로 조회합니다.

### `GET /api/v1/me`
현재 로그인한 사용자 정보를 조회합니다.

### `GET /api/v1/pets`
사용자가 관리하는 모든 반려동물 목록을 조회합니다.

### `GET /api/v1/pet-log/records?pet_id=...`
선택된 반려동물의 기록 목록을 조회합니다.

### `GET /api/v1/pet-log/schedules?pet_id=...`
선택된 반려동물의 일정 목록을 조회합니다.

### `GET /api/v1/notifications?pet_id=...`
선택된 반려동물의 알림 목록을 조회합니다.

Next Route Handler 동작:
- 브라우저는 `PetLogProvider`를 통해 각 API를 병렬로 호출합니다.
- Route Handler는 요청을 FastAPI 백엔드로 전달(Proxy)합니다.
- 각 응답은 `ApiSuccess<T>` 형태로 정규화됩니다.

## 프로필 관리


- `profile`: `pets` table의 `name`, `breed`, `age_label`, `personality`, `notes`를 프론트 프로필 필드로 매핑합니다. 아직 DB에 값이 없는 `sex`, `weight`, `birthday`, `photoDataUrl`은 빈 값으로 둡니다.
- `records`: `pet_records` table의 최신 기록을 `RecordEntry`로 매핑합니다. `structured`는 DB 저장 필드가 아직 없으므로 생략합니다.
- `schedules`: `care_schedules` table의 삭제되지 않은 일정을 `CareSchedule`로 매핑합니다.
- 계정별 설정, 알림 읽음 상태, 확장 UI 상태는 인증/계정 DB 전환 스프린트에서 서버 소유로 넘깁니다.

## 프로필 API

### `PUT /api/v1/profile`

반려동물 프로필 전체를 저장합니다.

요청:

```ts
type UpdateProfileRequest = PetProfile;
```

응답:

```ts
ApiSuccess<{ profile: PetProfile }>
```

정책:

- `name`, `breed`는 필수값입니다.
- `notes`는 빈 문자열 제거 후 저장합니다.
- `photoDataUrl`은 계약 1차에서는 문자열로 유지합니다.
- 실제 이미지 파일 업로드와 CDN 저장은 후속 `POST /api/v1/profile/photo` 후보로 분리합니다.

## 기록 API

### `POST /api/v1/ai/records/structure`

저장 전 자연어 기록을 구조화합니다. 프론트는 이 API를 실제 axios 요청으로 호출하고, provider가 mock인지 실제 LLM인지 알지 않습니다.

요청:

```ts
type StructureRecordRequest = {
  detail: string;
  fallbackCategory: RecordCategory | "all";
};
```

응답:

```ts
ApiSuccess<{ structured: StructuredRecord }>
```

서버 책임:

- Next Route Handler는 FastAPI `POST /api/v1/pet-log/records`에 `confirm:false`로 요청합니다.
- 이때 `source`는 `ai_preview`로 보내며, 백엔드 파이프라인은 후보 신뢰도와 무관하게 저장하지 않습니다.
- FastAPI 응답의 첫 번째 `candidates`를 프론트 `StructuredRecord`로 변환합니다.
- `fallbackCategory:"all"`은 기록 화면의 기본값이며, 이 경우 프론트는 서버가 추천한 `suggestedCategory`를 저장 분류로 사용합니다.
- 백엔드 호출 실패 시 기본 provider는 mock이며 현재 규칙 기반 구조화 계약과 동일한 응답을 반환합니다.
- `PET_LOG_AI_PROVIDER=openai`와 `OPENAI_API_KEY`가 설정되면 서버에서 OpenAI Responses API를 axios로 호출할 수 있습니다.
- LLM 호출 실패, 키 누락, 잘못된 응답 형식은 mock 구조화로 fallback합니다.

FastAPI로 전달되는 요청:

```json
{
  "pet_id": "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
  "text": "아침 사료 45g 먹고 산책 20분 했어요.",
  "source": "ai_preview",
  "confirm": false
}
```

### `POST /api/v1/records`

자연어 기록을 생성합니다.

요청:

```ts
type CreateRecordRequest = {
  category: RecordCategory;
  detail: string;
};
```

응답:

```ts
ApiSuccess<{ record: RecordEntry }>
```

서버 책임:

- Next Route Handler는 FastAPI `POST /api/v1/pet-log/records`에 `confirm:true`로 요청합니다.
- 이때 `source`는 `manual`로 보내며, 백엔드 파이프라인은 `saved_records`를 생성합니다.
- FastAPI 응답의 첫 번째 `saved_records`와 첫 번째 `candidates`를 조합해 프론트 `RecordEntry`로 변환합니다.
- 백엔드 호출 실패 시 `id`, `date`, `time`, `title`, `status`는 Next mock store에서 생성합니다.
- fallback 경로의 `structured`는 `app/web/src/lib/server/pet-log-ai-service.ts`의 구조화 provider 결과를 저장합니다.
- 프론트는 저장 전 미리보기와 실제 저장 모두 API 경계를 거치므로 나중에 mock provider만 제거할 수 있습니다.

FastAPI로 전달되는 요청:

```json
{
  "pet_id": "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
  "text": "저녁 산책 20분 했어요.",
  "source": "manual",
  "confirm": true
}
```

### `PATCH /api/v1/records/:id`

기존 기록의 카테고리와 상세 내용을 수정합니다.

요청:

```ts
type UpdateRecordRequest = {
  category: RecordCategory;
  detail: string;
};
```

응답:

```ts
ApiSuccess<{ record: RecordEntry }>
```

### `DELETE /api/v1/records/:id`

기록을 삭제합니다.

응답:

```ts
ApiSuccess<{ deletedId: string }>
```

프론트 전환 기준:

- 생성과 수정은 서버 구조화 결과를 받은 뒤 화면 상태에 반영합니다.
- API 실패 시 로컬 fallback 기록을 만들거나 이전 `records` 상태를 유지하고 화면에 저장 실패 안내를 표시합니다.
- 삭제는 기존 confirm 흐름을 유지합니다.

## 일정 API

### `POST /api/v1/schedules`

일정을 생성합니다.

요청:

```ts
type CreateScheduleRequest = {
  category: ScheduleCategory;
  title: string;
  dueDate: string;
  repeatLabel: string;
  note: string;
};
```

응답:

```ts
ApiSuccess<{ schedule: CareSchedule }>
```

### `PATCH /api/v1/schedules/:id`

일정 완료 상태 또는 내용을 수정합니다.

요청:

```ts
type UpdateScheduleRequest = Partial<{
  category: ScheduleCategory;
  title: string;
  dueDate: string;
  repeatLabel: string;
  note: string;
  isDone: boolean;
}>;
```

응답:

```ts
ApiSuccess<{ schedule: CareSchedule }>
```

### `DELETE /api/v1/schedules/:id`

일정을 삭제합니다.

응답:

```ts
ApiSuccess<{ deletedId: string }>
```

정책:

- 반복 일정 자동 갱신은 서버 작업 후보로 두되, 1차 API에서는 저장된 `repeatLabel`만 유지합니다.
- 푸시 알림, 시간대 보정, 백그라운드 리마인더는 후속 서버 스프린트에서 다룹니다.

## 설정과 읽음 상태 API

### `PUT /api/v1/settings`

알림 선호와 AI 표시 설정을 저장합니다.

요청:

```ts
type UpdateSettingsRequest = AppSettings;
```

응답:

```ts
ApiSuccess<{ settings: AppSettings }>
```

### `PUT /api/v1/notifications/read`

알림 읽음 상태를 저장합니다.

요청:

```ts
type UpdateReadNotificationsRequest = {
  readNotificationIds: string[];
};
```

응답:

```ts
ApiSuccess<{ readNotificationIds: string[] }>
```

정책:

- 현재 알림은 저장된 기록과 일정으로 프론트에서 계산합니다.
- 실제 푸시 알림과 서버 생성 알림 목록은 후속 작업입니다.

## 확장 UI 상태 API

### `PUT /api/v1/expansion-state`

공동 관리, 병원 연계, 쇼핑 화면의 UI 상태를 저장합니다.

요청:

```ts
type UpdateExpansionStateRequest = Partial<ExpansionState>;
```

응답:

```ts
ApiSuccess<{ expansionState: ExpansionState }>
```

정책:

- 공동 관리의 실제 초대 발송, 권한 검증, 계정 동기화는 후속 서버 작업입니다.
- 병원 연계의 실제 병원 검색, 지도 API, 예약, 리포트 전송은 후속 서버 작업입니다.
- 쇼핑의 상품 피드, 제휴 링크, 결제, 구매 전환 추적은 후속 서버 작업입니다.
- 1차 API는 현재 목업 UI에서 사용자가 고른 상태를 저장하는 데 집중합니다.

## 홈 챗봇 API

### `POST /api/v1/chatbot/messages`

홈 `물어보기` 바텀시트에서 보호자 질문을 전송합니다.

요청:

```ts
type CreateChatbotMessageRequest = {
  question: string;
  contextRecordIds?: string[];
};
```

응답:

```ts
type ChatbotMessageResponse = {
  answer: string;
  referencedRecordIds: string[];
  safetyNotice: string;
  threadId?: string;
};
```

```ts
ApiSuccess<ChatbotMessageResponse>
```

정책:

- 현재 UI는 실제 `/api/v1/chatbot/messages` HTTP 요청을 보내고 서버 AI service 응답을 표시합니다.
- 이 endpoint는 기존 홈 UI 호환용이며, 응답을 서버 mock 대화방에 함께 저장합니다.
- 답변은 진단이 아니라 저장된 기록 기반 참고 안내로 제한합니다.
- 응급, 지속 증상, 상태 악화 가능성이 있는 경우 병원 상담 권장 문구를 포함합니다.

### `GET /api/v1/chatbot/threads`

홈 챗봇의 최근 대화방과 메시지 이력을 조회합니다.

응답:

```ts
type ChatbotThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatbotMessage[];
};

type ChatbotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  referencedRecordIds?: string[];
  safetyNotice?: string;
};
```

```ts
ApiSuccess<{ threads: ChatbotThread[] }>
```

### `POST /api/v1/chatbot/threads`

새 챗봇 대화방을 만듭니다. 제목을 보내지 않으면 `새 질문`을 기본값으로 사용합니다.

### `POST /api/v1/chatbot/threads/:id/messages`

지정한 대화방에 보호자 질문과 AI 답변을 저장합니다.

정책:

- 1차 구현은 Next.js Route Handler의 서버 메모리 mock store에 저장합니다.
- 실제 계정 기반 대화 이력, 장기 보관, 삭제, 검색은 DB/auth 전환 스프린트에서 처리합니다.
- assistant 메시지는 답변 본문과 안전 안내를 분리해 저장합니다.

## 서버 AI Provider 경계

- LLM은 클라이언트에서 직접 실행하지 않고 `app/web/src/lib/server/pet-log-ai-service.ts`에서 실행합니다.
- 기본값은 `PET_LOG_AI_PROVIDER=mock`과 같은 mock provider 동작입니다.
- `PET_LOG_AI_PROVIDER=openai`, `OPENAI_API_KEY`를 설정하면 서버에서 OpenAI Responses API를 호출합니다.
- `PET_LOG_OPENAI_MODEL`로 모델을 지정할 수 있습니다.
- OpenAI provider가 실패하거나 키가 없으면 UI가 깨지지 않도록 mock 답변 또는 mock 구조화로 fallback합니다.
- 프론트 API 계약은 그대로 유지하므로 나중에 Next Route Handler를 별도 백엔드로 옮겨도 챗봇과 기록 구조화 호출 구조는 유지합니다.

## 프론트 전환 순서

1. `app/web` dependencies에 `axios`를 추가합니다.
2. `app/web/src/lib/api-client.ts`를 추가해 `axios.create()` 기반 `apiClient`와 API 함수들을 모읍니다.
   - `baseURL`은 `/api/v1`로 둡니다.
   - 공통 header는 `Content-Type: application/json`을 기본으로 둡니다.
   - axios error는 공통 `ApiFailure` 형식으로 정규화합니다.
3. `PetLogProvider`에 `isLoading`, `error`, `syncStatus`를 추가합니다.
4. 앱 시작 시 `GET /api/v1/me`, `GET /api/v1/pets`, 기록, 일정, 알림 API를 병렬 호출하고 성공하면 provider 상태를 서버 응답으로 교체합니다.
5. 기록, 프로필, 일정, 설정 mutation을 API 함수 호출로 감쌉니다.
6. 실패 시 로컬 fallback을 적용하거나 이전 상태를 유지하고 사용자에게 저장 실패 메시지를 노출합니다.
7. API가 준비되기 전에는 기존 `localStorage` 저장을 fallback으로 유지합니다.
8. API 전용 모드 전환은 인증, 서버 저장, 마이그레이션 검증 후 별도 스프린트에서 처리합니다.

## Route Handler mock API 구현

- `app/web/src/app/api/v1/[...path]/route.ts`에서 `/api/v1/*` 요청을 받습니다.
- `app/web/src/lib/server/mock-pet-log-store.ts`에 서버 메모리 mock store를 둡니다.
- 프론트는 mock 여부를 알지 않고 `app/web/src/lib/api-client.ts`의 axios 함수만 호출합니다.
- 나중에 실제 서버 저장으로 전환할 때는 Route Handler 내부 store/service 구현만 DB 기반으로 교체하고, 프론트 API client와 provider 호출 구조는 유지합니다.
- mock store는 서버 프로세스 메모리를 사용하므로 dev 서버 재시작 또는 배포 환경 재시작 시 기본 예시 상태로 돌아갈 수 있습니다.

## 검증 기준

- provider의 현재 mutation이 모두 API endpoint 후보와 매핑되어 있어야 합니다.
- `PetProfile`, `RecordEntry`, `CareSchedule`, `AppSettings`, `ExpansionState`가 계약 문서에 포함되어야 합니다.
- 챗봇, 병원 연계, 쇼핑처럼 서버 로직이 필요한 기능은 UI 상태 저장과 실제 외부 연동 범위가 분리되어야 합니다.
- 1차 구현에서는 axios client, Route Handler, mock store만 추가하고 DB 스키마와 인증은 추가하지 않습니다.

## 후속 스프린트 후보

1. 실제 DB 및 인증 방식 결정
2. Route Handler 내부 mock store를 DB service로 교체
3. 홈 챗봇 실제 답변 생성 및 대화 저장
4. 병원, 쇼핑, 공동 관리 외부 연동 API 분리
