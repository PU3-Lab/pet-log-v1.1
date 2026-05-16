# Pet Log 기술 스택 발표 자료

이 문서는 `PPT`로 옮기기 쉽도록 슬라이드 단위로 정리한 기술 스택 요약입니다. 각 `## Slide` 섹션은 한 장의 발표 슬라이드로 사용할 수 있습니다.

## Slide 1. 프로젝트 개요

**핵심 메시지:** Pet Log는 반려동물 기록을 저장하는 앱을 넘어, 누적 기록을 해석해 상태 변화와 다음 행동 제안을 제공하는 AI Agent 기반 서비스입니다.

- 프런트엔드: `frontend/app/web`의 Next.js 모바일 우선 웹 앱
- 백엔드: `backend`의 Python AI agent backend
- 주요 기능: 자연어 기록 구조화, 타임라인, 분석, AI 제안, 펫 챗, 음성 STT/TTS
- 개발 방식: 하네스 엔지니어링 기반 기획, UX, AI 사양, 구현 계획, QA 흐름

## Slide 2. 전체 아키텍처

**핵심 메시지:** 화면, API 경계, AI pipeline을 분리해 프런트와 백엔드를 독립적으로 발전시킬 수 있게 구성했습니다.

```text
Browser
  -> Next.js App Router pages
  -> Next.js Route Handler /api/v1/...
  -> FastAPI backend /api/v1/...
  -> application pipeline
  -> LangGraph orchestration
  -> repositories, policies, LLM providers, speech providers, RAG retriever
```

- Next.js Route Handler가 프런트 API 경계와 백엔드 프록시 역할 수행
- FastAPI는 HTTP entrypoint와 pipeline 호출만 담당
- `domain`과 `application` 계층은 DB, HTTP framework, LLM SDK 직접 의존을 피함
- 외부 구현체는 `infrastructure`, `agent_runtime`, `tools`, `presentation`에 배치

## Slide 3. 프런트엔드 스택

**핵심 메시지:** Next.js, React, TypeScript 기반으로 모바일 우선 MVP 화면과 서버 API 경계를 구현했습니다.

| 영역 | 사용 기술 | 역할 |
| --- | --- | --- |
| Framework | Next.js `^16.2.4` | App Router, Route Handler, standalone build |
| UI | React `^19.2.5`, React DOM `^19.2.5` | 페이지와 공통 컴포넌트 |
| Language | TypeScript strict mode | 타입 안정성 |
| Styling | Tailwind CSS, global CSS | 모바일 우선 UI 스타일 |
| HTTP | Axios `^1.15.2` | API 호출과 FastAPI 프록시 |
| Test | `tsx --test` | `src/**/*.test.ts` 단위 테스트 |
| QA | Playwright `^1.59.1` | 모바일 화면 QA와 브라우저 검증 |
| Deploy | Azure App Service, Next.js standalone | Node.js 런타임 배포 |

## Slide 4. 하네스 엔지니어링 기반 프런트 개발

**핵심 메시지:** 프런트엔드 개발은 단순 화면 구현이 아니라, 하네스가 만든 산출물을 기준으로 제품 범위, UX, AI 동작, QA를 순차 검증하는 방식으로 진행했습니다.

- 하네스 기준 문서: `frontend/docs/harness/pet-log-mvp/team-spec.md`
- 방식: Pipeline pattern과 Producer-Reviewer gate
- 산출물 흐름:
  - Product Planner -> MVP scope와 acceptance criteria
  - UX Designer -> 모바일 우선 화면 흐름과 상태 정의
  - AI Agent Designer -> 구조화 입력, 분석, 제안, 안전 경계 정의
  - Orchestrator -> 구현 계획 생성
  - QA Reviewer -> 구현 전 품질 검토
- MVP 기본 범위: 홈 요약, 자연어 기록 입력, 기록 타임라인, 분석 리포트, AI 제안, 펫 프로필

## Slide 5. 백엔드 스택

