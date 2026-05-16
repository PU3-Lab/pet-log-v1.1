# Pet Log MVP Harness Team Spec

## Summary

This harness turns the Pet Log planning materials into an implementation-ready MVP workflow. It uses a Pipeline pattern with a Producer-Reviewer gate: product scope, UX flow, AI behavior, build plan, then QA review.

## Roles

- `pet-log-mvp-orchestrator`: owns phase order, handoff integrity, and final readiness.
- `pet-log-product-planner`: converts the repo root `기획.md` (`frontend` 기준 `../기획.md`) into MVP scope and acceptance criteria.
- `pet-log-ux-designer`: defines the usable mobile-first app experience and screen states.
- `pet-log-ai-agent-designer`: defines structured input, analysis, suggestions, and safety boundaries.
- `pet-log-qa-reviewer`: reviews the combined artifacts before implementation.

## Handoffs

- Product Planner writes `_workspace/01_product_mvp_spec.md`.
- UX Designer reads the product spec and writes `_workspace/02_ux_flow_spec.md`.
- AI Agent Designer reads product and UX specs and writes `_workspace/03_ai_agent_spec.md`.
- Orchestrator writes `_workspace/04_build_plan.md` from all prior artifacts and the repo state.
- QA Reviewer reads all prior artifacts and writes `_workspace/05_qa_review.md`.

## Default MVP Scope

- Home summary
- Natural-language record input
- Record timeline
- Analysis report
- AI suggestions
- Pet profile

The following are deferred unless explicitly promoted by the user: community, commerce, hospital integration, IoT, maps, shared care, expense tracking, and advanced recommendation marketplaces.

## Failure Policy

- Missing source artifacts: stop and report the missing file path.
- Product ambiguity: record the assumption in `_workspace/01_product_mvp_spec.md` before downstream work.
- UX or AI mismatch: QA returns `fix`, then the orchestrator revises the smallest affected artifact once.
- Unsafe AI behavior, wrong MVP scope, or missing build acceptance criteria: QA returns `redo`, and implementation should not begin.

## Validation Checklist

- All generated skill files have YAML frontmatter with `name` and `description`.
- Every handoff file cites the source artifacts it used.
- The MVP keeps interpretation and suggestions ahead of raw record storage.
- AI behavior is explainable and avoids definitive medical diagnosis.
- Implementation plans include focused tests for record input, timeline review, analysis display, suggestions, and profile data.
