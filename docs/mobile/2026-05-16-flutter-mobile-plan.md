# Flutter 모바일 앱 플랜

## 개요

Pet Log의 Flutter 기반 iOS/Android 네이티브 앱 구현 계획이다. 이미 완성된 Next.js 웹 앱(5 스프린트), FastAPI 백엔드와 동일한 REST API를 그대로 사용한다.

---

## 1. PRD

### 제품 비전

기록 중심이 아닌 **분석·행동 제안 중심** 반려동물 관리 AI Agent를 네이티브 모바일 경험으로 제공한다. 자연어/음성 입력, 실시간 AI 분석, 펫 챗봇 감성 인터페이스를 모바일 최적화 UX로 구현한다.

### 대상 플랫폼

- iOS 16.0 이상 (iPhone)
- Android 7.0(API 24) 이상

### 화면 목록

웹 앱 구현 범위와 동일하다.

| 번호 | 화면 | 설명 |
|------|------|------|
| 1 | 홈 | 펫 프로필 요약, 오늘 할 일, AI 제안 카드, 펫 챗 진입, AI 케어 Q&A 진입 |
| 2 | 기록 입력 | 자연어/음성/사진 입력, AI 자동 분류, 미리보기 후 저장 |
| 3 | 기록 타임라인 | 날짜 탐색, 카테고리 필터, 검색, 상세/수정/삭제 |
| 4 | 분석 리포트 | 식사·체중·활동 차트, 주간/월간, 이상 징후, 병원 제출 요약 |
| 5 | AI 제안 | 행동 개선 가이드, 건강 관리 제안, 기록 기반 개인화 |
| 6 | 반려동물 프로필 | 이름·나이·품종·체중, 사진 업로드, 질환 정보 |
| 7 | 일정 | 예방접종·약 복용·건강검진, D-day 표시, 리마인더 |
| 8 | 커뮤니티 | 피드, 게시글 상세·댓글·반응, 게시글 작성 |
| 9 | 공동 관리 | 보호자 초대, 역할 설정, 기록 공유 |
| 10 | 병원 연계 | 지도 기반 병원 검색, 방문 기록, AI 요약 리포트 |
| 11 | 쇼핑 | 건강 기반 맞춤 추천, 카테고리 필터 |
| 12 | 알림 | 이상 징후·일정·누락 알림, 읽음 처리 |
| 13 | 펫 챗 | 반려동물 말투 감성 대화, 최근 기록 반영 |
| 14 | AI 케어 Q&A | 기록 기반 케어 조언, 병원 상담 연결 |
| 15 | 설정 | 알림·AI 토글, 데이터 관리, 계정 |
| 16 | 로그인/회원가입 | 소셜 로그인 |

### 핵심 UX 원칙

- 하단 탭 네비게이션: 홈 / 기록 / 타임라인 / 분석 / 더보기
- 음성 입력은 기록 화면에서 플로팅 버튼으로 진입
- 펫 챗은 홈 프로필 카드 아래에서 오른쪽 슬라이드 패널
- AI 케어 Q&A는 왼쪽 슬라이드 패널
- 오프라인 상태에서는 마지막 캐시 데이터를 표시하고 재연결 시 자동 동기화

---

## 2. 아키텍처

### 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| State Management | Riverpod 2.x | 타입 안전, async-first, 보일러플레이트 최소 |
| Navigation | GoRouter | 공식 Flutter 라우팅, 딥링크 지원 |
| HTTP Client | Dio | 인터셉터, 파일 업로드, 타임아웃/재시도 |
| Local Cache | Hive | 빠른 key-value, 오프라인 캐시 |
| Secrets | flutter_secure_storage | 토큰 안전 보관 |
| Voice | record 패키지 | 녹음 → WAV → `/api/v1/speech/transcriptions` |
| Maps | google_maps_flutter + geolocator | 병원 검색 지도 |
| Charts | fl_chart | 분석 화면 체중/식사 차트 |
| Images | image_picker + cached_network_image | 프로필 사진 업로드/표시 |
| Notifications | flutter_local_notifications | 로컬 알림 |
| Models | freezed + json_serializable | 불변 모델, JSON 코드 생성 |
| Code Gen | build_runner | freezed/json_serializable 자동 생성 |