**핵심 메시지:** Python, FastAPI, LangChain, LangGraph 기반으로 AI agent backend skeleton과 실제 provider 경계를 구성했습니다.

| 영역 | 사용 기술 | 역할 |
| --- | --- | --- |
| Language | Python `>=3.12` | backend package와 agent pipeline 구현 |
| API | FastAPI `>=0.136.1` | HTTP API, health check, 기록 입력, STT API |
| Server | Uvicorn standard `>=0.46.0` | ASGI 개발 및 실행 서버 |
| Agent Graph | LangGraph `>=1.1,<2.0` | 상태 기반 pipeline graph orchestration |
| LLM Adapter | LangChain `>=1.0,<2.0`, LangChain OpenAI `>=1.0,<2.0` | Gemma(Ollama) + GPT 하이브리드, tool, middleware adapter |
| Storage | SQLite via `sqlite3` | 현재 repository 구현체의 로컬 저장소 |
| Speech | OpenAI Whisper, edge-tts | STT와 TTS provider |
| Test/Lint | `unittest`, Ruff | 백엔드 검증과 정적 분석 |
| Package | `pyproject.toml`, uv, setuptools | Python 의존성 및 패키지 실행 |

## Slide 6. AI와 사용 모델

**핵심 메시지:** 백엔드 LLM은 Gemma primary / GPT fallback, 또는 GPT primary / Gemma fallback(하이브리드) 두 가지 운용 방식을 지원하며, `LOCAL_LLM_ROLE` 하나로 전환합니다.

| 사용 영역 | 모델 또는 provider | 현재 상태 |
| --- | --- | --- |
| 프런트 서버 AI service | `gpt-4o-mini` 기본값, `PET_LOG_OPENAI_MODEL`로 변경 | Next.js Route Handler 내부 OpenAI Responses API 호출 |
| 백엔드 LLM (하이브리드) | Gemma(Ollama) + GPT — `LOCAL_LLM_ROLE`로 primary/fallback 전환 | `LOCAL_LLM_AUTOSTART`, `LOCAL_LLM_ROLE`, `LOCAL_LLM_RUNTIME`, `GEMMA_AUTO_PULL`, `GEMMA_PRELOAD`, `GEMMA_BASE_URL`, `GEMMA_MODEL`, `GEMMA_API_KEY` |
| 기록 구조화 primary | `OPENAI_RECORD_STRUCTURING_MODEL` 또는 Gemma | `OPENAI_RECORD_STRUCTURING_MODEL` |
| 기록 구조화 fallback | `OPENAI_RECORD_STRUCTURING_FALLBACK_MODEL` 또는 Gemma | `OPENAI_RECORD_STRUCTURING_FALLBACK_MODEL` |
| 기록 요약 primary | `OPENAI_RECORD_SUMMARY_MODEL` 또는 Gemma | `OPENAI_RECORD_SUMMARY_MODEL` |
| 케어 답변 primary | `OPENAI_CARE_ANSWER_MODEL` 또는 Gemma | `OPENAI_CARE_ANSWER_MODEL` |
| 펫 페르소나 primary | `OPENAI_PET_PERSONA_MODEL` 또는 Gemma | `OPENAI_PET_PERSONA_MODEL` |
| 이미지 기록 이해 primary | `OPENAI_IMAGE_RECORD_UNDERSTANDING_MODEL` 또는 Gemma | `OPENAI_IMAGE_RECORD_UNDERSTANDING_MODEL` |
| 음성 인식 STT | Whisper `medium` | `WHISPER_MODEL` |
| 음성 합성 TTS | edge-tts `ko-KR-SunHiNeural` | `EDGE_TTS_VOICE` |
| RAG embedding | `text-embedding-3-small` | `OPENAI_CARE_KNOWLEDGE_EMBEDDING_MODEL` 설계 기본값 |
| 개발 하네스 권장 모델 | GPT 5.4 | ECC Codex 모델 권장 기준 |

## Slide 7. LangChain과 LangGraph 적용

