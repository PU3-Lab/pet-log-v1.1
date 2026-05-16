# AGENTS.md

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- Before hand-rolling core logic, first check proven packages, standard libraries, and existing project utilities.
- If a package or local utility already fits the need, use it instead of custom implementation.
- If custom implementation is still chosen, state the reason and keep the scope narrow.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Git 규칙

- 작업 시작 전에 현재 브랜치를 확인한다.
- `main` 브랜치에 checkout 되어 있을 경우 코드나 문서를 변경하기 전에 새 작업 브랜치를 생성한다.
- PR 생성 후 `main` 브랜치로 checkout하고 `git pull` 실행
- 커밋 메시지 작성
- 커밋은 사용자 승인 후 진행한다.

## md 파일 작성 규칙

- 한글로 작성

## 세션 이어받기

- 새 세션에서 이전 작업 맥락이 필요하면 루트의 `session-summary.md`를 먼저 읽고, 거기에 적힌 확인된 사실과 다음 단계를 기준으로 이어간다.
- 사용자가 세션 요약, handoff, 새 세션용 정리를 요청하면 `session-summary.md`를 전체 세션 로그처럼 이어 붙이지 말고, 현재 이어받기에 필요한 최신 상태 스냅샷으로 덮어쓴다.
- 사용자가 명시적으로 로그 누적이나 append를 요청한 경우에만 기존 요약 아래에 이어 붙인다.

## 규칙 추가 위치

- 새 규칙을 추가할 때는 사용자가 다른 위치를 명시하지 않는 한 문서의 제일 아래에 추가한다.
