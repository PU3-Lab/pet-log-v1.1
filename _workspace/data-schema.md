# 데이터 스키마

## 기준

- 참고 문서: `_workspace/url-list.md`
- 현재 구현 기준: `app/web/src/lib/types.ts`, `app/web/src/lib/expansion-state.ts`, `app/web/src/lib/api-client.ts`
- 현재 API 경계: `app/web/src/app/api/v1/[...path]/route.ts`
- 목적: mock store와 `localStorage` 상태를 실제 DB/auth 저장소로 전환할 때 필요한 데이터 구조를 정의합니다.

## 설계 원칙

- MVP는 단일 사용자, 단일 반려동물 기준으로 구현되어 있지만 DB 스키마는 계정과 다중 반려동물 확장을 막지 않도록 둡니다.
- 기록 원문, AI 구조화 결과, 보호자가 확정한 카테고리는 분리해서 저장합니다.
- AI 응답은 진단이나 처방이 아니라 기록 기반 참고 안내라는 안전 문구를 함께 저장할 수 있어야 합니다.
- 공동 관리, 병원 연계, 쇼핑은 현재 UI 상태 저장 범위와 제품화 후보 범위를 분리합니다.
- `created_at`, `updated_at`은 모든 주요 테이블에 둡니다. 삭제 복구나 감사가 필요한 테이블은 `deleted_at`을 둡니다.

## 공통 타입

### record_category

| 값 | 의미 |
| --- | --- |
| `meal` | 식사 |
| `walk` | 산책 |
| `stool` | 배변 |
| `medical` | 병원, 접종, 약 |
| `behavior` | 행동 |

### record_status

| 값 | 의미 |
| --- | --- |
| `normal` | 정상 |
| `notice` | 확인 필요 |
| `alert` | 주의 |

### schedule_category

| 값 | 의미 |
| --- | --- |
| `vaccination` | 예방접종 |
| `medication` | 약 복용 |
| `checkup` | 건강검진 |
| `grooming` | 미용 |
| `food` | 사료 변경 |

### chatbot_message_role

| 값 | 의미 |
| --- | --- |
| `user` | 보호자 질문 |
| `assistant` | AI 답변 |

## 핵심 엔티티 관계

```text
users 1 ── N pets
pets 1 ── N pet_records
pets 1 ── N care_schedules
pets 1 ── N chatbot_threads
chatbot_threads 1 ── N chatbot_messages
pet_records 1 ── 0..1 structured_records
users 1 ── N notification_reads
pets 1 ── 0..1 app_settings
pets 1 ── 0..1 expansion_states
```

## MVP 저장 스키마

### users

인증 도입 후 보호자 계정의 기준 테이블입니다. 현재 mock API에는 없지만 `/api/v1/me`와 `/api/v1/pets`의 기준이 됩니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 사용자 ID |
| `email` | text | 예 | 로그인 이메일, 고유값 |
| `display_name` | text | 아니오 | 화면 표시 이름 |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |
| `deleted_at` | timestamptz | 아니오 | 탈퇴 또는 소프트 삭제 시각 |

### pets

현재 `PetProfile`을 서버화한 테이블입니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 반려동물 ID |
| `owner_user_id` | uuid | 예 | 대표 보호자, `users.id` 참조 |
| `name` | text | 예 | 이름 |
| `breed` | text | 예 | 품종 |
| `age_label` | text | 아니오 | 현재 UI의 `age` 문자열 |
| `sex_label` | text | 아니오 | 성별, 중성화 여부 문자열 |
| `weight_label` | text | 아니오 | 현재 UI의 `weight` 문자열 |
| `birthday` | date | 아니오 | 생일. 기존 `YYYY.MM.DD` 문자열은 마이그레이션 때 변환 |
| `personality` | text | 아니오 | 성격 설명 |
| `notes` | text[] | 예 | 특이사항 목록 |
| `photo_file_id` | uuid | 아니오 | `files.id` 참조 |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |
| `deleted_at` | timestamptz | 아니오 | 삭제 시각 |

### pet_records

기록 타임라인의 기준 테이블입니다. `/api/v1/records`와 `/api/v1/records/:id`에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 기록 ID |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `created_by_user_id` | uuid | 예 | 기록 작성자, `users.id` 참조 |
| `recorded_at` | timestamptz | 예 | 실제 기록 시각 |
| `category` | record_category | 예 | 보호자가 확정한 카테고리 |
| `title` | text | 예 | 카드 제목 |
| `detail` | text | 예 | 보호자 원문 |
| `status` | record_status | 예 | 정상, 확인 필요, 주의 |
| `source` | text | 예 | `manual`, `voice`, `ai_preview` 등 입력 출처 |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |
| `deleted_at` | timestamptz | 아니오 | 삭제 시각 |

