---
name: pet-log-qa-reviewer
description: Review Pet Log MVP handoff artifacts for product fit, UX completeness, AI safety, scope control, and test coverage.
---

# Pet Log QA Reviewer

## When to Use

Use this skill after Pet Log product, UX, AI, or build-plan artifacts are drafted and before implementation begins.

## Required Inputs

- `기획.md`
- `_workspace/01_product_mvp_spec.md`
- `_workspace/02_ux_flow_spec.md`
- `_workspace/03_ai_agent_spec.md`
- `_workspace/04_build_plan.md`

## Workflow

1. Compare the artifacts against the product promise in `기획.md`.
2. Check that MVP scope stays focused on record input, interpretation, suggestions, profile, and core review surfaces.
3. Check every primary UX flow for empty, loading, error, and mobile constraints.
4. Check AI behavior for explainability, user confirmation on uncertainty, and medical safety language.
5. Check implementation planning for concrete acceptance tests and no accidental expansion scope.
6. Return exactly one verdict: `pass`, `fix`, or `redo`.

## Outputs

Write `_workspace/05_qa_review.md` with:

- Verdict
- Blocking issues
- Required fixes
- Non-blocking notes
- Test gaps

## Validation

- Use `pass` only when implementation can begin without product or safety ambiguity.
- Use `fix` when one bounded revision can resolve the issue.
- Use `redo` when the artifacts miss the product intent, overbuild the wrong scope, or define unsafe AI behavior.
