# Backend Distributed Architecture Design (pet-log v1.1)

**Date:** 2026-05-17
**Status:** Revised (4-service → 2-service)

---

## Context

pet-log v1.1 백엔드를 Flutter 모바일 앱(Sprint 1~7)과 병렬로 구현한다. v1.0은 단일 FastAPI 서버였으나, 두 가지 핵심 요구사항으로 인해 분산 아키텍처로 전환한다.

1. **AI 격리**: Whisper STT, LangGraph, Edge-TTS는 CPU/메모리 집약적이며, 메인 API 응답 지연에 영향을 주지 않아야 한다.
2. **MVP 단순성**: Auth/Core/Community를 별도 서비스로 분리하면 운영 복잡도가 과도하게 증가한다. 동일 Main API 내 모듈로 구성하고 필요 시 추출한다.

**아키텍처 결정**: 초기 4-service 설계(Auth :8001, Core :8002, Community :8003, AI Worker :8004)에서 **2-service**(Main API + AI Worker)로 간소화.

---

## Architecture

```
Flutter App
     │
     ▼
┌─────────────────────────────────┐
│   Azure API Management          │  JWT 검증, 라우팅, Rate Limit
│   X-User-Id / X-User-Role 주입  │  클라이언트 위조 헤더 강제 제거
└──────────────┬──────────────────┘
               │ (VNet 내부 Private Endpoint)
               ▼
┌──────────────────────────────────────┐
│            Main API (:8001)          │
│                                      │
│  ┌────────┐ ┌──────┐ ┌───────────┐  │
│  │  auth  │ │ pets │ │ community │  │
│  └────────┘ └──────┘ └───────────┘  │
│  ┌─────────┐ ┌──────────────────┐   │
│  │ records │ │   ai_tasks       │   │
│  └─────────┘ └──────────────────┘   │
└───────────────────┬──────────────────┘
                    │ Azure Queue Storage (비동기)
                    ▼
          ┌──────────────────┐
          │   AI Worker      │  (:8002)
          │   LangGraph      │
          │   Whisper STT    │
          │   Edge-TTS       │
          └────────┬─────────┘
                   │ POST /internal/tasks/{task_id}/status  (processing)
                   │ POST /internal/ai-results/{task_id}    (completed/failed)
                   ▼
          Main API (상태 업데이트 + 결과 저장)

Main API → Azure Cosmos DB (NoSQL) via Repository 인터페이스
AI Worker → Cosmos DB 직접 접근 없음. Queue payload와 Main API 내부 콜백만 사용
```

---

## Services

### Main API (`:8001`)

**담당**: 인증, 펫, 기록, 일정, 알림, 쇼핑, 병원, 커뮤니티, AI 작업 관리

#### Auth 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /auth/register` | 신규 계정 생성 (비밀번호: argon2id 해싱) |
| `POST /auth/login` | 이메일/비밀번호 → JWT access + refresh |
| `POST /auth/refresh` | refresh token → 새 access token (rotation) |
| `POST /auth/logout` | refresh token 즉시 무효화 |
| `GET /auth/me` | 내 프로필 조회 |
| `PATCH /auth/me` | 프로필 수정 |

#### Core 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `GET/POST /api/pets` | 펫 목록 / 생성 |
| `GET/PUT/DELETE /api/pets/{id}` | 펫 상세 / 수정 / 삭제 |
| `POST /api/records` | 기록 생성 → `{task_id}` 즉시 반환 (비동기) |
| `GET /api/tasks/{task_id}` | AI 처리 상태 폴링 (JWT X-User-Id로 본인 확인) |
| `GET /api/records` | 기록 목록 |
| `GET/POST /api/schedules` | 일정 조회 / 생성 |
| `GET /api/analysis/reports` | 주간/월간 분석 리포트 |
| `GET /api/suggestions` | AI 제안 조회 |
| `GET /api/notifications` | 알림 목록 |
| `GET /api/hospitals/near` | 근처 동물병원 |
| `GET /api/shopping/recommendations` | 쇼핑 추천 |