### structured_records

자연어 기록 구조화 결과입니다. `/api/v1/ai/records/structure`, `POST /api/v1/records`, `PATCH /api/v1/records/:id`의 AI 결과에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 구조화 결과 ID |
| `record_id` | uuid | 아니오 | 저장된 기록이면 `pet_records.id` 참조 |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `source_text` | text | 예 | 구조화 대상 원문 |
| `normalized_summary` | text | 예 | AI 정규화 요약 |
| `suggested_category` | record_category | 예 | AI 추천 카테고리 |
| `confidence` | numeric(3,2) | 예 | 0.10-0.99 신뢰도 |
| `needs_confirmation` | boolean | 예 | 보호자 확인 필요 여부 |
| `provider` | text | 예 | `mock`, `openai` 등 |
| `model` | text | 아니오 | 사용 모델 |
| `raw_response` | jsonb | 아니오 | provider 원본 응답. 운영에서는 민감정보 제거 후 저장 |
| `created_at` | timestamptz | 예 | 생성 시각 |

### structured_record_measurements

AI가 추출한 수치 목록입니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 측정값 ID |
| `structured_record_id` | uuid | 예 | `structured_records.id` 참조 |
| `label` | text | 예 | 급여량, 체중, 시간, 횟수 등 |
| `value_text` | text | 예 | 원문 기반 값 |
| `numeric_value` | numeric | 아니오 | 숫자로 파싱 가능한 값 |
| `unit` | text | 아니오 | g, kg, 분, 회 등 |
| `created_at` | timestamptz | 예 | 생성 시각 |

### care_schedules

일정 화면의 기준 테이블입니다. `/api/v1/schedules`와 `/api/v1/schedules/:id`에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 일정 ID |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `created_by_user_id` | uuid | 예 | 작성자 |
| `category` | schedule_category | 예 | 일정 분류 |
| `title` | text | 예 | 일정명 |
| `due_date` | date | 예 | 예정일 |
| `repeat_label` | text | 예 | 매월, 매년, 한 번 등 현재 UI 문자열 |
| `note` | text | 예 | 메모 |
| `is_done` | boolean | 예 | 완료 여부 |
| `completed_at` | timestamptz | 아니오 | 완료 시각 |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |
| `deleted_at` | timestamptz | 아니오 | 삭제 시각 |

### app_settings

설정 화면과 `/api/v1/settings`에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 설정 ID |
| `user_id` | uuid | 예 | `users.id` 참조 |
| `pet_id` | uuid | 아니오 | 반려동물별 설정이면 `pets.id` 참조 |
| `missing_record_notification` | boolean | 예 | 기록 누락 알림 |
| `alert_notification` | boolean | 예 | 주의 기록 후속 확인 |
| `schedule_notification` | boolean | 예 | 일정 리마인더 |
| `ai_insight_enabled` | boolean | 예 | AI 요약과 케어 제안 표시 |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |

### notification_reads

현재 `/api/v1/notifications/read`는 읽은 알림 ID 배열만 저장합니다. 서버 알림 전환 전까지 이 테이블로 읽음 상태를 분리합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 읽음 ID |
| `user_id` | uuid | 예 | `users.id` 참조 |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `notification_id` | text | 예 | 계산형 알림 또는 서버 알림 ID |
| `read_at` | timestamptz | 예 | 읽음 처리 시각 |

### chatbot_threads

홈 `물어보기` 대화방입니다. `/api/v1/chatbot/threads`에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 대화방 ID |
| `user_id` | uuid | 예 | `users.id` 참조 |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `title` | text | 예 | 대화방 제목 |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 마지막 메시지 시각 |
| `deleted_at` | timestamptz | 아니오 | 삭제 시각 |

### chatbot_messages

홈 `물어보기` 메시지입니다. `/api/v1/chatbot/messages`, `/api/v1/chatbot/threads/:threadId/messages`에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 메시지 ID |
| `thread_id` | uuid | 예 | `chatbot_threads.id` 참조 |
| `role` | chatbot_message_role | 예 | user 또는 assistant |
| `content` | text | 예 | 질문 또는 답변 본문 |
| `safety_notice` | text | 아니오 | AI 답변 안전 안내 |
| `referenced_record_ids` | uuid[] | 예 | 답변에 참고한 기록 ID 목록 |
| `provider` | text | 아니오 | assistant 메시지의 provider |
| `model` | text | 아니오 | assistant 메시지의 model |
| `created_at` | timestamptz | 예 | 생성 시각 |