### 레이어 구조

```
frontend/app/mobile/
├── lib/
│   ├── main.dart                   # ProviderScope, GoRouter 진입점
│   ├── config/                     # AppConfig (dev/prod), Theme, Constants
│   ├── core/
│   │   ├── services/
│   │   │   ├── api_client.dart     # Dio + AuthInterceptor
│   │   │   └── local_storage.dart  # Hive 래퍼
│   │   └── utils/                  # logger, validators, extensions
│   ├── domain/
│   │   ├── models/                 # Pet, Record, Schedule, Notification, ...
│   │   └── repositories/           # 각 도메인 repository 인터페이스 + 구현
│   └── presentation/
│       ├── providers/              # Riverpod provider (feature별)
│       ├── screens/                # 화면별 디렉터리
│       ├── widgets/                # 공통 위젯
│       └── router/                 # app_router.dart
├── test/
│   ├── helpers/
│   │   ├── mock_api_client.dart    # Dio mock (mockito)
│   │   └── test_providers.dart     # override용 ProviderContainer
│   ├── domain/
│   └── presentation/
└── integration_test/
    ├── app_test.dart               # 전체 앱 스모크
    └── record_flow_test.dart       # 기록 저장 → 타임라인 확인
```

### 데이터 흐름

```
UI (ConsumerWidget)
  ↕ ref.watch / ref.read
Riverpod Provider (AsyncNotifier)
  ↕
Repository (인터페이스)
  ↕
ApiClient (Dio)  ←→  FastAPI 백엔드 (iOS: localhost:27893 / Android: 10.0.2.2:27893)
  ↕
Hive Cache      ←→  오프라인 폴백
```

### API 연동 기준

- Base URL (dev):
  - iOS Simulator: `http://localhost:27893`
  - Android Emulator: `http://10.0.2.2:27893` (emulator 내부에서 호스트 머신으로 접근)
  - `AppConfig`가 `dart-define=APP_ENV`와 `Platform.isAndroid`를 조합해 자동 선택
- Base URL (prod): Azure URL
- 인증: `Authorization: Bearer <token>` — AuthInterceptor에서 자동 주입
- 에러: `DioException` → `PetLogException` 타입으로 통합 처리
- 파일 업로드: `MultipartFile` + `FormData` → `POST /api/v1/files`
- 음성 전사: WAV 파일 → `POST /api/v1/speech/transcriptions` → 텍스트 반환

### 주요 API 엔드포인트

웹 앱과 동일한 REST API를 사용한다. 상세 계약은 `frontend/_workspace/api-contract-plan.md`, `frontend/_workspace/url-list.md` 참조.

| Method | Path | 용도 |
|--------|------|------|
| GET/POST | `/api/v1/pets` | 펫 목록 / 펫 생성 |
| PATCH/DELETE | `/api/v1/pets/{pet_id}` | 펫 수정 / 삭제 |
| GET | `/api/v1/pet-log/profile?pet_id=` | 펫 프로필 조회 (Sprint 2) |
| GET | `/api/v1/pet-log/records?pet_id=` | 기록 목록 |
| POST | `/api/v1/pet-log/records` | 기록 생성 (confirm:false → 미리보기, confirm:true → 저장) |
| PATCH/DELETE | `/api/v1/pet-log/records/{record_id}` | 기록 수정 / 삭제 |
| GET | `/api/v1/pet-log/schedules?pet_id=` | 일정 목록 |
| POST | `/api/v1/pet-log/schedules` | 일정 생성 |
| PATCH/DELETE | `/api/v1/pet-log/schedules/{schedule_id}` | 일정 수정 / 삭제 |
| GET | `/api/v1/notifications?pet_id=` | 알림 목록 |
| PATCH | `/api/v1/notifications/{notification_id}/read` | 알림 읽음 처리 |
| POST | `/api/v1/speech/transcriptions` | 음성 전사 |
| GET | `/api/v1/ai/insights?pet_id=` | 건강 리포트/분석 |
| GET | `/api/v1/ai/suggestions?pet_id=` | AI 제안 |
| POST | `/api/v1/ai/pet-chat` | 펫 챗봇 |
| POST | `/api/v1/ai/care-answer` | AI 케어 Q&A |
| POST | `/api/v1/hospitals/recommendations` | 병원 추천 |
| GET | `/api/v1/shopping/recommendations?pet_id=` | 쇼핑 추천 |
| POST | `/api/v1/files` | 파일 업로드 |