#### Community 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /community/boards` | 게시판 목록 |
| `GET/POST /community/posts` | 게시글 목록 / 작성 |
| `GET/PUT/DELETE /community/posts/{id}` | 게시글 상세 / 수정 / 삭제 |
| `GET/POST /community/posts/{id}/comments` | 댓글 조회 / 작성 |
| `POST /community/posts/{id}/reactions` | 좋아요/반응 |

#### 내부 엔드포인트 (AI Worker 전용, Gateway 비노출)

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /internal/tasks/{task_id}/status` | AI Worker가 processing 상태 업데이트 시 호출 |
| `POST /internal/ai-results/{task_id}` | AI Worker 결과 콜백 수신 (completed/failed) |
| `GET /health` | 헬스체크 |

**Cosmos DB 컨테이너**: `users`, `pets`, `records`, `schedules`, `notifications`, `tasks`, `posts`, `comments`, `reactions`, `boards`

**JWT 전략**:
- HS256 shared secret (환경변수 `JWT_SECRET`)
- access token: 1시간, refresh token: 30일 (DB 저장, rotation 적용)
- Gateway가 JWT 검증 후 `X-User-Id`, `X-User-Role` 헤더 주입
- **APIM 헤더 보안**: APIM은 클라이언트 요청에 포함된 `X-User-Id`/`X-User-Role` 헤더를 강제 제거한 뒤 자체 검증된 값으로 재주입. 클라이언트 위조 방지 필수 정책.
- Main API 내부 모듈은 `X-User-Id`/`X-User-Role` 헤더만 신뢰 (JWT 재검증 없음)
- **Gateway 우회 방지**: Main API는 Azure VNet 내부 트래픽만 허용 (직접 인터넷 노출 없음). 로컬 개발 시 `docker network`로 격리 (아래 Local Development 참고)
- **Access token revocation**: MVP에서는 1시간 만료 TTL로 대체 (별도 revocation 없음). 즉각 무효화가 필요할 경우 Redis 기반 토큰 블랙리스트 추가 검토

**Refresh Token 전략**:
- refresh token은 signed JWT로 발급하며 payload에 `sub`(user_id), `email`, `family_id`, `jti`, `exp`를 포함한다.
- DB에는 원문 token을 저장하지 않고 `jti_hash`만 저장한다.
- refresh token은 `users` 컨테이너에 `refresh_sessions` 배열로 저장한다.
- 세션 필드: `{family_id, device_id, current_jti_hash, previous_jti_hash, rotated_at, expires_at, revoked_at}`
- `POST /auth/refresh`는 refresh JWT 서명과 exp를 먼저 검증한 뒤, token의 `email`로 users 파티션을 읽고 `family_id` + `jti_hash`를 확인한다.
- 사용 시 rotation: `previous_jti_hash=current_jti_hash` 저장 → `current_jti_hash` 교체 (device_id 유지)
- `previous_jti_hash`는 네트워크 재시도 허용을 위해 최대 30초 grace window만 인정한다.
- `POST /auth/logout`: 해당 `family_id` 또는 `device_id`의 session을 `revoked_at` 처리한다.
- replay 감지: 같은 `family_id`에서 grace window가 지난 `previous_jti_hash` 또는 `current_jti_hash`/`previous_jti_hash` 어디에도 매칭되지 않는 jti가 재사용되면 해당 사용자의 모든 refresh session을 `revoked_at` 처리한다.
- 단순 미등록 `family_id` 또는 다른 사용자의 token은 replay로 단정하지 않고 `401 Unauthorized`만 반환한다.

**내부 콜백 인증**:
- AI Worker → Main API 콜백 시 `X-Internal-Secret` 헤더 검증
- 환경변수 `INTERNAL_SECRET` (Gateway 비노출 경로, Azure VNet 내부 전용)
- 검증 실패 시 응답: `401 Unauthorized` (메커니즘 비노출, 세부 사유 미포함)
- **Secret 갱신 절차**: 환경변수 교체 후 두 서비스 순차 재시작. rolling update 시 `INTERNAL_SECRET_OLD` 환경변수로 구버전 동시 허용 (최대 30초) → 완료 후 삭제
- MVP 이후: Azure Managed Identity 또는 HMAC+timestamp 방식으로 전환

---

### AI Worker (`:8002`)

**담당**: LangGraph 파이프라인, Whisper STT, Edge-TTS, 인사이트 생성, 커뮤니티 AI 처리

| 처리 유형 | 설명 |
|---------|------|
| Azure Queue 소비 | Main API가 발행한 AI 처리 메시지 |
| `POST /api/v1/speech/transcriptions` | Whisper STT (직접 호출, Gateway 경유). v1.0 경로 유지 |
| `GET /health` | 헬스체크 |

**DB 직접 접근 없음**: AI Worker는 Cosmos DB에 직접 접근하지 않음. 상태 업데이트 및 결과 전달은 Main API 내부 엔드포인트를 통해 처리:
- 메시지 소비 직후: `POST /internal/tasks/{task_id}/status` (`{status: "processing", user_id: "..."}`)
- 처리 완료/실패 후: `POST /internal/ai-results/{task_id}` (결과 payload 포함)

**v1.0 이전 모듈**:
- `agent_runtime/` — LangGraph 그래프 정의 (변경 없음)
- `tools/` — LangGraph 툴 (변경 없음)
- `infrastructure/llm/` — OpenAI 클라이언트 (변경 없음)
- `infrastructure/speech/` — Whisper + Edge-TTS (변경 없음)

---

## Async AI Flow

### Task 상태 머신

```
pending → processing → completed
                    ↘ failed → (재시도: max 3회)
                                ↘ expired (DLQ 이동)
