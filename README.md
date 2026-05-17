# Pet Log v1.1

Pet Log는 단순한 반려동물 기록장이 아니라, 보호자의 기록을 해석하고 다음 행동까지 제안하는 반려동물 관리 AI Agent 프로젝트입니다.

현재 v1.1은 **Flutter 모바일 앱**과 **FastAPI 백엔드**를 새 구조로 다시 잡는 단계입니다. 루트의 `frontend/`, `backend/`, `docs/`를 기준으로 개발합니다.

## 제품 방향

보호자는 식사, 산책, 배변, 행동, 병원 방문 같은 기록을 매번 정해진 폼에 맞춰 입력하기 어렵습니다. Pet Log는 자연어와 음성 입력을 받아 구조화하고, 누적 기록을 바탕으로 이상 변화, 기록 누락, 반복 패턴, 케어 제안을 보여주는 것을 목표로 합니다.

핵심 흐름은 다음과 같습니다.

```text
기록 입력
  -> AI 구조화
  -> 컨텍스트 분석
  -> 위험 신호 / 누락 기록 / 반복 패턴 감지
  -> 보호자가 실행할 수 있는 제안과 알림
```

## 주요 기능 범위

- 홈: 반려동물 요약, 오늘 할 일, AI 제안, 펫 챗 진입
- 기록 입력: 자연어, 음성, 사진 기반 기록 입력과 AI 구조화 미리보기
- 타임라인: 날짜별 기록 조회, 카테고리 필터, 검색, 수정/삭제
- 분석 리포트: 식사, 체중, 활동, 이상 징후, 병원 제출용 요약
- AI 제안: 기록 기반 행동 개선, 건강 관리, 일정 리마인더
- 펫 챗: 반려동물 프로필과 최근 기록을 반영한 감성 대화
- AI 케어 Q&A: 기록 기반 케어 질문 답변과 병원 상담 연결
- 확장 기능: 일정, 커뮤니티, 공동 관리, 병원 연계, 쇼핑 추천, 알림, 설정

## 현재 저장소 구조

```text
.
├── 기획.md
├── docs/
│   ├── mobile/                              # Flutter 모바일 앱 계획
│   ├── superpowers/specs/                   # 백엔드/AI/API 설계
│   └── harness/                             # MVP 작업 하네스와 역할 정의
├── frontend/
│   └── app/mobile/flutter/                  # Flutter 모바일 앱
└── backend/
    └── app/fastapi/                         # FastAPI 백엔드 의존성 기반
```

## 모바일 앱

Flutter 앱은 iOS와 Android를 목표로 합니다. 현재 스캐폴드는 `frontend/app/mobile/flutter`에 있으며, Riverpod, GoRouter, Dio, Hive, 음성 녹음, 지도, 차트, 이미지, 로컬 알림, freezed/json 직렬화 의존성을 포함합니다.

개발 기준은 `docs/mobile/2026-05-16-flutter-mobile-plan.md`에 정리되어 있습니다.

```bash
cd frontend/app/mobile/flutter
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=APP_ENV=dev
```

스프린트 기준:

| Sprint | 목표 |
| --- | --- |
| 1 | 앱 셸, 라우팅, 하단 탭, 기본 테마 |
| 2 | 펫 프로필과 홈 |
| 3 | 기록 입력과 타임라인 |
| 4 | 분석 리포트와 AI 기능 |
| 5 | 커뮤니티와 일정 |
| 6 | 병원, 쇼핑, 알림, 설정, 릴리즈 준비 |
| 7 | 멀티 프로필 관리와 데이터 격리 |

## 백엔드

백엔드는 v1.1에서 Main API와 AI Worker를 분리하는 2-service 구조를 목표로 합니다.

- Main API: 인증, 펫, 기록, 일정, 알림, 쇼핑, 병원, 커뮤니티, AI 작업 관리
- AI Worker: LangGraph 파이프라인, Whisper STT, Edge-TTS, AI 분석 작업
- 데이터 저장소: Azure Cosmos DB
- 비동기 처리: Azure Queue Storage
- 운영 경계: Azure API Management, VNet 내부 Private Endpoint, 내부 콜백 secret

설계 기준은 `docs/superpowers/specs/2026-05-17-backend-distributed-design.md`에 정리되어 있습니다.

현재 루트 백엔드에는 FastAPI 의존성 기반이 먼저 준비되어 있습니다.

```bash
cd backend/app/fastapi
uv sync
uv run pytest
uv run ruff check .
```

## AI Agent 구조

AI Agent는 기록을 구조화하고, 반려동물 프로필·기록·일정을 조합해 케어 컨텍스트를 만든 뒤, 분석/위험 탐지/제안/알림/쇼핑/펫 챗으로 나뉘어 동작하는 구조를 목표로 합니다.

대표 구성:

- `RecordStructuringAgent`: 자유 텍스트를 카테고리, 제목, 상세, 상태로 구조화
- `ContextAnalysisAgent`: 최근 기록 패턴과 누락 기록 감지
- `RiskDetectionAgent`: 건강/안전 위험 신호 탐지
- `SuggestionAgent`: 보호자가 실행할 수 있는 케어 제안 생성
- `NotificationAgent`: 알림 메시지 계획
- `PetPersonaAgent`: 반려동물 관점의 대화 응답
- `CareQuestionPipeline`: 기록 기반 케어 Q&A

자세한 구조는 `docs/ai-agent-architecture.md`를 기준으로 봅니다.

## Eval과 완료 기준

스프린트는 기능 구현만이 아니라 eval gate 통과를 완료 기준으로 둡니다.

모바일 기본 gate:

```bash
cd frontend/app/mobile/flutter
flutter analyze
flutter test
```

릴리즈 준비 단계 gate:

```bash
flutter test integration_test/
flutter build apk --release
flutter build ios --release
```

스프린트별 eval 정의는 `.claude/evals/`에 있습니다.

## 주요 문서

- `기획.md`: 제품 원문 기획과 전체 서비스 구조
- `docs/mobile/2026-05-16-flutter-mobile-plan.md`: Flutter 모바일 앱 PRD, 아키텍처, 스프린트 플랜
- `docs/superpowers/specs/2026-05-17-backend-distributed-design.md`: v1.1 백엔드 분산 설계
- `docs/ai-agent-architecture.md`: AI Agent 구성과 데이터 흐름
- `docs/superpowers/plans/2026-05-16-flutter-mobile-eval-harness.md`: Flutter 스프린트별 eval gate
- `docs/harness/pet-log-mvp/team-spec.md`: MVP 작업 역할과 handoff 규칙

## 개발 규칙

- 문서는 한국어로 작성합니다.
- `main`에서 직접 작업하지 않고 작업 브랜치를 만든 뒤 변경합니다.
- 커밋은 사용자 승인 후 진행합니다.
- 구현은 새 루트 구조인 `frontend/`, `backend/`, `docs/`를 기준으로 합니다.
