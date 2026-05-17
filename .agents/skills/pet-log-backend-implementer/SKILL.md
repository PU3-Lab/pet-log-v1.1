---
name: pet-log-backend-implementer
description: Pet Log v1.1 백엔드 Sprint 구현을 수행할 때 사용한다. FastAPI Main API, AI Worker, Cosmos Repository, Azure Queue, 인증, 펫/기록 API, 테스트를 설계 문서 기준으로 좁게 구현한다.
---

# Pet Log Backend Implementer

## 사용 시점

Pet Log v1.1 백엔드 구현, 버그 수정, 테스트 추가, 서비스 스캐폴딩 작업에 사용한다.

특히 다음 요청에서 사용한다:

- Backend Sprint 구현
- `backend/app/services/main_api` 또는 `backend/app/services/ai_worker` 작업
- Auth, pets, records, tasks, queue, Cosmos Repository 구현
- 백엔드 테스트 작성 또는 실패 수정

## 필수 입력

- `docs/superpowers/specs/2026-05-17-backend-distributed-design.md`
- 현재 git 브랜치와 working tree 상태
- 필요한 경우 참조 전용 v1.0 코드:
  - `subtree/backend/src/domain/`
  - `subtree/backend/src/presentation/http/`
  - `subtree/backend/src/infrastructure/`
  - `subtree/backend/pyproject.toml`

## 구현 원칙

1. `main` 브랜치에서는 코드나 문서 수정 전 새 작업 브랜치를 만든다.
2. 신규 v1.1 백엔드는 저장소 루트의 `backend/app/` 아래에 만든다.
3. `subtree/backend/`는 참조 전용이다. 명시 요청 없이는 수정하지 않는다.
4. 설계 문서와 충돌하면 구현을 멈추고 충돌을 먼저 보고한다.
5. Sprint 범위 밖 기능은 스텁이나 TODO로 확장하지 않는다.
6. 기존 패키지, 표준 라이브러리, 로컬 패턴을 먼저 확인하고 직접 구현은 좁게 유지한다.

## 아키텍처 기준

- Main API: 인증, 펫, 기록, 일정, 알림, 커뮤니티, AI task 관리
- AI Worker: Queue 소비, LangGraph, Whisper, TTS, Main API 내부 콜백
- Cosmos DB 접근은 Main API Repository 구현체 안에서만 허용한다.
- AI Worker는 Cosmos SDK 의존성을 갖지 않는다.
- AI Worker 상태/결과 전달은 Main API 내부 엔드포인트와 `X-Internal-Secret`으로 처리한다.

## 보안 기준

- Auth 비밀번호는 argon2id로 해싱한다.
- refresh token은 원문 저장 금지. `jti_hash` 기반 session rotation을 사용한다.
- 로컬 개발에서는 Main API가 JWT를 직접 검증한다.
- 프로덕션에서는 APIM이 `X-User-Id`, `X-User-Role`을 주입한다고 가정하되, Gateway 우회 방지 전제도 문서화한다.
- 사용자 소유 리소스는 항상 `user_id` 기준으로 조회/수정/삭제한다.
- 내부 엔드포인트는 `X-Internal-Secret` 실패 시 세부 사유 없이 `401`을 반환한다.

## 데이터/비동기 기준

- `POST /api/records`는 `Idempotency-Key`를 받아 같은 `user_id + key` 요청의 중복 record 생성을 막는다.
- Queue 메시지는 `schema_version`, `task_id`, `idempotency_key`, `task_type`, `user_id`, `payload`를 포함한다.
- 64KB 초과 payload는 공개 URL이 아니라 `blob_key`로 참조한다.
- task 상태는 `pending`, `processing`, `completed`, `failed`, `expired`를 사용한다.
- task polling 응답은 `pending`과 `processing`을 구분한다.

## 작업 절차

1. 브랜치, status, 관련 파일을 먼저 확인한다.
2. 설계 문서에서 이번 Sprint 범위를 확인한다.
3. 실패를 재현할 수 있으면 먼저 테스트를 작성한다.
4. 가장 작은 구현 단위로 수정한다.
5. 서비스별 테스트를 실행한다.
6. 변경 파일, 검증 명령, 남은 리스크를 보고한다.

## Sprint 1 기준

Sprint 1은 다음까지만 구현한다:

- `backend/app/services/main_api/`
- `backend/app/services/ai_worker/`
- 각 서비스 `pyproject.toml`, `Dockerfile`, `main.py`, `GET /health`
- `backend/app/docker-compose.yml`
- `.env.example`
- Main API Auth: register, login, refresh, logout
- Main API pets CRUD
- 서비스별 pytest 기본 테스트

## 검증

가능한 최소 검증부터 실행한다:

```bash
(cd backend/app/services/main_api && uv run pytest tests/ -v)
(cd backend/app/services/ai_worker && uv run pytest tests/ -v)
```

스택 검증이 필요한 경우:

```bash
cd backend/app
docker-compose up -d
curl http://localhost:8001/health
curl http://localhost:8002/health
```

## 완료 보고

보고에는 반드시 포함한다:

- 변경한 파일
- 실행한 검증 명령과 결과
- 커밋 여부
- 구현하지 않은 범위 또는 남은 리스크