```

| 상태 | 전환 주체 | 설명 |
|------|----------|------|
| `pending` | Main API | Queue 발행 완료, AI Worker 미소비 |
| `processing` | AI Worker → `/internal/tasks/{task_id}/status` | AI Worker가 메시지 소비 직후 상태 업데이트 |
| `completed` | AI Worker → `/internal/ai-results/{task_id}` | 분석 완료, 결과 저장됨 |
| `failed` | AI Worker → `/internal/ai-results/{task_id}` | 처리 실패, 재시도 대기 |
| `expired` | DLQ Consumer | 최대 재시도 초과 → DLQ 이동 → expired 업데이트 |

### 플로우

```
Client POST /api/records
    → 클라이언트는 `Idempotency-Key` 헤더를 전송한다.
      같은 user_id + Idempotency-Key 요청은 같은 record/task 결과를 반환한다.
    → Main API: Cosmos에 record + task(status=pending) 저장
      ※ 원자성 한계: record(/pet_id)와 task(/user_id)는 다른 컨테이너
        → Cosmos 단일 파티션 트랜잭션으로 완전한 원자성 보장 불가
        → MVP 전략: idempotency_key 기반 2-phase write (record 저장 → task 저장 → Queue 발행)
          Queue 발행 실패 시 task.status=failed 업데이트 후 오류 반환
          클라이언트 재시도 시 기존 idempotency_key를 조회해 중복 record 생성을 방지
          완전한 원자성이 필요할 경우 Outbox 패턴 도입:
          (tasks 컨테이너에 outbox 문서 저장 → Azure Function 폴러가 Queue 발행 → outbox 삭제)
    → 즉시 반환: { task_id: "uuid", status: "pending" }

Client GET /api/tasks/{task_id} (폴링, JWT X-User-Id 헤더로 본인 확인, query param 불필요)
    → pending: { status: "pending" }
    → processing: { status: "processing" }
    → completed: { status: "completed", result: { insights: [...] } }
    → failed/expired: { status: "failed", error: "처리 중 오류" }

AI Worker: Queue 메시지 소비
    → POST /internal/tasks/{task_id}/status (status=processing, user_id=...)
    → task_type으로 분기 처리
    → LangGraph 파이프라인 실행 (5분 초과 예상 시 visibility timeout 연장, 최대 30분)
    → POST /internal/ai-results/{task_id} + user_id + X-Internal-Secret
    → 콜백 실패 시: 메시지 visibility timeout 만료 → 재시도 (max 3)
    → 3회 초과: Azure DLQ로 이동

