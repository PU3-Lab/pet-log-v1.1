# Pet Log Backend

펫로그 backend는 기록 중심 앱이 아니라, 보호자의 자연어 입력을 구조화하고 누적 맥락을 분석해 행동 제안을 반환하는 AI agent backend를 목표로 한다.

## 먼저 읽을 문서

| 문서 | 용도 |
| --- | --- |
| `docs/superpowers/designs/pet-log-pipeline-interface-design.md` | 설계 문서 인덱스 |
| `docs/superpowers/designs/pet-log-pipeline/10-implementation-guide.md` | 처음 보는 개발자를 위한 구현 위치 안내 |
| `docs/superpowers/plans/2026-05-06-pet-log-agent-sprints.md` | 스프린트 계획 인덱스 |
| `docs/superpowers/plans/pet-log-agent-sprints/` | 스프린트별 작업 카드 |

## 구조 한 줄 요약

```text
presentation -> application pipelines -> application agents -> interfaces -> infrastructure/tools/agent_runtime
```

## 폴더 역할

```text
src/domain/
  순수 도메인 타입. DB, HTTP, LLM SDK import 금지.

src/application/
  제품 흐름과 interface 계약. 외부 구현체에 직접 의존하지 않음.

src/infrastructure/
  실제 구현체 위치. DB, LLM, STT/TTS, rule-based policy, composer 구현.

src/agent_runtime/
  LLM agent 실행 loop, prompt, tool registry, memory.

src/middleware/
  safety, logging, tracing, retry, validation 같은 공통 처리.

src/tools/
  LLM agent가 호출할 수 있는 record/profile/schedule/care/speech tool.

src/presentation/
  CLI, HTTP 같은 외부 진입점. 비즈니스 로직은 두지 않음.

src/composition.py
  concrete 구현체를 pipeline에 주입하는 조립 위치.
```

## 구현 원칙

- 작업은 스프린트 카드 단위로 진행한다.
- 각 카드 완료 전 실패 테스트를 먼저 작성한다.
- `application`과 `domain`에는 DB, FastAPI, OpenAI SDK를 import하지 않는다.
- 실제 동작 구현은 `infrastructure`, `agent_runtime`, `tools`, `presentation` 중 책임에 맞는 곳에 둔다.
- 한 스프린트 완료 후 검증 결과를 확인하고 다음 스프린트로 넘어간다.

## 현재 우선순위

1. `Sprint 1`: in-memory repository와 composition wiring
2. `Sprint 2`: mock record structurer와 core 기록 입력 흐름
3. `Sprint 3`: rule-based 위험 감지, 분석, 제안, 리마인더
4. `Sprint 4`: home feed, care question, pet chat, hospital summary
5. `Sprint 5`: CLI/API entrypoint
6. `Sprint 6`: 실제 DB/LLM/STT/TTS/agent runtime 연결

## 프론트 연동 API 상태

### 완전 구현 및 운영 중인 API

- `GET /api/v1/me`: 현재 로그인한 유저 정보를 반환한다. (현재는 `local-user` 고정)
- `GET /api/v1/pets`: 유저가 소유한 모든 반려동물 목록을 반환한다.
- `GET /api/v1/pet-log/records?pet_id=...`: 특정 반려동물의 최근 기록 목록을 반환한다.
- `GET /api/v1/pet-log/schedules?pet_id=...`: 특정 반려동물의 일정 목록을 반환한다.
- `POST /api/v1/pet-log/records`: 기록 입력 pipeline을 실행한다. (자연어 → 구조화 → 분석 → DB 저장)
- `POST /api/v1/files`: 이미지를 업로드하고 `file_id`를 반환한다. (프로필 사진 등)
- `GET /api/v1/files/{file_id}`: 업로드된 이미지 파일을 다운로드한다.
- `POST /api/v1/speech/transcriptions`: 음성 파일을 STT provider(Whisper)로 변환하고, `text` 원문과 AI가 정리한 `corrected_text`를 함께 반환한다.
- `POST /api/v1/speech/text-corrections`: 브라우저 STT처럼 이미 텍스트로 변환된 음성 입력 문장을 AI로 정리해 `corrected_text`를 반환한다.
- `POST /api/v1/hospitals/recommendations`: 위치 기반 동물병원 추천 (Google Places API)
- `GET /api/v1/community/boards`: 커뮤니티 게시판과 피드 필터 목록을 반환한다.
- `GET /api/v1/community/posts?feed=...&board=...`: 커뮤니티 글 목록을 반환한다.
- `GET /api/v1/community/posts/{post_id}`: 글 상세와 댓글 목록을 반환한다.
- `POST /api/v1/community/posts`: 커뮤니티 글을 작성한다.
- `POST /api/v1/community/posts/{post_id}/comments`: 댓글을 작성한다.
- `POST /api/v1/community/posts/{post_id}/reactions`: 글 공감 수를 반영한다.