**핵심 메시지:** LangGraph는 agent pipeline orchestration에, LangChain은 model, tool, middleware adapter에 사용합니다.

- LangGraph
  - `LangGraphPetLogAgentPipeline`으로 Pet Log pipeline 구성
  - node update streaming과 pipeline contract 테스트 보유
  - 상태 기반 graph orchestration에 적합
- LangChain
  - `ChatOpenAI` 기반 OpenAI-compatible local Gemma primary와 GPT fallback provider 구현
  - `StructuredTool`, `BaseTool` 기반 agent tool registry 구성
  - retry, tracing, safety, validation middleware 구성
- 설계 원칙
  - `domain`과 `application`은 LangChain/LangGraph 타입에 직접 의존하지 않음
  - 실제 framework 의존성은 infrastructure와 agent runtime에 격리
  - `infrastructure.llm.model_factory`가 OpenAI-compatible local endpoint와 OpenAI Responses API 차이를 흡수
  - `infrastructure.llm.model_factory.LLMModel`과 `ModelFactory`가 provider 공통 model contract를 제공
  - 단순 chat provider는 `build_chat_openai_model`을 직접 주입하고, structured output provider만 기능별 `model.py` builder를 유지
  - 공통 GPT 기본 모델 상수는 `infrastructure.llm.constants`에서 관리
  - `LLM_EAGER_LOAD=1`이면 backend startup에서 configured provider를 모두 생성
  - `LOCAL_LLM_AUTOSTART=1`이면 백엔드 코드가 Ollama 서버를 자동 기동
  - `LOCAL_LLM_RUNTIME=ollama`이면 `ollama serve`와 기본 endpoint `http://127.0.0.1:11434/v1` 사용
  - `LOCAL_LLM_ROLE=primary` (기본값)이면 Gemma primary + GPT fallback, `fallback`이면 GPT primary + Gemma last fallback
  - `GEMMA_AUTO_PULL=1`이면 `ollama pull <GEMMA_MODEL>`로 모델을 준비
  - `GEMMA_PRELOAD=1`이면 `/v1/chat/completions` ping으로 로컬 모델을 메모리에 preload
  - `GEMMA_MODEL`은 Ollama tag 또는 HuggingFace ID이며, HuggingFace ID는 `infrastructure.llm.local_settings.OLLAMA_GEMMA_MODEL_ALIASES`로 정규화

## Slide 8. Middleware와 Tool 사용

**핵심 메시지:** LangChain middleware와 tool을 agent node별로 분리해 읽기 작업, 쓰기 작업, 안전 제어, 관측 가능성을 독립적으로 관리합니다.

### Middleware

| 분류 | 구현 | 역할 |
| --- | --- | --- |
| Debug logging | `build_agent_debug_middleware` | tool 실행 중 예외를 `ToolMessage`로 정규화하고 raw args 노출을 방지 |
| Model retry | `build_model_retry_middleware` | model 호출 실패 시 보수적인 retry 정책 적용 |
| Tool retry | `build_tool_retry_middleware` | 지정 tool 실패 시 제한된 retry 적용 |
| Human approval | `build_tool_approval_middleware` | `save_pet_record` 같은 쓰기 tool에 approve/reject interrupt 적용 가능 |
| Call limit | `build_tool_call_limit_middleware` | tool별 run/thread 호출 횟수 제한 |
| PII validation | `build_pii_validation_middleware` | 입력 PII를 기본 `redact` 전략으로 처리 |

### Tool

| 분류 | Tool 이름 | 구현 위치 | 역할 |
| --- | --- | --- | --- |
| Profile read | `get_pet_profile` | `tools.profile_tools` | pet profile 조회 |
| Record read | `list_recent_records` | `tools.record_tools` | 최근 기록 조회 |
| Record write | `save_pet_record` | `tools.record_tools` | 구조화된 기록 저장 |
| Schedule read | `list_due_reminders` | `tools.schedule_tools` | 예정된 reminder 조회 |
| Care context | care context tool | `tools.care_tools` | 케어 답변용 pet context 구성 |
| Speech | `SpeechTools` | `tools.speech_tools` | STT/TTS provider 기능 노출 |