DLQ Consumer (Azure Function 또는 AI Worker 별도 루프)
    → DLQ 메시지 소비
    → POST /internal/tasks/{task_id}/status (status=expired, user_id=...)
    → Azure Monitor Alert → 개발자 이메일
```

**콜백 idempotency** (`/internal/ai-results/{task_id}`):
1. task 문서 읽기 → Cosmos `_etag` 추출
2. 콜백 payload의 `user_id`가 task.user_id와 다르면 `403 Forbidden` 반환
3. status가 이미 `completed`이면 즉시 `200 OK` 반환 (중복 처리 스킵)
4. `status=completed` + 결과 조건부 업데이트: `If-Match: _etag` 헤더 사용
5. Cosmos ETag 불일치(409) → 재조회 후 status 확인 → 이미 completed이면 스킵

**Queue 설정**:
- visibility timeout: 5분 (LangGraph 처리 기본 예상 시간)
- **Visibility 연장 (Heartbeat)**: AI Worker는 처리 중 주기적으로 `update_message_visibility(message, visibility_timeout=300)` 호출해 lease 갱신. 최대 30분(6회 연장)으로 제한.
- max dequeue count: 3회 → 초과 시 DLQ 이동
- DLQ 알림: Azure Monitor Alert → 개발자 이메일

**Queue 메시지 구조**:
```json
{
  "schema_version": "1",
  "task_id": "uuid",
  "idempotency_key": "client supplied Idempotency-Key",
  "task_type": "pet_analysis | content_moderation | feed_ranking",
  "created_at": "2026-05-17T10:00:00Z",
  "user_id": "...",
  "payload": {
    "pet_data": { "id": "...", "name": "...", "species": "...", "age": 3 },
    "recent_records": [{ "type": "meal", "content": "...", "created_at": "..." }]
  }
}
```

**Queue 메시지 크기 제한**: Azure Queue Storage 메시지 최대 64KB.
payload가 한도 초과 예상 시 (예: 다수의 recent_records, 음성 파일 메타):
1. payload 본문은 Azure Blob Storage에 JSON으로 저장
2. Queue 메시지에는 공개 URL 대신 `blob_key` 참조만 포함 (`"payload": { "blob_key": "ai-payloads/{task_id}.json" }`)
3. AI Worker는 Storage 권한으로 blob_key에서 payload 로드
   - 로컬: Azurite connection string
   - 프로덕션: Azure Managed Identity 또는 Storage SAS 발급 정책

---

## Data Access: Repository Pattern

Main API에서 Cosmos DB SDK는 Repository 구현체에서만 사용한다. 서비스 코드는 Protocol 인터페이스만 의존한다. AI Worker는 Cosmos SDK 의존성을 갖지 않는다.

```python
# domain/repositories.py (인터페이스)
from typing import Protocol

class PetRepository(Protocol):
    async def get(self, pet_id: str, user_id: str) -> Pet: ...
    async def list(self, user_id: str) -> list[Pet]: ...
    async def save(self, pet: Pet) -> Pet: ...
    async def delete(self, pet_id: str, user_id: str) -> None: ...

# infrastructure/cosmos_pet_repository.py (구현체)
from azure.cosmos.aio import ContainerProxy

class CosmosPetRepository:
    def __init__(self, container: ContainerProxy) -> None:
        self._container = container

    async def get(self, pet_id: str, user_id: str) -> Pet:
        item = await self._container.read_item(
            item=pet_id, partition_key=user_id
        )
        return Pet(**item)

    async def save(self, pet: Pet) -> Pet:
        item = await self._container.upsert_item(pet.model_dump())
        return Pet(**item)