## 확장 UI 상태 스키마

현재 `/api/v1/expansion-state`는 공동 관리, 병원 연계, 쇼핑 목업 상태를 한 번에 저장합니다. 제품화 전환 시에는 아래처럼 임시 상태와 실제 도메인 테이블을 나눕니다.

### expansion_states

현재 UI 상태 보존용입니다. 제품화 후에는 일부 컬럼을 별도 도메인 테이블로 이동합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 상태 ID |
| `user_id` | uuid | 예 | `users.id` 참조 |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `shared_care_state` | jsonb | 예 | 초대 입력, 선택 역할, 알림 공유 토글 |
| `hospital_state` | jsonb | 예 | 증상 메모, 위치 상태, 선택 병원, 체크리스트 |
| `shopping_state` | jsonb | 예 | 필터, 펼친 추천, 저장 추천 ID |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |

### shared_care_members

공동 관리 제품화 시 보호자 권한의 기준 테이블입니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 멤버 ID |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `user_id` | uuid | 예 | `users.id` 참조 |
| `role` | text | 예 | 공동 보호자, 기록 담당, 읽기 전용 |
| `status` | text | 예 | active, removed |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |

### shared_care_invitations

`/api/v1/shared-care/invitations` 후보에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 초대 ID |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `invited_by_user_id` | uuid | 예 | 초대한 사용자 |
| `target` | text | 예 | 이메일, 전화번호, 링크 대상 |
| `role` | text | 예 | 초대 역할 |
| `status` | text | 예 | pending, accepted, rejected, canceled, expired |
| `message` | text | 아니오 | 초대 메시지 |
| `expires_at` | timestamptz | 아니오 | 만료 시각 |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |

### hospitals

근처 병원 검색과 상세 조회 후보에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 병원 ID |
| `name` | text | 예 | 병원명 |
| `address` | text | 예 | 주소 |
| `phone` | text | 아니오 | 전화번호 |
| `latitude` | numeric | 아니오 | 위도 |
| `longitude` | numeric | 아니오 | 경도 |
| `opening_hours` | jsonb | 아니오 | 진료 시간 |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |

### hospital_reports

병원 제출용 리포트 생성과 공유 후보에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 리포트 ID |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `created_by_user_id` | uuid | 예 | 작성자 |
| `hospital_id` | uuid | 아니오 | 선택 병원 |
| `symptom_memo` | text | 아니오 | 보호자 증상 메모 |
| `summary` | text | 예 | 병원 제출용 요약 |
| `record_ids` | uuid[] | 예 | 포함 기록 목록 |
| `status` | text | 예 | draft, shared, archived |
| `share_token` | text | 아니오 | 공유 링크 토큰 |
| `shared_at` | timestamptz | 아니오 | 공유 시각 |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |

### products

쇼핑 추천 제품 후보에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 상품 ID |
| `name` | text | 예 | 상품명 |
| `category` | text | 예 | 사료, 건강 용품, 케어 용품, 생활 용품 |
| `description` | text | 아니오 | 설명 |
| `image_file_id` | uuid | 아니오 | `files.id` 참조 |
| `partner_url` | text | 아니오 | 제휴 링크 |
| `is_active` | boolean | 예 | 노출 여부 |
| `created_at` | timestamptz | 예 | 생성 시각 |
| `updated_at` | timestamptz | 예 | 수정 시각 |

### product_recommendations

`/api/v1/products/recommendations` 후보에 대응합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 추천 ID |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `product_id` | uuid | 예 | `products.id` 참조 |
| `reason` | text | 예 | 추천 이유 |
| `source_record_ids` | uuid[] | 예 | 추천 근거 기록 |
| `score` | numeric | 아니오 | 추천 점수 |
| `created_at` | timestamptz | 예 | 생성 시각 |

### saved_products

추천 상품 저장 상태입니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 저장 ID |
| `user_id` | uuid | 예 | `users.id` 참조 |
| `pet_id` | uuid | 예 | `pets.id` 참조 |
| `product_id` | uuid | 예 | `products.id` 참조 |
| `created_at` | timestamptz | 예 | 저장 시각 |

### files

프로필 사진, 기록 첨부, 상품 이미지에 공통으로 사용합니다.