### 오프라인 전략

- Hive에 마지막 API 응답을 캐시
- 네트워크 오류 시 캐시 데이터로 폴백, 배너로 오프라인 상태 표시
- 재연결 시 `ref.refresh(provider)` 로 자동 동기화

---

## 3. 스프린트 플랜

### Sprint 1: Foundation & Navigation

**목표**: 프로젝트 셋업, API 클라이언트, 앱 셸

**태스크**:
- `flutter create` 로 `frontend/app/mobile` 초기화
- `pubspec.yaml`: 전체 의존성 선언
- `AppConfig`: dev/prod 환경 분리 (`dart-define`)
- Dio API 클라이언트 + AuthInterceptor
- Riverpod ProviderScope 진입점
- GoRouter: 전체 라우트 선언 (16개 화면)
- Theme: 색상, 폰트, 디자인 토큰
- BottomNavigationBar: 홈/기록/타임라인/분석/더보기
- AuthProvider + 로그인 화면 (mock)
- `flutter analyze` + 단위 테스트: API 클라이언트

**산출물**: 바텀 탭 전환되는 빈 앱 셸

---

### Sprint 2: 펫 프로필 & 홈

**목표**: 펫 CRUD, 홈 화면 요약

**태스크**:
- `Pet` 모델 (freezed + json_serializable)
- `PetRepository` → `GET/POST/PATCH/DELETE /api/v1/pets`
- `petProvider` (AsyncNotifier)
- 홈 화면: 펫 요약 카드, 오늘 알림 미리보기, AI 제안 카드
- 펫 프로필 화면: 읽기/편집
- 사진 업로드: `image_picker` → `POST /api/v1/files`
- 펫 선택기 (멀티 펫 전환)
- Hive 캐시: 펫 목록
- 위젯 테스트: 홈 카드, 프로필 폼

**산출물**: 펫 관리 전체 + 홈 화면

---

### Sprint 3: 기록 입력 & 타임라인

**목표**: 텍스트/음성 기록 입력, 타임라인 조회

**태스크**:
- `Record` 모델 (freezed)
- `RecordRepository` → `/api/v1/pet-log/records`
- 텍스트 기록 입력 화면: 카테고리 선택 + 자연어 입력 + AI 구조화 미리보기
- 음성 녹음 위젯: `record` 패키지 → WAV → 전사 → 구조화
- 타임라인 화면: 날짜 탐색 + 카테고리 필터 + 검색
- RecordCard 위젯: 편집/삭제 스와이프 액션
- Hive 캐시: 기록 목록 (날짜별)
- 낙관적 UI 업데이트
- 위젯 테스트: 기록 폼, 타임라인 카드

**산출물**: 기록 입력 (텍스트+음성) + 타임라인

---

### Sprint 4: 분석 & AI 기능

**목표**: 건강 리포트, AI 제안, 펫 챗, AI 케어 Q&A

**태스크**:
- `analysisProvider` → `GET /api/v1/ai/insights`
- 분석 화면: 주간/월간 전환, fl_chart 차트 (체중·식사·활동)
- 이상 징후 섹션, 병원 제출 요약
- `suggestionProvider` → `GET /api/v1/ai/suggestions`
- AI 제안 목록 화면
- 펫 챗 우측 슬라이드 패널: `POST /api/v1/ai/pet-chat`
- AI 케어 Q&A 좌측 슬라이드 패널: `POST /api/v1/ai/care-answer`
- Markdown 렌더링 (AI 응답)
- 위젯 테스트: 차트, 챗 패널

**산출물**: 분석 화면 + AI 기능 전체

---

### Sprint 5: 커뮤니티 & 일정

