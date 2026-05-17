# 세션 요약

새 Codex/Claude 세션에서 이 저장소의 이전 작업 맥락을 이어받을 때 먼저 참고한다.

---

## 2026-05-17 세션

### 완료된 작업

#### 1. Backend 분산 아키텍처 설계 완료 (2-service로 확정)

초기 4-service 설계를 검토 후 **2-service**로 간소화.

| 서비스 | 포트 | 담당 |
|--------|------|------|
| Main API | 8001 | auth·펫·기록·일정·분석·알림·커뮤니티·AI작업관리 |
| AI Worker | 8002 | LangGraph·Whisper·TTS (Queue 기반, task_type 분기) |

**4-service → 2-service 이유**: Auth/Core/Community를 별도 서비스로 분리하면 MVP 단계에서 운영 복잡도만 증가. 동일 Main API 내 모듈로 구성, 필요 시 분리.

**핵심 결정:**
- **DB**: Azure Cosmos DB (NoSQL) — Repository Pattern으로만 접근 (서비스 코드에서 Cosmos SDK 직접 호출 금지)
- **Gateway**: Azure API Management (JWT 검증, `X-User-Id`/`X-User-Role` 헤더 주입)
- **AI 비동기**: `POST /api/records` → `{task_id}` 즉시 반환 → `GET /api/tasks/{task_id}` 폴링
- **AI Worker 데이터**: Queue 메시지에 `task_type` + `payload` 포함 (AI Worker → DB 직접 접근 없음)
- **내부 콜백 보안**: AI Worker → Main API 콜백 시 `X-Internal-Secret` 헤더 검증
- **Community 사용자**: `user_snapshot` 비정규화 (Auth 실시간 호출 없음)
- **Community AI**: 커뮤니티도 Queue로 AI 처리 가능 (`task_type: content_moderation | feed_ranking`)
- **로컬 개발**: docker-compose (4컨테이너: cosmos-emulator, azurite, main_api, ai_worker)

#### 2. 설계 문서 작성 및 업데이트

- **위치**: `docs/superpowers/specs/2026-05-17-backend-distributed-design.md`

---

### 다음 세션 할 일

**Backend Sprint 1** 구현:
1. `backend/app/services/{main_api,ai_worker}/` 디렉토리 구조 생성
2. 각 서비스 `pyproject.toml`, `Dockerfile`, `main.py`, `GET /health`
3. `docker-compose.yml`: 2서비스 + Cosmos DB Emulator + Azurite + `.env.example`
4. Main API: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
5. Main API: 펫 CRUD (`GET/POST /api/pets`, `GET/PUT/DELETE /api/pets/{id}`)
6. 서비스별 pytest 기본 테스트

---

### 참조 파일

| 파일 | 용도 |
|------|------|
| `docs/superpowers/specs/2026-05-17-backend-distributed-design.md` | 승인된 설계 문서 |
| `subtree/backend/src/domain/` | v1.0 도메인 엔티티 기준 |
| `subtree/backend/src/agent_runtime/` | AI Worker 이전 대상 |
| `subtree/backend/src/infrastructure/speech/` | Whisper + TTS → AI Worker |
| `subtree/backend/src/presentation/http/` | 라우트 분배 기준 |
| `subtree/backend/pyproject.toml` | 의존성 참조 |

---

### 작업 규칙 (이 세션에서 확인됨)

- 설계 완료 후 코드 작성 전 반드시 설계 문서(`docs/superpowers/specs/`) 먼저 작성
- 코드 작성 전 사용자 승인 필요
- main 브랜치에서 작업 시 항상 새 브랜치 생성
