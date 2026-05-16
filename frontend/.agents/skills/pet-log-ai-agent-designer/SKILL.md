---
name: pet-log-ai-agent-designer
description: Define safe Pet Log AI Agent behavior for record structuring, change detection, missing-record detection, and care suggestions.
---

# Pet Log AI Agent Designer

## When to Use

Use this skill when a task involves Pet Log AI behavior, data structuring, suggestion logic, alerts, or AI safety constraints.

## Required Inputs

- `_workspace/01_product_mvp_spec.md`
- `_workspace/02_ux_flow_spec.md`, when available
- `기획.md`
- Any available implementation data model

## Workflow

1. Define the minimum structured record fields needed for MVP: pet, timestamp, category, source text, normalized summary, extracted measurements, confidence, and attachments if present.
2. Define MVP categories around meals, stool/urine, behavior, activity, weight, medication, vaccination, hospital, and general notes.
3. Specify how natural-language input becomes structured records, including low-confidence cases that require user confirmation.
4. Define simple, transparent analysis behaviors:
   - Detect changes from recent baseline.
   - Detect repeated abnormal records.
   - Detect missing expected records.
   - Summarize weekly or monthly patterns.
5. Define suggestion behavior as practical guidance, not diagnosis. Use escalation language for persistent or severe symptoms.
6. Include safety rules for medical uncertainty, emergency symptoms, and unsupported image interpretation.

## Outputs

Write `_workspace/03_ai_agent_spec.md` with:

- AI responsibilities and non-goals
- Structured record contract
- Analysis and alert rules
- Suggestion policy
- Safety and escalation rules
- AI test scenarios

## Validation

- Suggestions must avoid definitive diagnosis.
- Low-confidence extraction must trigger confirmation or preserve the original user text.
- Alerts must be explainable from visible records or profile data.
- The AI spec must be implementable before adding external IoT, hospital, or commerce integrations.
