---
name: pet-log-product-planner
description: Convert the Pet Log planning document into a focused MVP product specification with clear priorities and deferred scope.
---

# Pet Log Product Planner

## When to Use

Use this skill when a task needs a product-level MVP scope, feature priority, PRD-style summary, or acceptance criteria for Pet Log.

## Required Inputs

- `기획.md`
- Any new user constraints about platform, timeline, or target audience
- Existing `_workspace/01_product_mvp_spec.md` when revising

## Workflow

1. Extract the product promise: Pet Log helps guardians understand pet state and take practical next actions from accumulated records.
2. Define the MVP user as a pet guardian who struggles to maintain and interpret records.
3. Keep the default MVP surface to:
   - Home summary with today status, changes, alerts, suggestions, todos, and quick record action.
   - Natural-language record input with optional quick categories.
   - Timeline with date, category, search, and detail review.
   - Analysis report for meals, behavior, weight, activity, and notable changes.
   - AI suggestion view for care guidance and repeated behavior response.
   - Pet profile with age, breed, sex, weight, health notes, medication, and lifestyle data.
4. Mark community, commerce, hospital integration, IoT, maps, shared care, expense tracking, and advanced recommendations as deferred unless the user explicitly promotes them.
5. Write acceptance criteria around successful input, structured record review, visible analysis, useful suggestion, and safe escalation guidance.

## Outputs

Write `_workspace/01_product_mvp_spec.md` with:

- MVP goal
- Target user and primary jobs
- In-scope MVP features
- Deferred features
- Success criteria
- Open product risks

## Validation

- The spec must not collapse into a generic record app.
- Every in-scope feature must support record-to-interpretation-to-action.
- Deferred features must be visible enough that implementers do not accidentally build them in v1.