### 알림 파이프라인 (완전 구현)

- `GET /api/v1/notifications?pet_id=...`: 실시간 알림 후보 생성 + DB 조회 (missing_record 타입만 upsert, dedupe_key 기반 중복 제거)
- `PATCH /api/v1/notifications/{id}/read`: 특정 알림을 읽음 처리 (DB에 반영)
- `PUT /api/v1/notifications/read?pet_id=...`: 요청 본문의 `readNotificationIds`로 특정 반려동물의 읽음 알림 목록을 저장한다.

**동작 방식**: 
1. 프론트에서 `GET /api/v1/notifications?pet_id=xxx` 호출
2. 백엔드 `NotificationPolicy.plan()`이 `ContextAnalysisAgent`로부터 분석 결과를 받음
3. 4가지 kind(missing_record, risk, behavior_change, schedule) 중 missing_record만 `NotificationRepository.upsert_from_candidate()`로 DB에 저장 (dedupe_key로 중복 제거)
4. 저장된 알림 + 실시간 생성 알림을 merge 후 프론트에 반환
5. 프론트 읽음 처리 시 `mark_as_read()` 또는 `set_read_ids()` 호출하여 DB 업데이트

샘플 데이터에는 `기록 누락 알림`, `주의 기록 확인`, `행동 변화 관찰` 알림이 포함되어 초기 알림 화면과 DB 조회 흐름을 바로 확인할 수 있다.

### 쇼핑 추천 (완전 구현)

- `GET /api/v1/shopping/recommendations?pet_id=...&text=...&lookback_days=30`: Naver Shopping + LLM 기반 추천
  - `ShoppingAgent`가 `ShoppingRecommendationProvider(NaverShoppingClient)`로부터 상품 검색
  - `ShoppingReasonProvider`(LLM 기반)로 추천 이유 생성
  - 프론트에 추천 리스트 반환

### 커뮤니티 게시판 (기본 구현)

- `CommunityRepository`가 SQLite의 `community_posts`, `community_comments`를 사용한다.
- 게시판은 `유기동물`, `용품 나눔`, `자유게시판`, `행동 고민`, `후기`를 기본 목록으로 둔다.
- 피드는 `인기글`, `최신글`, `내 주변` 문자열을 프론트 타입과 동일하게 유지한다.
- 초기 seed 데이터는 프론트 mock 커뮤니티와 같은 필드 구조(`authorName`, `createdAt`, `feeds`, `tags`)로 변환 가능하게 저장한다.
- 현재 반응 기능은 글 공감 수 증가만 제공한다. 사용자별 중복 반응 방지는 인증 경계가 생긴 뒤 별도 테이블로 확장한다.

### 미연동 기능

- `record summary`, `care answer`, `pet persona`, `photo understanding` provider는 아직 프론트 초기 로딩이나 기록 입력 route에 연결하지 않는다.

## 검증 명령

```bash
uv run python -B -m unittest discover -s tests -v
```

```bash
uv run python -B -c "import application, agent_runtime, middleware, tools, infrastructure, presentation, composition; print('target imports ok')"
```

```bash
rg -n "fastapi|openai|sqlalchemy|sqlite|postgres|psycopg" src/application src/domain
```

마지막 명령의 기대 결과는 출력 없음이다.

## FastAPI 실행

macOS/Linux:

```bash
./scripts/run-dev.sh
```

Windows:

```bat
scripts\run-dev.bat
```

기본 포트는 `27893`이다. 필요하면 `PET_LOG_BACKEND_PORT` 환경변수로 바꿀 수 있다.

기본 확인:

```bash
curl http://127.0.0.1:27893/health
```

## Azure 배포

백엔드는 Azure App Service (Linux, Python 런타임) 배포를 지원합니다.

Azure 패키지 생성:

```bash
bash scripts/azure-package.sh
```

Azure 배포 실행:

```bash
bash scripts/azure-deploy.sh <resource-group> <app-name> [subscription]
```

예시:

```bash
bash scripts/azure-deploy.sh pet-log-rg pet-log-backend-kp "Azure for Students"
```

배포 패키지는 `backend/.azure-deploy/pet-log-backend.zip`에 생성됩니다.

## 기록 입력 API:

