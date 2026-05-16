# 최종 검토 리포트

- 검토일: 2026-05-15
- 대상: pet-log workspace
- 최종 점수: 62/100
- 릴리즈 판정: 보류

## 요약

현재 상태는 프론트엔드 빌드와 타입체크는 통과하지만, 프론트엔드 테스트/린트와 백엔드 테스트/정적 분석이 실패하는 상태입니다. 기능 개발 브랜치로는 계속 작업할 수 있으나, 배포 또는 머지 기준으로는 아직 게이트를 통과하지 못했습니다.

## 주요 이슈

### 1. 백엔드 테스트 실패

- 심각도: 높음
- 결과: `uv run pytest` 실패
- 요약: `224 passed, 18 failed, 2 skipped`

주요 실패는 LLM provider 계층에 집중되어 있습니다.

- `backend/src/infrastructure/llm/base_provider.py`에서 `.invoke(messages, config=...)`를 항상 호출하지만, 테스트 더블 일부가 `config` 인자를 받지 못합니다.
- `backend/src/infrastructure/llm/model_factory.py`의 자동 Gemini/Gemma fallback 추가가 기존 테스트 기대와 충돌합니다.
- `backend/src/infrastructure/knowledge/retriever.py`는 실제 `.chroma_db`를 읽어 결과를 반환하는 반면, skeleton 테스트는 빈 결과를 기대합니다.

### 2. 테스트 로그 내 secret 노출 위험

- 심각도: 높음
- 결과: 파일 스캔에서는 실제 secret로 보이는 값은 확인되지 않았지만, pytest 실패 traceback에 실제처럼 보이는 Google/Gemini API key가 노출되었습니다.

필요 조치:

- 실제 키라면 즉시 rotate
- 테스트 로그 마스킹 추가
- 로컬/CI 테스트에서 외부 API key 환경 변수 격리

### 3. 프론트엔드 단위 테스트 실패

- 심각도: 중간
- 결과: `npm run test` 실패
- 요약: `135 passed, 1 failed`

실패 테스트:

- `frontend/app/web/src/lib/sprint-02-filter-types.test.ts`
- 테스트명: `스프린트 2 엣지: 일치하지 않는 커뮤니티 필터 조합은 빈 목록을 반환한다`

원인:

- `frontend/app/web/src/lib/community.ts`에서 `인기글`을 `likes >= 10`으로 동적 판정합니다.
- 기존 테스트는 `feeds` 배열 기반의 엄격한 필터링 또는 이전 fixture 동작을 기대합니다.

판단:

- 현재 동작이 의도라면 테스트 기대값을 갱신해야 합니다.
- 의도하지 않은 변경이라면 커뮤니티 필터 로직을 수정해야 합니다.

### 4. 프론트엔드 린트 실패

- 심각도: 중간
- 결과: `npm run lint` 실패
- 요약: `3 errors, 6 warnings`

오류:

- `frontend/app/web/src/app/community/page.tsx:133` - effect 안의 동기 `setState`
- `frontend/app/web/src/app/community/page.tsx:164` - effect 안의 동기 `setState`
- `frontend/app/web/src/app/hospital/page.tsx:33` - effect 안의 동기 `setState`

경고:

- `frontend/app/web/src/app/page.tsx:119` - `useMemo` dependency 누락
- `frontend/app/web/src/app/shopping/page.tsx:154` - raw `<img>` 사용
- `frontend/app/web/src/app/suggestions/page.tsx:9` - unused `AiSuggestion`
- `frontend/app/web/src/app/suggestions/page.tsx:28` - unused `records`
- `frontend/app/web/src/components/google-hospital-map.tsx:158` - unused eslint-disable
- `frontend/app/web/src/components/pet-chat-dialog.tsx:55` - unused `records`

### 5. 백엔드 정적 분석 실패

- 심각도: 중간
- 결과: `uv run ruff check .` 실패
- 요약: `10 errors`

주요 오류:

- `backend/scripts/ingest_knowledge.py:17`
- `backend/scripts/ingest_knowledge.py:18`
- `backend/scripts/smoke_care_question.py:183`
- `backend/scripts/smoke_care_question.py:189`
- `backend/tests/test_ai_endpoints.py:6`
- `backend/tests/test_new_repositories.py:1`
- `backend/tests/test_new_repositories.py:2`
- `backend/tests/test_new_repositories.py:4`
- `backend/tests/test_new_repositories.py:7`
- `backend/tests/test_notification_policy.py:6`

일부 항목은 `ruff --fix`로 자동 정리 가능합니다.

### 6. 작업 트리 정리 필요

- 심각도: 낮음

추적 파일 변경:

- `frontend/app/web/next-env.d.ts`

이 파일은 Next.js 자동 생성 파일이며, 파일 내부에 직접 수정하지 말라는 안내가 있습니다. 커밋 전 의도 확인이 필요합니다.

미추적 파일:

- `backend/pet_log.sqlite3`
- `backend/src/middleware_tools.md`
- `pet-chat-typing-indicator.png`

## 검증 결과

| 영역 | 명령 | 결과 |
|---|---|---|
| 프론트 타입체크 | `npm run typecheck` | 통과 |
| 프론트 빌드 | `npm run build` | 통과 |
| 프론트 테스트 | `npm run test` | 실패 |
| 프론트 린트 | `npm run lint` | 실패 |
| 백엔드 정적 분석 | `uv run ruff check .` | 실패 |
| 백엔드 테스트 | `uv run pytest` | 실패 |

## 점수 산정

| 항목 | 점수 |
|---|---:|
| 빌드/타입 안정성 | 85/100 |
| 테스트 신뢰도 | 45/100 |
| 린트/정적 품질 | 55/100 |
| 보안/릴리즈 위생 | 60/100 |
| 제품 동작 준비도 | 68/100 |

최종 점수: 62/100

## 머지 전 최소 조치

1. 백엔드 pytest 실패 18건 정리
2. 프론트 테스트 실패 1건 정리
3. 프론트 lint error 3건 정리
4. 백엔드 ruff error 10건 정리
5. 테스트 로그에 노출된 API key가 실제 키인지 확인하고 필요 시 rotate
6. `next-env.d.ts` 변경과 미추적 파일들의 커밋 포함 여부 결정

