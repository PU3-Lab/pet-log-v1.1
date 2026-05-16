---
name: pet-log-mvp-orchestrator
description: Orchestrate the Pet Log MVP workflow from product scope through UX, AI behavior, build planning, and QA review.
---

# Pet Log MVP Orchestrator

## When to Use

Use this skill when a request asks to turn the Pet Log planning materials into an MVP spec, implementation plan, or coordinated build workflow.

Do not use it for isolated copy edits to `기획.md` or one-off visual tweaks that do not need the MVP handoff chain.

## Required Inputs

- Product source: `기획.md`
- Visual references: `pet-log-ui.png` and `펫로그_20260428/*`
- User request or implementation target
- Current repository state

## Workflow

1. Read the product source and visual references list before deciding scope.
2. Run the Product Planner to produce `_workspace/01_product_mvp_spec.md`.
3. Run the UX Designer to produce `_workspace/02_ux_flow_spec.md`.
4. Run the AI Agent Designer to produce `_workspace/03_ai_agent_spec.md`.
5. Produce `_workspace/04_build_plan.md` from the prior artifacts and the actual repo state.
6. Run the QA Reviewer to produce `_workspace/05_qa_review.md`.
7. If QA returns `fix`, revise the smallest affected upstream artifact once and update the build plan.
8. If QA returns `redo`, stop and summarize the blocking mismatch before implementation.

## Outputs

- `_workspace/01_product_mvp_spec.md`
- `_workspace/02_ux_flow_spec.md`
- `_workspace/03_ai_agent_spec.md`
- `_workspace/04_build_plan.md`
- `_workspace/05_qa_review.md`

## Validation

- Every handoff must cite the source artifact it depends on.
- The build plan must separate MVP work from deferred expansion work.
- QA must explicitly check product fit, UX completeness, AI safety, and test coverage.
- Do not proceed to implementation when the latest QA verdict is `redo`.
