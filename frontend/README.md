# 펫로그

반려동물의 행동과 건강 기록을 단순히 쌓는 데서 끝내지 않고, 누적 데이터를 기반으로 상태 변화를 해석하고 행동 제안까지 이어가는 AI Agent 기반 반려동물 관리 서비스입니다.

## 서비스 방향

- 기록 중심 앱이 아니라 분석 및 행동 제안 중심 관리 서비스
- 자연어 입력을 구조화해 사용자의 기록 부담을 줄이는 서비스
- 누적 기록을 바탕으로 이상 변화, 기록 누락, 반복 행동을 감지하는 서비스
- 보호자가 다음 행동을 판단할 수 있도록 건강 관리와 행동 개선 가이드를 제공하는 서비스

## 핵심 기능 구상

- 자연어, 음성, 사진 기반 기록 입력
- 급여, 배변, 행동, 병원, 체중 등 기록 자동 분류
- 날짜별 타임라인과 카테고리 필터
- 식사, 행동, 체중, 활동량 변화 분석
- 이상 징후, 기록 누락, 일정 기반 알림
- 행동 개선 가이드와 건강 관리 제안
- 반려동물 프로필 관리
- 커뮤니티, 병원 연계, 커머스 추천 등 확장 기능

## 현재 구현 상태

루트 repo 기준 `frontend/app/web`에 Next.js App Router 기반 MVP 웹 앱이 구현되어 있습니다. `frontend` 디렉터리 안에서 작업할 때는 같은 위치를 `app/web`로 봅니다.

구현된 페이지:

- `/` 홈
- `/record` 기록
- `/analysis` 분석
- `/community` 커뮤니티
- `/more` 더보기
- `/timeline` 기록 타임라인
- `/suggestions` AI 제안
- `/profile` 반려동물 프로필
- `/notifications` 알림
- `/schedule` 일정
- `/settings` 설정
- `/shared-care` 공동 관리
- `/hospital` 병원 연계
- `/shopping` 쇼핑

현재 웹 앱은 Next.js Route Handler의 API 경계를 사용합니다. 기록, 일정, 알림, 프로필 데이터는 FastAPI 백엔드와 SQLite 영구 저장소를 기반으로 동작합니다. 브라우저(PetLogProvider)는 초기 구동 시 필요한 데이터를 개별 API를 통해 병렬로 호출하여 로드합니다.

기록 화면의 빠른 입력 기본값은 `전체`입니다.
 `전체` 상태에서는 자연어 입력의 AI 구조화 결과(`suggestedCategory`)를 실제 저장 분류로 사용하고, 식사/산책/배변/병원/행동을 직접 선택하면 선택한 분류를 우선합니다.

## UI 기준

- 루트의 `기획.md`와 `pet-log-ui.png` 참고 이미지를 기준으로 모바일 우선 UI를 구성했습니다.
- 하단 탭은 `홈 / 기록 / 분석 / 커뮤니티 / 더보기` 구조입니다.
- 홈을 제외한 하부 페이지에는 뒤로가기 버튼이 표시됩니다.
- 콘텐츠가 길어져도 하단 메뉴바는 화면 하단에 유지되고, 본문 영역만 스크롤됩니다.

## 프로젝트 구조

```text
pet-log/
├── .gitignore
├── backend/
├── 기획.md
├── pet-log-ui.png
├── 펫로그_20260428/
└── frontend/
    ├── AGENTS.md
    ├── README.md
    ├── _workspace/
    │   ├── README.md
    │   ├── remaining-page-work.md
    │   ├── url-list.md
    │   └── qa-screenshots/
    ├── .agents/
    │   └── skills/
    ├── .github/
    │   └── workflows/
    ├── docs/
    │   ├── harness/
    │   └── operations/
    ├── backend/
    │   └── db_schema.py
    └── app/
        └── web/
            ├── package.json
            ├── src/app/
            ├── src/components/
            └── src/lib/
```

## 실행 방법

웹 앱 디렉터리로 이동합니다.

```bash
cd frontend/app/web
```

의존성을 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

기본 접속 주소는 다음과 같습니다.

```text
http://localhost:3000
```

`npm run dev`는 `app/web/.env.dev`를 읽어 실행합니다. 다른 환경 파일을 쓰려면 `PET_LOG_FRONTEND_ENV_FILE`을 설정합니다.