### Node wiring

| Agent node | Tools | Middleware |
| --- | --- | --- |
| `structure_record` | 없음 | 없음 |
| `load_context` | `get_pet_profile`, `list_recent_records` | `agent_debug_log` |
| `save_records` | `save_pet_record` | `agent_debug_log` |

- `ToolRegistry`는 duplicate tool name을 거부해 agent action space 충돌을 방지
- 읽기 tool과 쓰기 tool을 분리해 context loading과 record persistence 책임을 분명히 함
- middleware factory는 LangChain 구현체를 감싸고, node wiring은 `agent_runtime.tool_registry`에 집중

## Slide 9. RAG 설계

**핵심 메시지:** 케어 질문 답변은 반려동물 컨텍스트와 승인된 케어 지식 검색 결과를 함께 사용하는 RAG 구조로 확장할 수 있게 설계했습니다.

```text
Approved care URL
  -> ingestion
  -> text extraction
  -> chunking
  -> embedding
  -> SQLite vector storage
  -> CareKnowledgeRetriever.search()
  -> CareAnswerProvider prompt
  -> sourced care answer
```

- 현재 구현: `CareKnowledgeRetriever` skeleton과 RAG 설계 문서
- 지식 출처: 관리자가 승인한 외부 케어 가이드 URL
- embedding 기본 모델: `text-embedding-3-small`
- 저장소: MVP는 SQLite, 향후 pgvector 또는 외부 vector DB로 교체 가능
- 안전 정책: 진단, 처방, 확정 표현 금지, 위험 증상은 병원 상담 안내 유지
- 확장 작업: URL fetching, SSRF 보호, chunking, embedding persistence, similarity search, citation prompt

## Slide 10. 주요 폴더 구조

**핵심 메시지:** 프런트는 화면과 클라이언트 도메인 로직을 분리하고, 백엔드는 계층형 agent backend 구조를 따릅니다.

```text
frontend/app/web/
├── src/app/          # App Router pages and route handlers
├── src/components/   # app shell, shared UI, map, AI panel
└── src/lib/          # frontend logic, API client, mock store, tests

backend/
├── src/domain/          # pure domain model
├── src/application/     # use case, agent interface, pipeline contract
├── src/infrastructure/  # DB, LLM, STT/TTS, policy, repository
├── src/agent_runtime/   # runtime, prompt, tool registry, memory
├── src/middleware/      # safety, retry, tracing, validation
├── src/tools/           # record, profile, schedule, care, speech tools
└── src/presentation/    # FastAPI HTTP and CLI boundary
```

## Slide 11. 실행과 검증

**핵심 메시지:** 프런트와 백엔드는 각각 독립 실행과 검증이 가능하며, 통합 시 Next.js가 FastAPI로 요청을 프록시합니다.

### 프런트엔드

```bash
cd frontend/app/web
npm install
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```

### 백엔드

macOS/Linux:

```bash
cd backend
./scripts/run-dev.sh
uv run python -B -m unittest discover -s tests -v
uv run python -B -c "import application, agent_runtime, middleware, tools, infrastructure, presentation, composition; print('target imports ok')"
rg -n "fastapi|openai|sqlalchemy|sqlite|postgres|psycopg" src/application src/domain
```

Windows:

```bat
cd backend
scripts\run-dev.bat
uv run python -B -m unittest discover -s tests -v
uv run python -B -c "import application, agent_runtime, middleware, tools, infrastructure, presentation, composition; print('target imports ok')"
rg -n "fastapi|openai|sqlalchemy|sqlite|postgres|psycopg" src/application src/domain
```

마지막 명령은 출력이 없는 상태가 기대값입니다.

## Slide 12. 환경변수

**핵심 메시지:** secret은 코드에 두지 않고 로컬 `.env` 또는 배포 환경변수로 분리합니다.

