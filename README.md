# Pet Log

Pet Log는 반려동물의 행동과 건강 기록을 단순히 저장하는 데서 끝내지 않고, 누적된 기록을 해석해 상태 변화와 다음 행동 제안까지 이어가는 AI Agent 기반 반려동물 관리 서비스입니다.

## 서비스 방향

- 자연어, 음성, 사진 기반 기록 입력으로 보호자의 기록 부담을 줄입니다.
- 급여, 배변, 행동, 병원, 체중 등 일상 기록을 구조화합니다.
- 누적 기록을 기반으로 이상 변화, 기록 누락, 반복 행동, 일정 리마인더를 감지합니다.
- 보호자가 다음 행동을 판단할 수 있도록 건강 관리와 행동 개선 가이드를 제공합니다.
- 반려동물 프로필과 최근 기록을 반영한 펫 대화 경험을 제공합니다.

## 현재 구현 상태

이 저장소는 `frontend/app/web`의 Next.js 모바일 우선 MVP와 `backend`의 Python AI agent backend로 구성되어 있습니다.

프론트엔드는 Next.js App Router 기반 웹 앱이며, Route Handler를 통해 백엔드 API와 연동합니다. 기록, 알림, 일정, 프로필 등의 데이터는 실제 FastAPI 백엔드와 SQLite 영구 저장소를 기반으로 동작합니다.

백엔드는 다음 기능을 완전히 구현하여 운영 중입니다:
- **알림 파이프라인**: NotificationPolicy로 4가지 kind(missing_record, risk, behavior_change, schedule) 알림 후보 생성 및 DB 기반 저장/읽음 처리
- **쇼핑 추천 AI**: Naver Shopping API + LLM 기반 추천 이유 생성 (ShoppingAgent, ShoppingRecommendationAgent)
- **기록 입력 파이프라인**: 자연어 → 구조화 → 분석 → 저장 (FastAPI Route 완전 연동)
- **일정 관리**: 지정된 기간 내 due items 목록 조회
- **음성 STT**: Whisper 기반 음성 파일 변환
- **동물병원 추천**: Google Places API 기반 위치별 병원 추천

## 주요 화면

구현된 웹 페이지:

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

참고 이미지:

- `pet-log-ui.png`
- `chat-bot.png`
- `펫로그_20260428/`

## 프로젝트 구조

```text
pet-log/
├── README.md
├── 기획.md
├── pet-log-ui.png
├── chat-bot.png
├── 펫로그_20260428/
├── frontend/
│   ├── README.md
│   ├── docs/
│   ├── _workspace/
│   └── app/web/
│       ├── package.json
│       ├── src/app/
│       ├── src/components/
│       └── src/lib/
└── backend/
    ├── README.md
    ├── pyproject.toml
    ├── tests/
    └── src/
        ├── domain/
        ├── application/
        ├── infrastructure/
        ├── agent_runtime/
        ├── middleware/
        ├── tools/
        └── presentation/
```

## 프론트엔드 실행

```bash
cd frontend/app/web
npm install
npm run dev
```

기본 접속 주소:

```text
http://localhost:3000
```

`npm run dev`는 `frontend/app/web/.env.dev`를 읽어 실행합니다. 다른 환경 파일을 쓰려면 `PET_LOG_FRONTEND_ENV_FILE`을 설정합니다.

프론트엔드 검증:

```bash
cd frontend/app/web
npm test
npm run lint
npm run typecheck
npm run build
```

환경변수 예시는 `frontend/app/web/.env.example`을 참고합니다.

```bash
cp .env.example .env.local
```

현재 정의된 클라이언트 환경변수:

```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

서버 AI provider는 기본값이 `mock`입니다. OpenAI provider를 사용할 때는 실행 환경에 다음 값을 설정합니다.

```text
PET_LOG_AI_PROVIDER=openai
OPENAI_API_KEY=
PET_LOG_OPENAI_MODEL=
PET_LOG_OPENAI_RESPONSES_URL=
```

백엔드 LLM provider는 Ollama를 로컬 런타임으로 사용합니다. `LOCAL_LLM_AUTOSTART=1`이 설정되면 Ollama 서버를 자동으로 기동하고, `LOCAL_LLM_ROLE`로 primary/fallback 모드를 선택할 수 있습니다.

```text
LLM_EAGER_LOAD=1
LOCAL_LLM_AUTOSTART=1
LOCAL_LLM_RUNTIME=ollama
LOCAL_LLM_ROLE=primary
GEMMA_AUTO_PULL=1
GEMMA_PRELOAD=1
GEMMA_BASE_URL=
GEMMA_MODEL=gemma4:e4b
GEMMA_API_KEY=local-gemma
OPENAI_API_KEY=
OPENAI_RECORD_STRUCTURING_MODEL=gpt-5-mini
OPENAI_RECORD_STRUCTURING_FALLBACK_MODEL=gpt-5-nano
OPENAI_SHOPPING_REASON_MODEL=gpt-5-mini
OPENAI_SHOPPING_REASON_FALLBACK_MODEL=gemma4:e4b
NAVER_SHOPPING_CLIENT_ID=
NAVER_SHOPPING_CLIENT_SECRET=
GOOGLE_MAPS_API_KEY=
```

`LLM_EAGER_LOAD=1`이면 백엔드 실행 시 configured LLM provider를 미리 생성합니다. `LOCAL_LLM_AUTOSTART=1`이면 백엔드가 `ollama serve`를 자동으로 시작합니다. Ollama 기본 endpoint는 `http://127.0.0.1:11434/v1`입니다. `LOCAL_LLM_ROLE=primary` (기본값)이면 Gemma가 primary이고 GPT는 fallback이며, `LOCAL_LLM_ROLE=fallback`이면 GPT가 primary이고 Gemma는 last fallback입니다. `GEMMA_AUTO_PULL=1`이면 `ollama pull <GEMMA_MODEL>`로 모델을 준비하고, `GEMMA_PRELOAD=1`이면 `/v1/chat/completions` ping으로 모델을 메모리에 올립니다. `GEMMA_MODEL`은 Ollama tag 또는 HuggingFace ID이며, HuggingFace ID는 자동으로 Ollama 형식으로 정규화됩니다.

