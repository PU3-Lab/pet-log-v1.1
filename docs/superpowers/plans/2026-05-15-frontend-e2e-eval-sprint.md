# 2026-05-15 프런트엔드 E2E/Eval 스프린트

## 목표

Pet Log 프런트엔드에 반복 실행 가능한 Playwright 기반 E2E와 eval 게이트를 추가한다. 로컬 개발 서버는 기본적으로 `frontend/app/web/.env.dev`를 읽고, 테스트는 주요 라우트 렌더링, 기록 저장 플로우, 모바일 UI 회귀를 검증한다.

## 사용한 스킬

- `e2e-testing`: `/Users/kimkyungpyo/.codex/skills/e2e-testing/SKILL.md`
- `eval-harness`: `/Users/kimkyungpyo/.codex/skills/eval-harness/SKILL.md`

두 스킬은 프로젝트 내부 `superpowers` 디렉터리의 파일이 아니라 Codex/ECC 전역 스킬이다. 이 문서는 프로젝트 산출물로 `docs/superpowers/plans/`에 보관한다.

## 구현 범위

- `npm run dev`가 `scripts/run-dev.mjs`를 통해 `.env.dev`를 기본 로드하도록 변경했다.
- `PET_LOG_ENV_FILE`로 다른 env 파일을 지정할 수 있게 했다.
- `frontend/app/web/playwright.config.ts`를 추가해 Playwright가 `localhost:3100`에서 격리된 Next dev 서버를 띄우도록 했다.
- E2E smoke 테스트로 홈, 기록, 타임라인, 분석, 프로필, 일정, 알림 라우트를 검증한다.
- 기록 저장 E2E는 `/record`에서 한국어 기록을 입력하고 저장한 뒤 `/timeline`에서 같은 기록을 확인한다.
- eval은 모바일 폭 375px, 430px에서 핵심 라우트의 수평 overflow와 client error를 검사한다.
- 선택형 `eval:visual`은 모바일 스크린샷 산출물을 생성해 수동 검토에 쓸 수 있게 했다.
- Playwright 리포트와 테스트 산출물은 `.gitignore`에 추가했다.

## 추가된 명령

```bash
cd frontend/app/web
npm run test:e2e
npm run eval
npm run eval:ui
npm run eval:flow
npm run eval:visual
```

`npm run eval`은 `eval:ui`와 `eval:flow`를 순서대로 실행한다. `eval:visual`은 pass/fail 게이트가 아니라 수동 시각 검토용 스크린샷 생성 명령이다.

## Eval 정의

### Capability Eval

- 주요 화면이 실제 사용자에게 보이는 문구와 함께 렌더링된다.
- 보호자가 한국어 케어 기록을 텍스트로 입력하고 저장할 수 있다.
- 저장된 기록이 타임라인에 표시된다.
- 모바일 주요 폭에서 핵심 화면에 수평 overflow가 없다.

### Regression Eval

- uncaught page error가 발생하면 실패한다.
- 예상하지 않은 console error가 발생하면 실패한다.
- Playwright mock API가 백엔드 의존 없이 결정적인 응답을 제공한다.
- `.env.dev` 기반 dev 실행 경로와 Playwright webServer 실행 경로가 같은 `npm run dev`를 사용한다.

## 검증 결과

| 명령 | 결과 | 메모 |
| --- | --- | --- |
| `npm run typecheck` | PASS | TypeScript 오류 없음 |
| `npm run build` | PASS | Next.js production build 통과 |
| `npm run test:e2e` | PASS | 8개 E2E 통과 |
| `npm run eval` | PASS | 14개 모바일 UI eval + 1개 flow eval 통과 |
| `npm run eval:visual` | PASS | 4개 모바일 스크린샷 생성 테스트 통과 |
| `npm run test` | FAIL | 기존 `src/lib/sprint-02-filter-types.test.ts`의 커뮤니티 필터 기대값 실패 |

`npm run test` 실패는 이번 E2E/Eval 변경 범위와 직접 관련 없는 기존 단위 테스트 실패다. 실패 케이스는 “일치하지 않는 커뮤니티 필터 조합은 빈 목록을 반환한다”이며, 실제 결과에 `c5` 게시글이 포함된다.

## 운영 메모

- Playwright 기본 서버는 `localhost:3100`을 사용한다. 외부 서버를 직접 검증하려면 `PLAYWRIGHT_BASE_URL`을 지정한다.
- 기존 dev 서버를 재사용하려면 `PLAYWRIGHT_REUSE_EXISTING_SERVER=1`을 명시한다.
- 테스트 API mock은 `tests/support/mock-api.ts`에 있으며 E2E와 eval 모두 같은 fixture를 공유한다.
- Playwright HTML 리포트와 스크린샷은 `playwright-report/`, `test-results/` 아래에 생성되며 git에 포함하지 않는다.