```text
POST /api/v1/pet-log/records
```

요청 body는 pet profile 전체가 아니라 서버에 저장된 `pet_id`만 받는다.

```json
{
  "pet_id": "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
  "text": "오늘 아침 사료를 조금 남겼어",
  "source": "manual",
  "confirm": false
}
```

HTTP 계층은 request/response 변환과 pipeline 호출만 담당한다. FastAPI import는 `src/presentation/http/`와 `main.py`에만 둔다.
DB-backed repository와 pipeline은 `composition.build_app_context()`에서 만들고, FastAPI `lifespan`에서 열고 닫는다.

**구현 상태**: 완전 구현. 자연어 텍스트 → `RecordStructurer`(LLM 기반 구조화) → `ContextAnalysisAgent`(분석) → DB 저장까지 모두 연동. `source=ai_preview, mode=preview`인 경우 미리보기 응답, `mode=saved`인 경우 실제 저장 응답.

기록 입력 결과 확인 로그:

```text
record.result | pet_id=... | source=... | mode=preview | confirm=no | candidates=... | saved=... | needs_confirmation=yes | first="meal: 식사" | saved_id=-
```

이 로그는 `presentation.http.pet_log_routes` logger에서 `INFO` 레벨로 남긴다. 미리보기 호출은 `source=ai_preview`, `mode=preview`, `saved=0`, `saved_id=-`이어야 하고, 실제 저장 호출은 저장 성공 시 `mode=saved`, `saved`가 1 이상이어야 한다.

음성 STT API:

```text
POST /api/v1/speech/transcriptions
```

요청은 `multipart/form-data`의 `audio` 파일 필드로 받는다. 서버는 `composition.build_app_context()`에서 연결된 `SpeechToTextProvider`를 통해 Whisper `medium`으로 변환한다.

```bash
curl -F "audio=@recording.webm;type=audio/webm" http://127.0.0.1:27893/api/v1/speech/transcriptions
```

동물병원 추천 API:

```text
POST /api/v1/hospitals/recommendations
```

Google Places API(New) Text Search를 사용한다. 공식 endpoint는
`POST https://places.googleapis.com/v1/places:searchText`이며, `veterinary_care`
type과 `동물병원` query, `X-Goog-FieldMask`로 이름, 주소, 연락처,
Google Maps URL, 현재 영업 여부, 주간 영업 시간만 요청한다. Google 후보는 `locationBias`로 받고 서버에서 요청 반경 밖 결과를 제외한다. 응답은 24시간 영업 병원을 우선 정렬하고, 기본값으로 현재
영업 중인 병원만 내려준다.

**구현 상태**: 완전 구현. `HospitalRecommendationAgent` + `GooglePlacesClient` + `HospitalFallbackMiddleware` 조합으로 Google API 호출 및 fallback 처리 완료.

```json
{
  "latitude": 37.5665,
  "longitude": 126.978,
  "accuracy_meters": 25,
  "location_source": "gps",
  "radius_meters": 3000,
  "max_results": 5,
  "open_now_only": true,
  "emergency": false,
  "text": ""
}
```

백엔드는 기기 GPS를 직접 읽지 않는다. 브라우저나 앱에서 GPS 권한을 받아 현재 좌표를 `latitude`, `longitude`로 보내야 한다. 응답의 `search_center`에는 실제 추천 기준으로 사용한 좌표, 반경, 위치 출처, GPS 정확도, 응급 모드 여부가 포함된다. 브라우저 예시는 다음과 같다.

```js
navigator.geolocation.getCurrentPosition(async ({ coords }) => {
  await fetch("/api/v1/hospitals/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy_meters: coords.accuracy,
      location_source: "gps",
      emergency: true,
      text: "늦은 시간 응급 조치가 필요해요."
    })
  });
});
```

`emergency=true`이거나 `text`에 응급, 야간, 24시, 24시간, 호흡, 출혈, 경련, 중독 같은 표현이 있거나 현재 시간이 22:00~05:59이면 `24시 동물병원` query로 검색한다. 응급/야간 모드는 24시간 영업으로 확인된 병원을 찾기 위해 검색 반경을 최소 10km로 넓힌다. Google Places 결과가 없거나 호출에 실패하면 fallback middleware가 Google Maps 검색 링크를 내려준다.

환경변수:

```env
GOOGLE_MAPS_API_KEY=...
GOOGLE_PLACES_TIMEOUT=3
```

## Ollama 로컬 Gemma와 GPT 하이브리드 모드

