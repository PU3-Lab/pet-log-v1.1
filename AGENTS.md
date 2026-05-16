# AGENTS.md

# Repository Agents Guide

Keep this file short and repo-wide. Put workflow details in repo-local skills and harness docs.

## What

- Pet Log is an AI-first pet care product. The MVP should prove analysis and action suggestions, not just manual record storage.
- Canonical product source from the repo root: `기획.md` (`frontend` 기준 `../기획.md`).
- Canonical visual references from the repo root: `pet-log-ui.png` and `펫로그_20260428/*` (`frontend` 기준 `../pet-log-ui.png`, `../펫로그_20260428/*`).
- Harness entry point: `.agents/skills/pet-log-mvp-orchestrator/SKILL.md`.
- Team contract: `docs/harness/pet-log-mvp/team-spec.md`.
- Web app path: repo root 기준 `frontend/app/web`, `frontend` 기준 `app/web`, with Next.js App Router, TypeScript, ESLint, Tailwind CSS, and Turbopack dev server.

## Why

- The product differentiator is the loop from record input to interpretation to practical care guidance.
- MVP work should protect that differentiator by prioritizing home summary, natural-language logging, timeline, analysis, AI suggestions, and pet profile.
- Community, commerce, hospital integration, IoT, map, shared care, and money management are expansion candidates unless a task explicitly changes scope.

## How

- Use `_workspace/` markdown handoffs for product, UX, AI, build, and QA artifacts.
- Prefer repo-local Pet Log skills under `.agents/skills/` before generic planning or implementation workflows.
- Web commands run from `frontend/app/web` at repo root, or `app/web` when already inside `frontend`: `npm run dev`, `npm run lint`, `npm run typecheck`, and `npm run build`.
- HTTP/API 통신은 `axios`를 사용한다. 브라우저 클라이언트, Next Route Handler의 서버 간 요청, 통신 경계 테스트 모두 `fetch`/`global.fetch`를 직접 쓰지 않고 기존 axios 경계를 사용한다.
