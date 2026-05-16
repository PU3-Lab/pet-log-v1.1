# URL 목록

## 기준

- 로컬 개발 서버 기준 URL: `http://localhost:3000`
- 웹 앱 위치: repo root 기준 `frontend/app/web`, `frontend` 기준 `app/web`
- 화면 라우트 기준: `frontend/app/web/src/app`
- API 라우트 기준: `frontend/app/web/src/app/api/v1/[...path]/route.ts`

## 화면 URL

| URL | 화면 | 상태 | 비고 |
| --- | --- | --- | --- |
| `/` | 홈 | 구현됨 | 프로필 요약, 펫 대화 진입, AI 질문, 오늘 알림, 요약, 제안 표시 |
| `/record` | 기록 입력 | 구현됨 | 자연어 입력, 음성 입력, AI 구조화 미리보기, 저장 |
| `/timeline` | 기록 타임라인 | 구현됨 | 날짜별 조회, 검색, 카테고리 필터, 상세/수정/삭제 |
| `/analysis` | 분석 리포트 | 구현됨 | 주간/월간 전환, 지표 필터, 변화 추이, 병원 제출 요약 |
| `/suggestions` | AI 제안 | 구현됨 | 기록 기반 케어 제안과 기본 제안 표시 |
| `/profile` | 프로필 | 구현됨 | 프로필 편집, 사진 업로드, 사진 촬영 입력 |
| `/notifications` | 알림 | 구현됨 | 읽음 처리, 모두 읽음, 설정 선호 반영 |
| `/schedule` | 일정 | 구현됨 | 일정 추가, 완료 처리, 삭제 |
| `/community` | 커뮤니티 | 구현됨 | 피드 필터, 글 상세, 댓글, 글쓰기 |
| `/shared-care` | 공동 관리 | UI 구현됨 | 초대 입력, 역할 선택, 활동 기록 목업 |
| `/hospital` | 병원 연계 | UI 구현됨 | 근처 병원 지도 목업, 병원 선택, 제출용 리포트 |
| `/shopping` | 쇼핑 | UI 구현됨 | 추천 카드, 카테고리 필터, 저장 상태 |
| `/more` | 더보기 | 구현됨 | 확장 화면과 설정 진입 |
| `/settings` | 설정 | 구현됨 | 알림/AI 토글, 데이터 내보내기, 초기화 |

## API URL

현재 API는 Next.js Route Handler에서 실제 HTTP 요청을 받고, 응답 데이터는 메모리 mock store와 mock AI provider를 사용합니다.

| Method | URL | 용도 | 상태 |
| --- | --- | --- | --- |
| `GET` | `/api/v1/me` | 내 계정 정보 조회 | 구현됨 |
| `GET` | `/api/v1/pets` | 반려동물 목록 조회 | 구현됨 |
| `GET` | `/api/v1/pet-log/records` | 특정 반려동물의 기록 목록 조회 | 구현됨 |
| `GET` | `/api/v1/pet-log/schedules` | 특정 반려동물의 일정 목록 조회 | 구현됨 |
| `GET` | `/api/v1/notifications` | 특정 반려동물의 알림 목록 조회 | 구현됨 |
| `PUT` | `/api/v1/profile` | 반려동물 프로필 저장 | 구현됨 |
| `POST` | `/api/v1/ai/records/structure` | 자연어 기록 구조화 | 구현됨 |
| `POST` | `/api/v1/records` | 기록 생성 | 구현됨 |
| `PATCH` | `/api/v1/records/:id` | 기록 수정 | 구현됨 |
| `DELETE` | `/api/v1/records/:id` | 기록 삭제 | 구현됨 |
| `POST` | `/api/v1/schedules` | 일정 생성 | 구현됨 |
| `PATCH` | `/api/v1/schedules/:id` | 일정 수정 및 완료 상태 변경 | 구현됨 |
| `DELETE` | `/api/v1/schedules/:id` | 일정 삭제 | 구현됨 |
| `PUT` | `/api/v1/settings` | 앱 설정 저장 | 구현됨 |
| `PUT` | `/api/v1/notifications/read` | 알림 일괄 읽음 처리 | 구현됨 |
| `PATCH` | `/api/v1/notifications/:id/read` | 알림 개별 읽음 처리 | 구현됨 |
| `POST` | `/api/v1/files` | 사진 업로드 | 구현됨 |
| `GET` | `/api/v1/files/:id` | 사진 다운로드 | 구현됨 |
| `PUT` | `/api/v1/expansion-state` | 공동 관리, 병원 연계, 쇼핑 목업 상태 저장 | 구현됨 |
| `GET` | `/api/v1/chatbot/threads` | 챗봇 대화방 목록 조회 | 구현됨 |
| `POST` | `/api/v1/chatbot/threads` | 챗봇 대화방 생성 | 구현됨 |
| `POST` | `/api/v1/chatbot/threads/:threadId/messages` | 특정 대화방에 질문 추가 | 구현됨 |
| `POST` | `/api/v1/chatbot/messages` | 기본 챗봇 질문 전송 | 구현됨 |

## 추가 필요 API 후보

다음 URL은 아직 구현하지 않았지만, mock store를 실제 서버/DB/API로 전환할 때 필요합니다. 우선순위는 현재 UI와 기획 범위를 기준으로 정리합니다.

### 1순위. 서버 저장소 전환 (완료)

기록, 일정, 알림, 프로필, 파일 업로드 관련 API가 백엔드와 연동되었습니다.

### 2순위. 계정과 반려동물 다중화 (완료)