**목표**: 커뮤니티 피드, 케어 일정

**태스크**:
- `CommunityRepository` → `/api/v1/community/*`
- 커뮤니티 피드: 피드 필터, 무한 스크롤
- 게시글 상세: 댓글 + 반응 + 공유
- 게시글 작성 화면: 사진 첨부
- `ScheduleRepository` → `/api/v1/pet-log/schedules`
- 일정 화면: 목록/추가/수정, D-day 배지
- `flutter_local_notifications` 일정 알림 연동
- 위젯 테스트: 피드 카드, 일정 아이템

**산출물**: 커뮤니티 + 일정 관리

---

### Sprint 6: 병원·쇼핑·알림·설정 & 폴리쉬

**목표**: 지도, 알림, 설정, 공동 관리, 최종 정리

**태스크**:
- `HospitalRepository` → `POST /api/v1/hospitals/recommendations`
- Google Maps + Geolocator: 위치 기반 병원 지도
- 쇼핑 추천: `GET /api/v1/shopping/recommendations`
- 공동 관리 화면: 보호자 초대, 역할 설정
- 알림 목록 화면 + 개별/일괄 읽음 처리
- 설정 화면: 알림·AI 토글, 데이터 내보내기
- 접근성 리뷰: `Semantics`, 색상 대비
- 성능 프로파일링 (DevTools)
- 통합 테스트 (`integration_test/`)
- `flutter build apk --release` + `flutter build ios --release` 확인

**산출물**: 완성된 Full 앱 (iOS + Android 릴리즈 준비)

---

### Sprint 7: 멀티 프로필 관리
**목표**: 보호자 다중 프로필 + 펫별 프로필 전환, 프로필 간 데이터 격리

#### 아키텍처 핵심

```
activeProfileProvider (StateNotifier<ActiveProfile>)
  ├── activePetId      → 펫-스코프 Provider 12개가 watch
  ├── activeGuardianId → 공동 관리 권한 체크
  └── 변경 시 cascade → ref.invalidate(recordListProvider(petId)) 등
```

> **위험 포인트**: `recordListProvider`, `insightProvider`, `suggestionProvider`가 단일 인스턴스라면 프로필 전환 시 이전 펫 데이터가 화면에 잔류한다. **반드시 `.family` 패턴으로 전환**해야 데이터 격리가 보장된다.

#### 영향 화면 목록

| 영향 수준 | 화면 | 필요한 변경 |
|-----------|------|------------|
| **직접 (UI+로직)** | 홈 | AppBar 프로필 스위처; `homeProvider`가 `activePetId` watch |
| | 기록 입력 | 활성 펫 표시; 멀티펫 전환 가능 |
| | 기록 타임라인 | `recordListProvider(petId)` family 패턴 |
| | 분석 리포트 | `insightProvider(petId)` family 패턴 |
| | AI 제안 | `suggestionProvider(petId)` family 패턴 |
| | 펫 챗 | 활성 펫 ID 전달 |
| | AI 케어 Q&A | 활성 펫 컨텍스트 전달 |
| **직접 (관리 UI)** | 반려동물 프로필 | 단일 편집 → 펫 목록 + 추가/순서변경/삭제 |
| | 공동 관리 | 보호자별 펫 접근 권한 매핑 |
| | 설정 | "멀티 프로필 설정" 섹션 추가 → ProfileSettingsScreen |
| **부분 (파라미터)** | 일정 | `scheduleProvider(petId)` |
| | 병원 연계 | 방문 기록 저장 시 펫 ID 자동 바인딩 |
| | 알림 | 프로필별 알림 on/off 설정 조회 |
| | 쇼핑 | 추천 요청 시 활성 펫 데이터 전달 |
| **영향 없음** | 커뮤니티 | 사용자(보호자) 레벨 — 펫 컨텍스트 없음 |
| | 로그인/회원가입 | 인증 레벨, 프로필 선택 이전 |

#### 구현 항목

