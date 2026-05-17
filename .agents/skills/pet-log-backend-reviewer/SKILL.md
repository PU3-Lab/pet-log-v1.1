---
name: pet-log-backend-reviewer
description: Pet Log v1.1 백엔드 설계와 구현을 리뷰할 때 사용한다. 인증, 소유권 검증, Cosmos 파티션, Queue idempotency, AI Worker 격리, 테스트 커버리지의 차단 이슈를 우선 점검한다.
---

# Pet Log Backend Reviewer

## 사용 시점

Pet Log v1.1 백엔드 설계 문서, Sprint 구현, PR 전 변경사항, 테스트 결과를 리뷰할 때 사용한다.

특히 다음 요청에서 사용한다:

- "백엔드 리뷰"
- "설계 리뷰"
- "Sprint 구현 검토"
- Auth, Cosmos, Queue, AI Worker 관련 코드 리뷰

## 필수 입력

- `docs/superpowers/specs/2026-05-17-backend-distributed-design.md`
- 변경된 파일 diff
- 관련 테스트 결과
- 필요한 경우 참조 전용 v1.0 코드

## 리뷰 관점

리뷰는 문제점 중심으로 한다. 칭찬이나 요약보다 차단 이슈를 먼저 낸다.

우선순위:

1. 보안 결함
2. 데이터 소유권/테넌트 격리 결함
3. 재시도, idempotency, Queue 중복 처리 결함
4. Cosmos 파티션 키와 조회 방식 불일치
5. AI Worker의 DB 직접 접근 또는 내부 콜백 인증 누락
6. 테스트 누락
7. Sprint 범위 초과

## 차단 체크리스트

- Main API만 Cosmos SDK를 직접 의존하는가?
- AI Worker가 Cosmos DB에 직접 접근하지 않는가?
- 내부 엔드포인트가 `X-Internal-Secret`을 검증하는가?
- `POST /api/records`가 `Idempotency-Key`로 중복 생성을 막는가?
- task polling이 `user_id`로 본인 task만 반환하는가?
- AI 결과 콜백에서 payload `user_id`와 task 소유자를 대조하는가?
- refresh token 원문을 저장하지 않는가?
- refresh token rotation과 replay 감지가 실제 저장 구조로 가능한가?
- 펫 CRUD가 모든 조회/수정/삭제에서 `user_id` 소유권을 강제하는가?
- Cosmos Repository 외부에서 SDK 호출이 새어 나오지 않는가?
- Queue payload가 64KB 초과 시 공개 URL 대신 `blob_key`와 권한 모델을 쓰는가?
- `pending`, `processing`, `completed`, `failed`, `expired` 상태 전이가 문서와 맞는가?
- Sprint 범위 밖 기능을 구현하거나 추상화하지 않았는가?

## 테스트 체크리스트

Auth:

- register 성공/중복 이메일
- login 성공/실패
- refresh rotation 성공
- refresh replay 또는 revoked session 실패
- logout 후 refresh 실패

Pets:

- 생성, 목록, 상세, 수정, 삭제
- 다른 사용자의 pet 접근 실패
- 삭제 후 조회 실패

Records/tasks:

- `Idempotency-Key` 재사용 시 중복 record 미생성
- task 조회 소유권 검증
- AI 콜백 중복 completed 처리
- AI 콜백 user_id 불일치 거부

Health/stack:

- Main API `/health`
- AI Worker `/health`
- docker-compose 서비스 기동 가능 여부

## 결과 형식

다음 형식을 사용한다:

```text
Verdict: pass | fix | redo

Findings
- [Severity] file:line - 문제와 영향

Required Fixes
- 반드시 고쳐야 할 항목

Test Gaps
- 누락된 검증

Notes
- 차단은 아니지만 다음 Sprint 전에 볼 항목
```

## 판정 기준

- `pass`: 구현 또는 설계를 진행해도 되는 상태
- `fix`: 작은 수정으로 해결 가능한 결함이 있음
- `redo`: 설계 방향, 보안 경계, 데이터 모델이 크게 어긋남

`pass`는 차단 보안/소유권/idempotency 결함이 없고, 핵심 테스트가 존재할 때만 사용한다.