백엔드 LLM provider는 공통 factory를 통해 OpenAI-compatible chat model interface를 사용한다. Ollama가 유일한 로컬 LLM 런타임이며, `LOCAL_LLM_ROLE` 환경 변수로 primary/fallback 모드를 전환할 수 있다.

LLM provider 타입 경계는 `infrastructure.llm.model_factory.LLMModel`과 `ModelFactory`가 공통으로 담당한다. `care_answer`와 `pet_persona`처럼 일반 chat 응답만 필요한 provider는 `build_chat_openai_model`을 직접 사용하고, `record_structuring`, `record_summary`, `image_record_understanding`처럼 JSON schema structured output이 필요한 provider만 각 기능의 `model.py`에 builder를 둔다. 공통 기본 모델 상수는 `infrastructure.llm.constants`에 둔다.

### 설정 파일 준비

로컬 예시는 다음 파일에서 시작한다. `GEMMA_MODEL`은 Ollama가 노출하는 실제 모델 이름으로 맞춘다.

```bash
cp .env.example .env
```

### Gemma Primary 모드 (기본값)

로컬 Gemma가 primary, GPT는 fallback이다. 이 모드에서 `LOCAL_LLM_ROLE`은 설정하지 않거나 `primary`로 명시한다.

```env
LOCAL_LLM_AUTOSTART=1
LOCAL_LLM_ROLE=primary
GEMMA_AUTO_PULL=1
GEMMA_PRELOAD=1
GEMMA_BASE_URL=
GEMMA_MODEL=gemma4:e4b
GEMMA_API_KEY=local-gemma
GEMMA_MAX_RETRIES=0
OPENAI_API_KEY=sk-...
```

이 설정에서는 백엔드 startup 시 `ollama serve`를 함께 실행한다. `GEMMA_AUTO_PULL=1`이면 모델 생성 전에 `ollama pull gemma4:e4b`도 실행하고, `GEMMA_PRELOAD=1`이면 `/v1/chat/completions` ping으로 로컬 모델을 메모리에 올린다. Ollama 기본 endpoint는 `http://127.0.0.1:11434/v1`이다. `GEMMA_AUTO_PULL=1`은 모델 다운로드가 발생할 수 있으므로 자동 다운로드를 원하지 않으면 비워 둔다.

### Hybrid 모드: GPT Primary + Gemma Fallback

GPT가 primary, 로컬 Gemma는 last fallback이다. `LOCAL_LLM_ROLE=fallback`으로 설정한다.

```env
LOCAL_LLM_AUTOSTART=1
LOCAL_LLM_ROLE=fallback
GEMMA_AUTO_PULL=1
GEMMA_PRELOAD=1
GEMMA_BASE_URL=
GEMMA_MODEL=gemma4:e4b
GEMMA_API_KEY=local-gemma
OPENAI_API_KEY=sk-...
OPENAI_RECORD_STRUCTURING_MODEL=gpt-4-turbo
OPENAI_RECORD_SUMMARY_MODEL=gpt-4-turbo
OPENAI_CARE_ANSWER_MODEL=gpt-4-turbo
```

이 모드에서는 각 task별 agent가 `OPENAI_*_MODEL` 환경 변수를 primary로 사용한다. task별로 지정된 fallback 모델(`OPENAI_*_FALLBACK_MODEL`)이 있으면 그것을 시도한 후, 마지막으로 로컬 Gemma로 fallback한다.

### 외부 Ollama 서버 사용

이미 별도로 Ollama 서버를 운영 중이면 `LOCAL_LLM_AUTOSTART`를 비우고 `GEMMA_BASE_URL`을 직접 지정한다.

```env
GEMMA_BASE_URL=http://127.0.0.1:1234/v1
GEMMA_MODEL=gemma4:e4b
GEMMA_API_KEY=local-gemma
```

### Ollama 모델명과 정규화

Ollama 모델명은 `gemma3n:e4b`, `gemma4:e4b` 같은 Ollama tag를 사용한다. 기존 Hugging Face ID인 `google/gemma-3n-E4B-it`, `google/gemma-4-E4B-it`가 들어오면 자동으로 `gemma3n:e4b`, `gemma4:e4b`로 정규화한다. 정규화 매핑은 `infrastructure.llm.local_settings.OLLAMA_GEMMA_MODEL_ALIASES`에 정의되어 있다.

모델을 미리 준비하려면:

```bash
ollama pull gemma4:e4b
```

### GPT Only 모드

로컬 LLM을 사용하지 않으려면 `LOCAL_LLM_AUTOSTART`와 `GEMMA_BASE_URL`을 모두 비운다.