내 정보 조회 및 반려동물 목록 조회가 구현되어 다중 펫 선택이 가능해졌습니다.

### 3순위. AI와 챗봇 확장

| Method | URL | 용도 | 비고 |
| --- | --- | --- | --- |
| `POST` | `/api/v1/pet-chat/messages` | 펫과 대화 메시지 전송 | 현재 홈 로컬 mock 응답을 서버화 |
| `GET` | `/api/v1/pet-chat/threads` | 펫 대화 이력 조회 | 감성 대화와 AI 케어 질문 분리 |
| `POST` | `/api/v1/pet-chat/threads` | 펫 대화방 생성 | 다중 펫/장기 이력 대응 |
| `POST` | `/api/v1/pet-chat/threads/:threadId/messages` | 특정 펫 대화방 메시지 추가 | DB 저장소 전환 시 필요 |
| `DELETE` | `/api/v1/chatbot/threads/:threadId` | AI 질문 대화방 삭제 | 대화 이력 관리 |
| `GET` | `/api/v1/analysis/reports` | 분석 리포트 조회 | 분석 계산 서버화 |
| `POST` | `/api/v1/analysis/reports` | 분석 리포트 생성 | 병원 제출용 요약과 연결 |
| `GET` | `/api/v1/suggestions` | 케어 제안 목록 조회 | 제안 서버화 |
| `POST` | `/api/v1/suggestions/:id/dismiss` | 제안 숨김 또는 처리 | 개인화 피드 관리 |

### 4순위. 공동 관리

| Method | URL | 용도 | 비고 |
| --- | --- | --- | --- |
| `GET` | `/api/v1/shared-care/members` | 공동 관리 멤버 목록 조회 | 역할/권한 표시 |
| `POST` | `/api/v1/shared-care/invitations` | 보호자 초대 생성 | 실제 초대 발송 |
| `GET` | `/api/v1/shared-care/invitations` | 초대 목록 조회 | 대기/만료 상태 표시 |
| `PATCH` | `/api/v1/shared-care/invitations/:id` | 초대 수락, 거절, 취소 | 초대 상태 변경 |
| `PATCH` | `/api/v1/shared-care/members/:memberId` | 멤버 역할 수정 | 권한 변경 |
| `DELETE` | `/api/v1/shared-care/members/:memberId` | 멤버 제거 | 공동 관리 해제 |
| `GET` | `/api/v1/shared-care/activity` | 공동 관리 활동 기록 조회 | 누가 무엇을 했는지 표시 |

### 5순위. 병원 연계와 지도

| Method | URL | 용도 | 비고 |
| --- | --- | --- | --- |
| `GET` | `/api/v1/hospitals/nearby` | 근처 동물병원 검색 | 위치, 반경, 영업 여부 쿼리 필요 |
| `GET` | `/api/v1/hospitals/:hospitalId` | 병원 상세 조회 | 전화, 주소, 진료 시간 |
| `POST` | `/api/v1/hospital-reports` | 병원 제출용 리포트 생성 | 기록 요약 서버화 |
| `GET` | `/api/v1/hospital-reports` | 생성한 리포트 목록 조회 | 제출 이력 관리 |
| `GET` | `/api/v1/hospital-reports/:id` | 리포트 상세 조회 | 공유 전 확인 |
| `POST` | `/api/v1/hospital-reports/:id/share` | 리포트 공유 링크 생성 | 병원 전달용 |
| `POST` | `/api/v1/hospital-appointments` | 병원 예약 요청 | 실제 예약 연동 후보 |
| `GET` | `/api/v1/hospital-appointments` | 예약 목록 조회 | 일정과 연결 후보 |

### 6순위. 쇼핑

| Method | URL | 용도 | 비고 |
| --- | --- | --- | --- |
| `GET` | `/api/v1/products/recommendations` | 맞춤 상품 추천 조회 | 프로필, 기록, 카테고리 기반 |
| `GET` | `/api/v1/products/:productId` | 상품 상세 조회 | 외부 상품 피드 연결 |
| `POST` | `/api/v1/products/:productId/save` | 추천 상품 저장 | 현재 UI 저장 상태 서버화 |
| `DELETE` | `/api/v1/products/:productId/save` | 저장한 상품 해제 | 저장 상태 관리 |
| `POST` | `/api/v1/products/:productId/click` | 제휴 링크 클릭 추적 | 전환 측정 |
| `GET` | `/api/v1/shopping/saved-products` | 저장한 상품 목록 조회 | 더보기/쇼핑 연결 |

## 패널형 진입

다음 기능은 별도 URL이 아니라 홈(`/`) 안에서 패널로 열립니다.

| 진입 | 위치 | 표시 방식 | 비고 |
| --- | --- | --- | --- |
| `물어보기` | 홈 플로팅 버튼 | 왼쪽 슬라이드 패널 | AI 케어 질문 |
| `펫과 대화하기` | 홈 프로필 아래 카드 | 오른쪽 슬라이드 패널 | 현재 반려동물과 대화 |

## 후속 연결 후보

- 실제 인증이 붙으면 `/api/v1/me`와 `/api/v1/pets`를 사용자 계정 기준으로 전환합니다.
- 실제 DB가 붙으면 기록, 일정, 설정, 확장 상태 API의 mock store를 제거합니다.
- 실제 지도 API가 붙으면 `/hospital`의 근처 동물병원 목업을 서버 또는 지도 provider 기반으로 교체합니다.
- 실제 상품 API가 붙으면 `/shopping`의 추천 카드를 상품 피드와 제휴 링크로 연결합니다.