**쇼핑 추천용 환경변수**: `OPENAI_SHOPPING_REASON_MODEL`과 `OPENAI_SHOPPING_REASON_FALLBACK_MODEL`은 Naver Shopping 추천 결과에 대한 LLM 기반 추천 이유 생성에 사용됩니다. `NAVER_SHOPPING_CLIENT_ID`와 `NAVER_SHOPPING_CLIENT_SECRET`은 Naver Shopping API 호출용 credentials입니다. `GOOGLE_MAPS_API_KEY`는 동물병원 추천용 Google Places API key입니다.

## 백엔드 실행 및 검증

백엔드는 Python 3.12 이상과 `uv` 기준으로 구성되어 있습니다.

macOS/Linux:

```bash
cd backend
./scripts/run-dev.sh
```

Windows:

```bat
cd backend
scripts\run-dev.bat
```

```bash
cd backend
uv run python -B -m unittest discover -s tests -v
```

패키지 import 경계 확인:

```bash
cd backend
uv run python -B -c "import application, agent_runtime, middleware, tools, infrastructure, presentation, composition; print('target imports ok')"
```

`application`과 `domain` 계층은 DB, HTTP framework, LLM SDK에 직접 의존하지 않아야 합니다.

```bash
cd backend
rg -n "fastapi|openai|sqlalchemy|sqlite|postgres|psycopg" src/application src/domain
```

위 명령은 출력이 없는 상태가 기대값입니다.

## 배포

### 프론트엔드 (Next.js)

웹 앱은 Next.js App Router와 API route를 사용하므로 정적 호스팅이 아니라 Node.js 런타임이 있는 Azure App Service 배포를 기준으로 합니다.

Azure 패키지 생성:

```bash
cd frontend/app/web
npm run azure:package
```

Azure 배포:

```bash
cd frontend/app/web
npm run azure:deploy -- pet-log-rg pet-log-kp-20260504 "Azure for Students"
```

### 백엔드 (FastAPI)

백엔드 배포용 스크립트는 `backend/scripts`에 위치하며, Azure App Service (Python 런타임) 배포를 지원합니다.

Azure 패키지 생성:

```bash
cd backend
bash scripts/azure-package.sh
```

Azure 배포:

```bash
cd backend
bash scripts/azure-deploy.sh <resource-group> <app-name> [subscription]
```

자세한 운영 절차는 `frontend/docs/operations/azure-app-service-runbook.md`를 참고합니다.

## 참고 문서

- `기획.md`: 서비스 기획과 UX 방향
- `frontend/README.md`: 웹 앱 실행, 구현 상태, Azure 배포 안내
- `backend/README.md`: backend architecture, pipeline 구조, 검증 명령
- `frontend/_workspace/remaining-page-work.md`: 프론트엔드 남은 작업
- `frontend/docs/operations/azure-app-service-runbook.md`: Azure App Service 운영 매뉴얼
- `backend/docs/superpowers/designs/pet-log-pipeline-interface-design.md`: backend 설계 문서 인덱스
- `backend/docs/superpowers/plans/2026-05-06-pet-log-agent-sprints.md`: backend sprint 계획

## 개발 원칙

- 기록 중심이 아니라 분석 및 행동 제안 중심의 제품 흐름을 우선합니다.
- 프론트엔드는 모바일 우선 UX와 하단 탭 기반 내비게이션을 유지합니다.
- 백엔드는 `presentation -> application pipelines -> application agents -> interfaces -> infrastructure/tools/agent_runtime` 흐름을 따릅니다.
- `domain`과 `application`은 외부 SDK와 framework import를 피하고 interface 계약에 의존합니다.
- 새 기능이나 버그 수정은 가능한 한 실패 테스트를 먼저 추가하고, 구현 후 관련 검증 명령을 실행합니다.