```

**Cosmos DB 파티션 키 전략**:

| 컨테이너 | 파티션 키 | 이유 |
|---------|---------|------|
| `users` | `/email` | 이메일 기반 로그인 쿼리 최적화 (파티션 키로 단일 파티션 조회). 로그인 후 user_id는 문서 `id` 필드 사용 |
| `pets` | `/user_id` | 사용자당 조회 빈번 |
| `records` | `/pet_id` | 펫별 기록 조회 최적화; 사용자 전체 기록 조회 시 cross-partition 쿼리 발생 (MVP 허용, 페이지네이션 필수) |
| `tasks` | `/user_id` | 사용자별 폴링 + 콜백 시 user_id 포함 필수 |
| `schedules` | `/user_id` | 사용자별 일정 조회 |
| `notifications` | `/user_id` | 사용자별 알림 조회 |
| `posts` | `/board_id` | 게시판별 조회 (MVP 허용, 핫스팟 시 re-partition 검토) |
| `comments` | `/post_id` | 게시글별 조회 |
| `reactions` | `/post_id` | 게시글별 반응 집계 |
| `boards` | `/id` | 게시판 수 소수 → 단일 파티션 허용 |

**tasks 콜백 조회**: `GET /api/tasks/{task_id}`는 `SELECT * FROM c WHERE c.id = @task_id AND c.user_id = @uid` (user_id 파티션 키 필터 필수). 내부 콜백 페이로드에 반드시 `user_id` 포함.

**users 파티션 tradeoff**: `/email` 파티션은 로그인 조회를 단순화하지만 `user_id` 기반 `GET /auth/me`, refresh token rotation은 cross-partition 조회가 될 수 있다. MVP에서는 사용자 수가 작고 로그인 경로가 우선이므로 허용한다. 사용자 규모가 커지면 `/id` 파티션 + email lookup 컨테이너로 분리한다.

---

## Community User Snapshot

Auth Service 실시간 호출 없이 사용자 정보 비정규화:

```python
# Post 문서 구조
{
  "id": "post-uuid",
  "board_id": "...",
  "content": "...",
  "user_snapshot": {
    "user_id": "...",
    "nickname": "집사123",
    "avatar_url": "https://..."
  },
  "created_at": "..."
}
```

닉네임/아바타 변경 시 스냅샷은 과거 기록 유지 (의도된 동작).

---

## Local Development Stack

```yaml
# backend/app/docker-compose.yml 구성
services:
  cosmos-emulator:    # Azure Cosmos DB Emulator
    image: mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator
    ports: ["8081:8081", "10251-10255:10251-10255"]

  azurite:            # Azure Storage Emulator (Queue)
    image: mcr.microsoft.com/azure-storage/azurite
    ports: ["10001:10001", "10002:10002", "10000:10000"]

  main_api:           # Main API
    build: ./services/main_api
    ports: ["8001:8001"]

  ai_worker:          # AI Worker
    build: ./services/ai_worker
    ports: ["8002:8002"]