| 컬럼 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | 예 | 파일 ID |
| `owner_user_id` | uuid | 예 | 업로드 사용자 |
| `pet_id` | uuid | 아니오 | 반려동물 연결 |
| `purpose` | text | 예 | profile_photo, record_attachment, product_image 등 |
| `storage_key` | text | 예 | 객체 저장소 key |
| `mime_type` | text | 예 | MIME 타입 |
| `byte_size` | integer | 예 | 파일 크기 |
| `created_at` | timestamptz | 예 | 업로드 시각 |
| `deleted_at` | timestamptz | 아니오 | 삭제 시각 |

## API 응답 스키마

현재 API는 공통 envelope를 사용합니다.

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

주요 응답 payload는 아래 형태를 유지합니다.

| API | 성공 data |
| --- | --- |
| `GET /api/v1/me` | `{ id, name, email }` |
| `GET /api/v1/pets` | `{ pets }` |
| `GET /api/v1/pet-log/records` | `{ records }` |
| `GET /api/v1/pet-log/schedules` | `{ schedules }` |
| `GET /api/v1/notifications` | `{ notifications }` |
| `PUT /api/v1/profile` | `{ profile }` |
| `POST /api/v1/ai/records/structure` | `{ structured }` |
| `POST /api/v1/records` | `{ record }` |
| `PATCH /api/v1/records/:id` | `{ record }` |
| `DELETE /api/v1/records/:id` | `{ deletedId }` |
| `POST /api/v1/schedules` | `{ schedule }` |
| `PATCH /api/v1/schedules/:id` | `{ schedule }` |
| `DELETE /api/v1/schedules/:id` | `{ deletedId }` |
| `PUT /api/v1/settings` | `{ settings }` |
| `PUT /api/v1/notifications/read` | `{ readNotificationIds }` |
| `PUT /api/v1/expansion-state` | `{ expansionState }` |
| `GET /api/v1/chatbot/threads` | `{ threads }` |
| `POST /api/v1/chatbot/threads` | `{ thread }` |
| `POST /api/v1/chatbot/threads/:threadId/messages` | `{ thread, userMessage, assistantMessage, answer, referencedRecordIds, safetyNotice }` |

## 인덱스 후보

| 테이블 | 인덱스 | 목적 |
| --- | --- | --- |
| `pets` | `(owner_user_id, deleted_at)` | 내 반려동물 목록 |
| `pet_records` | `(pet_id, recorded_at desc)` | 타임라인 조회 |
| `pet_records` | `(pet_id, category, recorded_at desc)` | 카테고리 필터 |
| `pet_records` | GIN 또는 전문 검색 인덱스 on `title`, `detail` | 검색 |
| `structured_records` | `(record_id)` unique nullable | 기록별 구조화 결과 |
| `care_schedules` | `(pet_id, due_date, is_done)` | 일정과 알림 계산 |
| `notification_reads` | `(user_id, pet_id, notification_id)` unique | 읽음 중복 방지 |
| `chatbot_threads` | `(user_id, pet_id, updated_at desc)` | 최근 대화방 |
| `chatbot_messages` | `(thread_id, created_at)` | 대화 메시지 정렬 |
| `shared_care_members` | `(pet_id, user_id)` unique | 멤버 중복 방지 |
| `saved_products` | `(user_id, pet_id, product_id)` unique | 저장 상품 중복 방지 |

## 마이그레이션 순서

1. `users`, `pets`, `files`를 먼저 만들고 현재 `PetProfile`을 `pets`로 이관합니다.
2. `pet_records`, `structured_records`, `structured_record_measurements`를 만들고 기존 `records` 배열을 이관합니다.
3. `care_schedules`, `app_settings`, `notification_reads`를 만들고 현재 클라이언트 상태 필드를 이관합니다.
4. `chatbot_threads`, `chatbot_messages`를 만들고 mock 대화방 API를 DB 저장소로 교체합니다.
5. `expansion_states`를 먼저 붙인 뒤 공동 관리, 병원, 쇼핑 제품화 시 도메인 테이블로 점진 분리합니다.

## 아직 결정이 필요한 항목

- 생일, 나이, 체중을 문자열 그대로 유지할지 정규화 컬럼으로 분리할지 결정해야 합니다.
- `recorded_at`을 보호자가 수정할 수 있게 할지, 생성 시각만 사용할지 결정해야 합니다.
- 알림을 계속 계산형으로 둘지 `notifications` 테이블에 물리 저장할지 결정해야 합니다.
- 공동 관리 권한 모델은 읽기, 기록 작성, 설정 변경, 병원 리포트 공유 같은 세부 권한으로 확장할 수 있습니다.
- AI provider 원본 응답 저장 범위는 개인정보와 비용 추적 정책을 정한 뒤 확정해야 합니다.