```env
OPENAI_API_KEY=sk-...
OPENAI_RECORD_STRUCTURING_MODEL=gpt-4-turbo
OPENAI_RECORD_SUMMARY_MODEL=gpt-4-turbo
OPENAI_CARE_ANSWER_MODEL=gpt-4-turbo
```

### 주요 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `LOCAL_LLM_AUTOSTART` | (empty) | `1` 설정 시 Ollama 자동 기동 |
| `LOCAL_LLM_ROLE` | `primary` | `primary`: Gemma primary, `fallback`: GPT primary + Gemma fallback |
| `GEMMA_AUTO_PULL` | (empty) | `1` 설정 시 모델 자동 다운로드 |
| `GEMMA_PRELOAD` | (empty) | `1` 설정 시 startup 시 모델 메모리 로드 |
| `GEMMA_BASE_URL` | (empty) | Ollama endpoint (설정 시 자동 기동 무시) |
| `GEMMA_MODEL` | `gemma4:e4b` | Ollama 모델명 또는 HuggingFace ID |
| `GEMMA_API_KEY` | `local-gemma` | Ollama API key |
| `GEMMA_MAX_RETRIES` | `0` | 로컬 Gemma OpenAI-compatible 호출의 SDK 내부 재시도 횟수 |
| `OPENAI_API_KEY` | (empty) | GPT fallback 사용 시 필수 |
| `OPENAI_*_MODEL` | (empty) | Task별 GPT primary 모델 |
| `OPENAI_*_FALLBACK_MODEL` | (empty) | Task별 추가 fallback 모델 |
| `OPENAI_SHOPPING_REASON_MODEL` | (empty) | 쇼핑 추천 이유 생성용 GPT 모델 |
| `OPENAI_SHOPPING_REASON_FALLBACK_MODEL` | (empty) | 쇼핑 추천 이유 생성용 fallback 모델 |
| `NAVER_SHOPPING_CLIENT_ID` | (empty) | Naver Shopping API client ID |
| `NAVER_SHOPPING_CLIENT_SECRET` | (empty) | Naver Shopping API client secret |
| `NAVER_SHOPPING_DISPLAY` | `3` | 한 번에 반환할 상품 수 |
| `NAVER_SHOPPING_SORT` | `sim` | 정렬 기준 (sim: 정확도, date: 최신순, price: 가격순) |
| `NAVER_SHOPPING_EXCLUDE` | `used:rental:cbshop` | 제외할 상품 타입 |
| `NAVER_SHOPPING_TIMEOUT` | `3` | Naver Shopping API timeout |
| `GOOGLE_MAPS_API_KEY` | (empty) | 동물병원 추천용 Google Places API key |
| `GOOGLE_PLACES_TIMEOUT` | `3` | Google Places API timeout |

`.env`는 local secret 파일이므로 git에 커밋하지 않는다. 운영 환경에서는 `.env` 파일 대신 배포 환경변수 또는 secret manager에 같은 키를 등록한다.

## 실제 LLM smoke test

실제 LLM을 호출하는 수동 확인 스크립트다. 로컬에서는 `backend/.env`를 `python-dotenv`로 읽고, 이미 설정된 shell 또는 배포 환경변수는 덮어쓰지 않는다.

자연어 기록 구조화 확인:

```bash
uv run python -B scripts/smoke_record_structurer.py
```

자연어 기록 구조화 후 DB 저장 확인:

```bash
uv run python -B scripts/smoke_record_input_to_db.py
```

Repository 변경사항 수동 확인:

```bash
uv run python -B scripts/smoke_repository_changes.py
```

커뮤니티 게시판 API 확인:

```bash
uv run python -B scripts/smoke_community.py
```

동물병원 추천 수동 확인:

```bash
uv run python -B scripts/smoke_google_hospital_recommendations.py
```

현재 GPS 좌표로 확인하려면 좌표를 인자로 넘긴다.

```bash
uv run python -B scripts/smoke_google_hospital_recommendations.py --latitude 37.1234 --longitude 127.1234
```

`GOOGLE_MAPS_API_KEY`가 없으면 실제 Google 호출은 건너뛰고 fake provider 흐름만 확인한다.

기록 요약 provider 확인:

```bash
uv run python -B scripts/smoke_record_summary_provider.py
```

요약 provider smoke script는 script 내부 smoke fixture helper로 in-memory SQLite seed, repository 조회, provider 조립을 만든 뒤 모델 입력으로 사용한다.

이 명령들은 네트워크와 API 비용이 발생할 수 있으므로 자동 테스트에는 포함하지 않는다.
