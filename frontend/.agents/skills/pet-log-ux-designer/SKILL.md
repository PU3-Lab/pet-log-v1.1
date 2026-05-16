---
name: pet-log-ux-designer
description: Design the Pet Log MVP app flow, mobile-first screens, states, and UX acceptance criteria from product and visual references.
---

# Pet Log UX Designer

## When to Use

Use this skill when Pet Log work needs screen flows, navigation, interaction states, or frontend implementation guidance.

## Required Inputs

- `_workspace/01_product_mvp_spec.md`
- `pet-log-ui.png`
- `펫로그_20260428/*`
- Current implementation stack, if one exists

## Workflow

1. Treat the first screen as the usable app home, not a marketing landing page.
2. Use `pet-log-ui.png` and the reference screenshots to understand density, layout, and mobile constraints.
3. Define bottom-level navigation or primary routes for Home, Record, Timeline, Analysis, Suggestions, and Profile.
4. Specify each screen's required content, primary action, empty state, loading state, and error state.
5. Ensure the Home screen makes AI agency visible through proactive questions, recent changes, and actionable suggestion cards.
6. Keep controls familiar: icon buttons for tools, toggles for binary settings, tabs for views, filters for category/date, and compact cards for repeated records or suggestions.

## Outputs

Write `_workspace/02_ux_flow_spec.md` with:

- Navigation model
- Screen-by-screen UX contract
- Key user flows
- Empty, loading, and error states
- Responsive expectations
- UX acceptance criteria

## Validation

- The UX must make interpretation and suggestions more prominent than raw logging.
- Text must fit in mobile-first layouts without overlapping controls.
- No screen should require the user to read explanatory marketing copy before using the app.