### 프런트엔드

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
PET_LOG_BACKEND_API_BASE_URL=http://127.0.0.1:27893
PET_LOG_BACKEND_PET_ID=pet_01JCM7V8H9Q2K4N6R8T0A1B2C3
PET_LOG_BACKEND_TIMEOUT_MS=60000
PET_LOG_AI_PROVIDER=mock
PET_LOG_OPENAI_MODEL=gpt-4o-mini
PET_LOG_OPENAI_RESPONSES_URL=https://api.openai.com/v1/responses
OPENAI_API_KEY=
```

### 백엔드

```env
OPENAI_API_KEY=
LLM_EAGER_LOAD=1
LOCAL_LLM_AUTOSTART=1
LOCAL_LLM_RUNTIME=ollama
LOCAL_LLM_ROLE=primary
GEMMA_AUTO_PULL=1
GEMMA_PRELOAD=1
GEMMA_BASE_URL=
GEMMA_MODEL=gemma4:e4b
GEMMA_API_KEY=local-gemma
OPENAI_RECORD_STRUCTURING_MODEL=gpt-5-mini
OPENAI_RECORD_STRUCTURING_FALLBACK_MODEL=gpt-5-nano
OPENAI_RECORD_SUMMARY_MODEL=gpt-5-mini
OPENAI_RECORD_SUMMARY_FALLBACK_MODEL=
OPENAI_CARE_ANSWER_MODEL=gpt-5-mini
OPENAI_CARE_ANSWER_FALLBACK_MODEL=
OPENAI_PET_PERSONA_MODEL=gpt-5-mini
OPENAI_PET_PERSONA_FALLBACK_MODEL=
OPENAI_IMAGE_RECORD_UNDERSTANDING_MODEL=gpt-5-mini
OPENAI_IMAGE_RECORD_UNDERSTANDING_FALLBACK_MODEL=
OPENAI_CARE_KNOWLEDGE_EMBEDDING_MODEL=text-embedding-3-small
WHISPER_MODEL=medium
EDGE_TTS_VOICE=ko-KR-SunHiNeural
```

`LOCAL_LLM_AUTOSTART=1`이면 backend startup에서 `LOCAL_LLM_RUNTIME=ollama` 기준 `ollama serve`를 자동 기동합니다. `LOCAL_LLM_ROLE=primary` (기본값)이면 Gemma가 primary이고 GPT는 fallback이며, `LOCAL_LLM_ROLE=fallback`이면 하이브리드 모드로 GPT가 primary이고 Gemma는 last fallback입니다. `LLM_EAGER_LOAD=1`이면 configured LLM provider도 모두 생성합니다. `GEMMA_AUTO_PULL=1`이면 모델 생성 전 `ollama pull <GEMMA_MODEL>`을 실행하고, `GEMMA_PRELOAD=1`이면 `/v1/chat/completions` ping으로 모델을 메모리에 올립니다. `GEMMA_MODEL`은 Ollama endpoint에서 노출하는 실제 모델 이름으로 맞추거나, HuggingFace ID로 입력하면 자동 정규화됩니다. `OPENAI_API_KEY`가 있으면 GPT 모델이 사용 가능합니다.

## Slide 13. 발표 요약

**핵심 메시지:** Pet Log는 모바일 우선 프런트, 계층형 AI backend, LangGraph agent orchestration, LangChain provider adapter, RAG 확장 설계를 결합한 AI 반려동물 관리 서비스입니다.

- 프런트: Next.js, React, TypeScript, Tailwind, Axios
- 백엔드: Python, FastAPI, LangChain, LangGraph, SQLite
- AI 모델: Gemma 4 E4B(Ollama) + GPT 하이브리드(`LOCAL_LLM_ROLE`로 전환), `gpt-4o-mini`, Whisper `medium`, `text-embedding-3-small`
- 개발 방식: 하네스 엔지니어링 기반 기획, UX, AI, 구현, QA gate
- 확장성: RAG, speech, image understanding, provider 교체 가능 구조