기록 기능을 실제 FastAPI 서버와 연결하려면 별도 터미널에서 백엔드를 먼저 실행합니다.

macOS/Linux:

```bash
cd ../../backend
./scripts/run-dev.sh
```

Windows:

```bat
cd ..\..\backend
scripts\run-dev.bat
```

웹 앱 개발 서버 환경변수는 `frontend/app/web/.env.dev`에 설정합니다.

```env
PET_LOG_BACKEND_API_BASE_URL=http://127.0.0.1:27893
PET_LOG_BACKEND_PET_ID=pet_01JCM7V8H9Q2K4N6R8T0A1B2C3
```

브라우저는 `/api/v1/records`와 `/api/v1/ai/records/structure`만 호출하고, Next Route Handler가 서버에서 FastAPI로 프록시합니다.

## 검증 명령

```bash
cd frontend/app/web
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run eval
npm run build
```

`npm run test:e2e`는 주요 라우트 smoke와 기록 저장 흐름을 실행합니다. `npm run eval`은 모바일 UI overflow/client error 검사와 기록 저장 flow grader를 실행합니다. 수동 시각 검토용 스크린샷은 `npm run eval:visual`로 생성할 수 있습니다.

## Azure 배포 방법

현재 웹 앱은 Next.js App Router와 API route를 사용하므로 정적 파일 호스팅이 아니라 Azure App Service의 Node.js 런타임으로 배포합니다.

배포 대상:

- Resource Group: `pet-log-rg`
- App Service: `pet-log-kp-20260504`
- 기본 URL: `https://pet-log-kp-20260504.azurewebsites.net`
- Runtime: `NODE|22-lts`
- 시작 명령: `node server.js`

최초 Azure 리소스가 없을 때는 다음 순서로 생성합니다.

```bash
az login
az account set --subscription "Azure for Students"

az group create -n pet-log-rg -l koreacentral
az appservice plan create -g pet-log-rg -n pet-log-plan --sku F1 --is-linux
az webapp create -g pet-log-rg -p pet-log-plan -n pet-log-kp-20260504 --runtime "NODE:22-lts"
```

앱을 빌드하고 Azure 배포용 ZIP만 만들 때는 다음 명령을 사용합니다.

```bash
cd frontend/app/web
npm run azure:package
```

ZIP 파일은 `frontend/app/web/.azure-deploy/pet-log-web.zip`에 생성되며, git에는 포함하지 않습니다.

빌드, 패키징, App Service 시작 명령 설정, ZIP 배포를 한 번에 실행하려면 다음 명령을 사용합니다.

```bash
cd frontend/app/web
npm run azure:deploy -- pet-log-rg pet-log-kp-20260504 "Azure for Students"
```

배포 후 기본 동작 확인:

```bash
curl -I https://pet-log-kp-20260504.azurewebsites.net
curl -I https://pet-log-kp-20260504.azurewebsites.net/api/v1/pets
```

현재 환경변수를 따로 설정하지 않으면 AI provider는 기본값인 `mock`으로 동작합니다. 실제 OpenAI 연동이 필요하면 App Service 환경변수에 `PET_LOG_AI_PROVIDER=openai`, `OPENAI_API_KEY`, `PET_LOG_OPENAI_MODEL` 등을 설정합니다.

## 남은 작업

자세한 내용은 `_workspace/remaining-page-work.md`에 정리되어 있습니다.

우선순위가 높은 작업:

- 기록 입력 내용이 실제 타임라인에 반영되도록 클라이언트 상태 연결
- 타임라인, 분석, 제안, 커뮤니티 필터 동작 구현
- 반려동물 프로필과 기록 데이터 타입 안정화
- 저장 방식 결정: Next route handler, local storage, 별도 백엔드 중 선택
- 자유 텍스트 기록을 카테고리와 필드로 구조화하는 AI MVP 흐름 설계
- 빈 상태, 로딩 상태, 오류 상태 추가

## 참고 문서

- `../기획.md`: 서비스 기획서
- `../pet-log-ui.png`: 모바일 UI 참고 이미지
- `_workspace/remaining-page-work.md`: 현재 구현 상태와 남은 작업
- `docs/operations/azure-app-service-runbook.md`: Azure App Service 운영 매뉴얼
- `docs/harness/pet-log-mvp/team-spec.md`: Pet Log MVP 하네스 팀 구성
- `.agents/skills/`: 프로젝트 전용 에이전트 스킬