- `UserProfileRepository` → `GET /api/v1/me` (보호자 정보 조회); 다중 펫 CRUD는 `GET/POST/PATCH/DELETE /api/v1/pets` 사용
- 다중 펫 프로필 추가/편집/삭제/순서 변경, 펫별 프로필 사진 (`POST /api/v1/files`)
- `activeProfileProvider` (StateNotifier) — 전역 보호자·펫 조합 상태
- 펫-스코프 Provider를 `.family` 패턴으로 리팩터: `recordList`, `insight`, `suggestion`, `schedule`, `petChat`
- 프로필 전환 시 `ref.invalidate` cascade — 이전 펫 stale 데이터 제거
- AppBar/Drawer 활성 프로필 스위처 위젯
- `NotificationPreferenceRepository` — 프로필별 알림 설정 분리
- 공동 케어 프로필 뷰: 보호자별 보기/편집 권한 표시
- 설정 화면 "멀티 프로필 설정" 섹션 → `ProfileSettingsScreen`
- 단위 테스트: 프로필 전환, 권한 모델, provider family 격리

**산출물**: 멀티 프로필 전환 + provider family 격리 + 14개 화면 업데이트 완성

---

## 4. 테스트 하네스

### 구조

```
frontend/app/mobile/
├── test/
│   ├── helpers/
│   │   ├── mock_api_client.dart    # Dio mock (mockito)
│   │   └── test_providers.dart     # override용 ProviderContainer
│   ├── domain/
│   │   ├── pet_repository_test.dart
│   │   └── record_repository_test.dart
│   └── presentation/
│       ├── home_screen_test.dart
│       ├── record_input_test.dart
│       └── timeline_test.dart
└── integration_test/
    ├── app_test.dart               # 전체 앱 스모크
    └── record_flow_test.dart       # 기록 저장 → 타임라인 확인
```

### 도구

| 도구 | 용도 |
|------|------|
| `flutter test` | 단위/위젯 테스트 |
| `flutter test integration_test/` | 통합 테스트 (실 기기/에뮬레이터) |
| `mockito` | Repository/API 클라이언트 mock |
| `flutter_test` | 위젯 테스트 프레임워크 |

### Eval Gate (스프린트별 완료 기준)

각 스프린트 완료 후 다음을 확인한다:

```bash
flutter analyze            # 정적 분석 오류 없음
flutter test               # 단위/위젯 테스트 전체 통과
flutter run                # iOS Simulator + Android Emulator 수동 확인
```

Sprint 6 완료 후:

```bash
flutter build apk --release
flutter build ios --release
flutter test integration_test/  # 통합 테스트 전체 통과
```

### 목표 커버리지

- 단위/위젯: 80% 이상
- 통합: 핵심 플로우(기록 저장, 타임라인 조회, 분석 로딩) 100%

---

## 5. 프로젝트 구성

### 주요 파일

| 파일 | 역할 |
|------|------|
| `frontend/app/mobile/pubspec.yaml` | 패키지 의존성 + 빌드 플레이버 |
| `lib/main.dart` | ProviderScope, GoRouter 진입점 |
| `lib/core/services/api_client.dart` | Dio 클라이언트 |
| `lib/presentation/router/app_router.dart` | 모든 라우트 |
| `lib/domain/repositories/pet_repository.dart` | 펫 CRUD |
| `lib/domain/repositories/record_repository.dart` | 기록 CRUD |
| `lib/presentation/screens/home/home_screen.dart` | 홈 |
| `lib/presentation/screens/record_input/record_input_screen.dart` | 기록 입력 |
| `lib/presentation/screens/timeline/timeline_screen.dart` | 타임라인 |
| `lib/presentation/widgets/bottom_nav.dart` | 하단 네비게이션 |

### 환경 분리

```bash
# dev (iOS Simulator / Android Emulator 공통 — AppConfig가 Platform.isAndroid로 URL 자동 선택)
flutter run --dart-define=APP_ENV=dev

# prod
flutter run --dart-define=APP_ENV=prod
```

### 기존 문서 참조

- 기획 원문: `기획.md`
- API 계약: `frontend/_workspace/api-contract-plan.md`
- API URL 목록: `frontend/_workspace/url-list.md`
- 데이터 스키마: `frontend/_workspace/data-schema.md`
- 웹 앱 위치: `frontend/app/web`