```

**로컬 vs 프로덕션 격리 차이**:
- **로컬**: docker-compose에서 Main API 포트(8001)는 호스트에 직접 노출 (개발 편의). APIM 없이 직접 호출; JWT 검증은 Main API 자체적으로 수행 (헤더 주입 없이 JWT 직접 파싱).
- **프로덕션**: Main API는 Azure VNet 내부에만 노출 (APIM → Private Endpoint로만 접근). 직접 인터넷 노출 없음.

**환경 변수** (`.env.example`):
```
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=<emulator-key>
COSMOS_DATABASE=petlog
AZURE_STORAGE_CONNECTION_STRING=<azurite-connection-string>
JWT_SECRET=dev-secret-change-in-prod
INTERNAL_SECRET=dev-internal-secret-change-in-prod
OPENAI_API_KEY=<key>
```

---

## Project Structure

v1.1 신규 백엔드는 저장소 루트의 `backend/app/` 아래에 만든다.
기존 `subtree/backend/`는 v1.0 참조 코드로만 사용하고, Sprint 구현 중 직접 수정하지 않는다.

```
backend/app/
├── services/
│   ├── main_api/
│   │   ├── pyproject.toml
│   │   ├── Dockerfile
│   │   ├── main.py
│   │   └── src/
│   │       ├── auth/
│   │       │   ├── domain/
│   │       │   ├── application/
│   │       │   ├── infrastructure/
│   │       │   └── presentation/
│   │       ├── pets/
│   │       │   └── (동일 구조)
│   │       ├── records/
│   │       ├── community/
│   │       ├── ai_tasks/
│   │       └── shared/          # 공통 미들웨어, 예외, DB 클라이언트
│   └── ai_worker/
│       ├── pyproject.toml
│       ├── Dockerfile
│       ├── main.py
│       └── src/
│           ├── queue_consumer/
│           ├── dlq_consumer/    # DLQ → task expired 처리
│           ├── agent_runtime/   # v1.0에서 이전
│           ├── tools/           # v1.0에서 이전
│           └── infrastructure/
│               ├── llm/
│               └── speech/
└── docker-compose.yml
```

---

## v1.0 Code Distribution

| v1.0 모듈 | v1.1 서비스 |
|-----------|-----------|
| `domain/models.py` → User | Main API / auth |
| `domain/models.py` → Pet, Record, Schedule | Main API / pets, records |
| `infrastructure/repositories/user*` | Main API / auth / infrastructure (Cosmos로 교체) |
| `infrastructure/repositories/pet*`, `record*` | Main API / pets, records / infrastructure (Cosmos로 교체) |
| `infrastructure/repositories/community*` | Main API / community / infrastructure (Cosmos로 교체) |
| `agent_runtime/` | AI Worker (변경 없음) |
| `tools/` | AI Worker (변경 없음) |
| `infrastructure/llm/` | AI Worker (변경 없음) |
| `infrastructure/speech/` | AI Worker (변경 없음) |
| `infrastructure/knowledge/` (ChromaDB) | Main API / shared |
| `presentation/http/pet_log_routes.py` | Main API / pets, records |
| `presentation/http/speech_routes.py` | AI Worker |
| `presentation/http/community_routes.py` | Main API / community |
| `middleware/` | Main API / shared |

---

## Sprint Alignment

| Backend Sprint | 범위 | Flutter Sprint 연동 |
|---------------|------|-------------------|
| Sprint 1 | Main API scaffold + Cosmos DB bootstrap + `/health` + Auth (register/login/refresh/logout) + 펫 CRUD | Sprint 1 |
| Sprint 2 | 기록 CRUD + 기본 조회 + 입력 검증 + 소유권 확인 | Sprint 2 |
| Sprint 3 | AI Worker Queue + Whisper STT + 비동기 폴링 | Sprint 3 |
| Sprint 4 | 분석 리포트 + AI 제안 | Sprint 4 |
| Sprint 5 | Community 게시글/댓글 + 일정 API | Sprint 5 |
| Sprint 6 | 병원/쇼핑/알림 부가 서비스 | Sprint 6 |

---

## Testing Strategy

```bash
# 서비스별 단위/통합 테스트
(cd backend/app/services/main_api && uv run pytest tests/ -v)
(cd backend/app/services/ai_worker && uv run pytest tests/ -v)

# 전체 스택 헬스체크
cd backend/app
docker-compose up -d
curl http://localhost:8001/health
curl http://localhost:8002/health

# AI 비동기 플로우 E2E
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}' | jq -r .access_token)

TASK_ID=$(curl -s -X POST http://localhost:8001/api/records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: test-record-001" \
  -H "Content-Type: application/json" \
  -d '{"pet_id":"...","type":"meal","content":"사료 80g"}' | jq -r .task_id)

curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/tasks/$TASK_ID
```

---

## Reference Files

| 파일 | 용도 |
|------|------|
| `subtree/backend/src/domain/` | 도메인 엔티티 기준 |
| `subtree/backend/src/agent_runtime/` | AI Worker 이전 대상 |
| `subtree/backend/src/infrastructure/speech/` | Whisper + TTS → AI Worker |
| `subtree/backend/src/presentation/http/` | 라우트 분배 기준 |
| `subtree/backend/pyproject.toml` | 의존성 참조 |
